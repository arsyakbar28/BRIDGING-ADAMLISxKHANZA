# 📋 Proses POST Lab Results - Penjelasan Lengkap

## 🎯 Overview

Proses POST lab results adalah proses untuk menyimpan hasil pemeriksaan laboratorium ke database. Proses ini menggunakan **3-layer architecture** (Controller → Service → Repository) dengan **transaction management** untuk memastikan data integrity.

---

## 🔄 Flow Diagram

```
HTTP Request
    ↓
[Middleware: Authentication] → Validasi JWT Token
    ↓
[Controller Layer] → Validasi Basic & Format Request
    ↓
[Service Layer] → Validasi Comprehensive & Business Logic
    ↓
[Repository Layer] → Database Operations
    ↓
Transaction Commit/Rollback
    ↓
HTTP Response
```

---

## 📝 Step-by-Step Process

### **1. Request Masuk (HTTP POST)**

**Endpoint:** `POST /adam-lis/bridging/`

**Request Body:**
```json
{
  "noorder": "PK202511010004",
  "dokter_pj": "D029",
  "petugas": "LAB007",
  "dokter_perujuk": "D018",
  "tgl_periksa": "2025-11-01",
  "jam_periksa": "16:00:38",
  "pemeriksaan": [...],
  "kesan": "...",
  "saran": "..."
}
```

---

### **2. Authentication Middleware** 🔐

**File:** `middleware/auth.middleware.js`

- Validasi JWT token dari header `Authorization: Bearer <token>`
- Jika token tidak valid → return 401 Unauthorized
- Jika valid → attach user info ke `req.user` dan lanjut ke controller

---

### **3. Controller Layer** 🎮

**File:** `api/bridging/pk/controllers/post-lab-pk.controller.js`

#### **3.1 Basic Validation**
- ✅ Cek field required: `noorder`, `pemeriksaan`, `dokter_pj`, `petugas`, `dokter_perujuk`, `tgl_periksa`, `jam_periksa`
- ✅ Cek `pemeriksaan` adalah array dan tidak kosong
- ✅ Cek setiap item pemeriksaan punya `kode_pemeriksaan` dan `hasil`

**Jika validation gagal:**
- Log error ke file log
- Return 400 Bad Request dengan pesan error

#### **3.2 Call Service**
Jika validation berhasil, controller memanggil:
```javascript
const result = await postLabService.postLabResults(noorder, labData);
```

---

### **4. Service Layer** ⚙️

**File:** `api/bridging/pk/services/post-lab-pk.service.js`

#### **4.1 Comprehensive Validation** ✅

**File:** `api/bridging/pk/validators/lab-results-pk.validator.js`

- ✅ Validasi format tanggal: `YYYY-MM-DD`
- ✅ Validasi format waktu: `HH:mm:ss`
- ✅ Validasi semua field required
- ✅ Validasi setiap item pemeriksaan

**Jika validation gagal:**
- Log error
- Return error response (TIDAK buka database connection)

#### **4.2 Database Connection & Transaction** 🔌

```javascript
const conn = await getDbConnection(); // Get connection from pool
await conn.beginTransaction(); // Start transaction
```

**Mengapa Transaction?**
- Memastikan semua data tersimpan atau tidak sama sekali (atomicity)
- Jika ada error di tengah proses, semua perubahan di-rollback

#### **4.3 Validasi Noorder** 🔍

**Query:**
```sql
SELECT no_rawat FROM permintaan_lab WHERE noorder = ?
```

- Cek apakah `noorder` ada di database
- Ambil `no_rawat` untuk digunakan di proses selanjutnya

**Jika tidak ditemukan:**
- Rollback transaction
- Log error
- Return 404 Not Found

#### **4.4 Bulk Get Template Data** 📋

**Query:**
```sql
SELECT id_template, kd_jenis_prw, Pemeriksaan, satuan, urut
FROM template_laboratorium
WHERE id_template IN (?, ?, ?, ...)
```

- Ambil data template untuk semua `kode_pemeriksaan` yang dikirim
- Buat map: `templateMap[kode_pemeriksaan] = templateData`

**Validasi:**
- ✅ Semua `kode_pemeriksaan` harus ada di database
- Jika ada yang tidak ditemukan → rollback & return error

#### **4.5 Grouping Pemeriksaan by Tindakan** 📊

**Logic:**
```javascript
// Group pemeriksaan berdasarkan kd_jenis_prw dari template
tindakanMap = {
  "T001": {
    kode_tindakan: "T001",
    pemeriksaan: [...]
  },
  "T002": {
    kode_tindakan: "T002",
    pemeriksaan: [...]
  }
}
```

**Mengapa di-group?**
- Satu tindakan bisa punya banyak pemeriksaan
- Setiap tindakan akan jadi 1 record di `periksa_lab`
- Setiap pemeriksaan akan jadi 1 record di `detail_periksa_lab`

#### **4.6 Bulk Get Tarif Data** 💰

**Query:**
```sql
SELECT kd_jenis_prw, nm_perawatan, total_byr, bagian_rs, bhp,
       tarif_perujuk, tarif_tindakan_dokter, tarif_tindakan_petugas,
       kso, menejemen, kategori, status
FROM jns_perawatan_lab
WHERE kd_jenis_prw IN (?, ?, ?, ...)
```

- Ambil data tarif untuk semua tindakan
- Data ini untuk menghitung biaya dan breakdown pembagian

**Validasi:**
- ✅ Semua `kode_tindakan` harus punya tarif
- Jika tidak ditemukan → rollback & return error

#### **4.7 Validasi Kode Dokter & Petugas** 👨‍⚕️

**Queries:**
```sql
-- Validasi dokter_pj
SELECT kd_dokter FROM dokter WHERE kd_dokter = ?

-- Validasi dokter_perujuk
SELECT kd_dokter FROM dokter WHERE kd_dokter = ?

-- Validasi petugas
SELECT nip FROM petugas WHERE nip = ?
```

**Jika tidak valid:**
- Rollback transaction
- Log error
- Return error dengan pesan yang jelas

#### **4.8 Delete Old Data** 🗑️

**Queries:**
```sql
-- Delete detail_periksa_lab
DELETE FROM detail_periksa_lab 
WHERE no_rawat = ? AND tgl_periksa = ? AND jam = ?

-- Delete periksa_lab
DELETE FROM periksa_lab 
WHERE no_rawat = ? AND tgl_periksa = ? AND jam = ?

-- Delete saran_kesan_lab
DELETE FROM saran_kesan_lab 
WHERE no_rawat = ? AND tgl_periksa = ? AND jam = ?
```

**Mengapa delete?**
- Jika POST ulang untuk noorder yang sama, data lama dihapus dulu
- Menggunakan kombinasi `no_rawat + tgl_periksa + jam` untuk spesifik
- Mencegah duplikasi data

#### **4.9 Insert Data ke Database** 💾

**Loop untuk setiap tindakan:**

**a) Insert ke `periksa_lab`**
```sql
INSERT INTO periksa_lab 
(no_rawat, nip, kd_jenis_prw, tgl_periksa, jam, dokter_perujuk, 
 bagian_rs, bhp, tarif_perujuk, tarif_tindakan_dokter, 
 tarif_tindakan_petugas, kso, menejemen, biaya, kd_dokter, status, kategori)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

**b) Insert ke `detail_periksa_lab` (untuk setiap pemeriksaan)**
```sql
INSERT INTO detail_periksa_lab 
(no_rawat, kd_jenis_prw, tgl_periksa, jam, id_template, nilai, 
 nilai_rujukan, keterangan, bagian_rs, bhp, bagian_perujuk, 
 bagian_dokter, bagian_laborat, kso, menejemen, biaya_item)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

**c) Update `permintaan_lab`**
```sql
UPDATE permintaan_lab 
SET tgl_hasil = ?, jam_hasil = ?
WHERE noorder = ?
```

**d) Insert `saran_kesan_lab` (jika ada)**
```sql
INSERT INTO saran_kesan_lab 
(no_rawat, tgl_periksa, jam, kesan, saran)
VALUES (?, ?, ?, ?, ?)
```

#### **4.10 Commit Transaction** ✅

```javascript
await conn.commit();
```

- Jika semua insert berhasil → commit semua perubahan
- Data sekarang permanen di database

**Jika ada error:**
```javascript
await conn.rollback(); // Batalkan semua perubahan
```

---

### **5. Response** 📤

#### **Success Response (200 OK)**
```json
{
  "success": true,
  "message": "Lab results posted successfully for noorder: PK202511010004",
  "summary": {
    "noorder": "PK202511010004",
    "no_rawat": "2025/11/01/0001",
    "total_tindakan": 2,
    "total_pemeriksaan": 5,
    "tgl_periksa": "2025-11-01",
    "jam_periksa": "16:00:38"
  },
  "biaya_periksa": {
    "total": 500000,
    "mata_uang": "IDR",
    "formatted": "Rp 500.000",
    "breakdown": [...]
  },
  "payload": [
    {
      "no_urut": 1,
      "kode_jenis_perawatan": "T001",
      "nama_perawatan": "Hematologi Lengkap",
      "detail_pemeriksaan": [...]
    }
  ]
}
```

#### **Error Response (400/404/500)**
```json
{
  "success": false,
  "message": "Error message",
  "errors": [...], // Jika validation error
  "payload": []
}
```

---

## 🗄️ Database Tables yang Terlibat

### **1. `permintaan_lab`** (READ & UPDATE)
- **Read:** Ambil `no_rawat` berdasarkan `noorder`
- **Update:** Update `tgl_hasil` dan `jam_hasil`

### **2. `template_laboratorium`** (READ)
- **Read:** Ambil data template berdasarkan `id_template`
- Digunakan untuk: validasi, ambil `kd_jenis_prw`, `nama_pemeriksaan`, `satuan`

### **3. `jns_perawatan_lab`** (READ)
- **Read:** Ambil data tarif berdasarkan `kd_jenis_prw`
- Digunakan untuk: menghitung biaya, breakdown pembagian

### **4. `dokter`** (READ - Validasi)
- **Read:** Validasi kode dokter ada atau tidak

### **5. `petugas`** (READ - Validasi)
- **Read:** Validasi NIP petugas ada atau tidak

### **6. `periksa_lab`** (DELETE & INSERT)
- **Delete:** Hapus data lama (jika ada)
- **Insert:** Insert data pemeriksaan per tindakan

### **7. `detail_periksa_lab`** (DELETE & INSERT)
- **Delete:** Hapus data lama (jika ada)
- **Insert:** Insert detail setiap pemeriksaan

### **8. `saran_kesan_lab`** (DELETE & INSERT)
- **Delete:** Hapus data lama (jika ada)
- **Insert:** Insert saran dan kesan (jika ada)

---

## 🔒 Error Handling & Logging

### **Error Handling Strategy**

1. **Validation Error** (sebelum buka DB connection)
   - Return error langsung
   - Log ke file

2. **Database Error** (setelah buka connection)
   - Rollback transaction
   - Parse error ke pesan user-friendly
   - Log technical error (server-side only)
   - Return error response

3. **Transaction Safety**
   - Semua operasi dalam transaction
   - Jika error → rollback semua perubahan
   - Jika success → commit semua perubahan

### **Logging**

**File:** `utils/logger.js`

- **Success:** Log ke `logs/app-{date}.log`
- **Error:** Log ke `logs/error-{date}.log` dan `logs/exceptions-{date}.log`

**Log Information:**
- Timestamp
- Noorder
- Endpoint
- Request body
- Error details (jika error)
- Summary (jika success)

---

## ⚡ Performance Optimizations

### **1. Bulk Operations**
- ✅ Bulk get template data (1 query untuk semua template)
- ✅ Bulk get tarif data (1 query untuk semua tarif)
- Mengurangi jumlah query ke database

### **2. Connection Pooling**
- ✅ Menggunakan connection pool (max 10 connections)
- ✅ Reuse connections, tidak create baru setiap request

### **3. Transaction Management**
- ✅ Semua operasi dalam 1 transaction
- ✅ Commit/rollback sekali, tidak per-operasi

### **4. Fail-Fast Validation**
- ✅ Validasi sebelum buka database connection
- ✅ Jika validation gagal, tidak perlu buka connection

---

## 📊 Data Flow Summary

```
Request JSON
    ↓
[Validation] → Format, Required Fields
    ↓
[DB Connection] → Get from Pool
    ↓
[Transaction Start]
    ↓
[Validate Noorder] → Get no_rawat
    ↓
[Bulk Get Templates] → Validate kode_pemeriksaan
    ↓
[Group by Tindakan] → Auto-generate kode_tindakan
    ↓
[Bulk Get Tarif] → Validate & Calculate Biaya
    ↓
[Validate Dokter/Petugas] → Ensure exists
    ↓
[Delete Old Data] → Prevent Duplication
    ↓
[Insert periksa_lab] → 1 record per tindakan
    ↓
[Insert detail_periksa_lab] → 1 record per pemeriksaan
    ↓
[Update permintaan_lab] → Set tgl_hasil, jam_hasil
    ↓
[Insert saran_kesan_lab] → If provided
    ↓
[Commit Transaction] → Save All Changes
    ↓
[Close Connection] → Return to Pool
    ↓
Response JSON
```

---

## 🎯 Key Points

1. **Transaction Safety:** Semua operasi dalam transaction, jika error semua di-rollback
2. **Validation First:** Validasi sebelum buka database connection (fail-fast)
3. **Bulk Operations:** Menggunakan bulk query untuk performa lebih baik
4. **Error Handling:** Comprehensive error handling dengan logging
5. **Data Integrity:** Delete old data sebelum insert baru (prevent duplication)
6. **Auto Grouping:** Pemeriksaan otomatis di-group berdasarkan tindakan
7. **Comprehensive Response:** Response berisi summary, biaya breakdown, dan detail

---

## 🔍 Troubleshooting

### **Error: "No lab request found for noorder"**
- **Penyebab:** `noorder` tidak ada di tabel `permintaan_lab`
- **Solusi:** Pastikan `noorder` sudah terdaftar di sistem

### **Error: "Template not found for kode_pemeriksaan"**
- **Penyebab:** `kode_pemeriksaan` tidak ada di tabel `template_laboratorium`
- **Solusi:** Pastikan `kode_pemeriksaan` valid

### **Error: "Kode dokter tidak valid"**
- **Penyebab:** Kode dokter tidak ada di tabel `dokter`
- **Solusi:** Pastikan kode dokter terdaftar di sistem

### **Error: "Validation failed"**
- **Penyebab:** Format data tidak sesuai (tanggal, waktu, atau field required)
- **Solusi:** Cek format sesuai dokumentasi

### **Error: Database connection timeout**
- **Penyebab:** Database overload atau network issue
- **Solusi:** Cek koneksi database, cek connection pool settings

---

## 📚 Related Files

- **Controller:** `api/bridging/pk/controllers/post-lab-pk.controller.js`
- **Service:** `api/bridging/pk/services/post-lab-pk.service.js`
- **Repository:** `api/bridging/pk/repositories/post-lab-pk.repository.js`
- **Validator:** `api/bridging/pk/validators/lab-results-pk.validator.js`
- **Routes:** `api/bridging/routes.js`
- **Middleware:** `middleware/auth.middleware.js`
- **Logger:** `utils/logger.js`

