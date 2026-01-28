# ✅ Validasi POST Lab Results - Dokumentasi Lengkap

## 📋 Overview

Proses POST memiliki **3 level validasi** yang berlapis untuk memastikan data yang masuk valid sebelum disimpan ke database:

1. **Controller Level** - Basic validation (quick check)
2. **Service Level** - Comprehensive validation (detailed check)
3. **Database Level** - Business logic validation (data integrity)

---

## 🔍 Level 1: Controller Validation

**File:** `api/bridging/pk/controllers/post-lab-pk.controller.js`

### ✅ Validasi yang Dilakukan:

#### 1. **Required Fields Check**
```javascript
// Cek field required ada atau tidak
- noorder
- pemeriksaan (harus array)
- dokter_pj
- petugas
- dokter_perujuk
- tgl_periksa
- jam_periksa
```

**Error Response:**
```json
{
  "success": false,
  "message": "Required fields: noorder, pemeriksaan (array), dokter_pj, petugas, dokter_perujuk, tgl_periksa, jam_periksa",
  "payload": []
}
```

#### 2. **Pemeriksaan Array Check**
```javascript
// Cek pemeriksaan adalah array dan tidak kosong
- pemeriksaan harus Array
- pemeriksaan.length > 0
```

#### 3. **Pemeriksaan Item Format Check**
```javascript
// Cek setiap item pemeriksaan punya field required
for (const pemeriksaan of labData.pemeriksaan) {
  - pemeriksaan.kode_pemeriksaan (required)
  - pemeriksaan.hasil (required)
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Each pemeriksaan must have kode_pemeriksaan and hasil",
  "payload": []
}
```

**Status Code:** `400 Bad Request`

---

## 🔍 Level 2: Service Validation (Comprehensive)

**File:** `api/bridging/pk/services/post-lab-pk.service.js`  
**Validator:** `api/bridging/pk/validators/lab-results-pk.validator.js`

### ✅ Validasi yang Dilakukan:

#### 1. **Required Root Fields**
```javascript
// Validasi field required dengan pesan yang jelas
- noorder: required, tidak boleh kosong
- dokter_pj: required, tidak boleh kosong
- petugas: required, tidak boleh kosong
- dokter_perujuk: required, tidak boleh kosong
```

**Error Example:**
```json
{
  "success": false,
  "message": "Validation failed: Found 2 error(s)",
  "errors": [
    {
      "field": "dokter_pj",
      "message": "dokter_pj is required and cannot be empty"
    },
    {
      "field": "petugas",
      "message": "petugas is required and cannot be empty"
    }
  ],
  "payload": []
}
```

#### 2. **Date Format Validation**
```javascript
// Validasi format tanggal: YYYY-MM-DD
validateDateFormat(tgl_periksa)
```

**Rules:**
- ✅ Format harus: `YYYY-MM-DD` (contoh: `2025-11-01`)
- ✅ Harus valid date (tidak bisa `2025-13-45`)
- ✅ Tidak boleh kosong

**Error Example:**
```json
{
  "field": "tgl_periksa",
  "message": "Date must be in format YYYY-MM-DD"
}
```

**Valid Examples:**
- ✅ `2025-11-01`
- ✅ `2025-12-31`
- ❌ `01-11-2025` (format salah)
- ❌ `2025/11/01` (format salah)
- ❌ `2025-13-01` (bulan tidak valid)

#### 3. **Time Format Validation**
```javascript
// Validasi format waktu: HH:MM:SS
validateTimeFormat(jam_periksa)
```

**Rules:**
- ✅ Format harus: `HH:MM:SS` (contoh: `16:00:38`)
- ✅ Hour: 00-23
- ✅ Minute: 00-59
- ✅ Second: 00-59
- ✅ Tidak boleh kosong

**Error Example:**
```json
{
  "field": "jam_periksa",
  "message": "Time must be in format HH:MM:SS (e.g., 15:30:00)"
}
```

**Valid Examples:**
- ✅ `16:00:38`
- ✅ `09:30:00`
- ✅ `23:59:59`
- ❌ `16:00` (tidak ada detik)
- ❌ `25:00:00` (jam tidak valid)
- ❌ `16:60:00` (menit tidak valid)

#### 4. **Pemeriksaan Array Validation**
```javascript
// Validasi array pemeriksaan
validateArrayNotEmpty(pemeriksaan, 'pemeriksaan')
```

**Rules:**
- ✅ Harus array (bukan object atau string)
- ✅ Array tidak boleh kosong (minimal 1 item)
- ✅ Tidak boleh `null` atau `undefined`

**Error Example:**
```json
{
  "field": "pemeriksaan",
  "message": "pemeriksaan cannot be empty"
}
```

#### 5. **Pemeriksaan Item Validation**

Untuk setiap item di array `pemeriksaan`:

**a) kode_pemeriksaan**
```javascript
// Required, tidak boleh kosong
if (!item.kode_pemeriksaan || item.kode_pemeriksaan.toString().trim() === '')
```

**Error Example:**
```json
{
  "field": "pemeriksaan[0].kode_pemeriksaan",
  "message": "kode_pemeriksaan is required and cannot be empty",
  "index": 0
}
```

**b) hasil**
```javascript
// Required, tidak boleh null, undefined, atau empty string
if (item.hasil === null || item.hasil === undefined || item.hasil.toString().trim() === '')
```

**Error Example:**
```json
{
  "field": "pemeriksaan[1].hasil",
  "message": "hasil is required and cannot be empty",
  "index": 1
}
```

**c) nilai_rujukan** (Optional)
- ✅ Tidak ada validasi (optional field)
- ✅ Jika `null` atau `undefined`, akan di-set ke `""` di service

**d) keterangan** (Optional)
- ✅ Tidak ada validasi (optional field)
- ✅ Jika tidak ada, akan di-set ke `""` di service

**Status Code:** `400 Bad Request`  
**Note:** Validasi ini dilakukan **SEBELUM** buka database connection (fail-fast)

---

## 🔍 Level 3: Database Validation (Business Logic)

**File:** `api/bridging/pk/services/post-lab-pk.service.js`  
**Repository:** `api/bridging/pk/repositories/post-lab-pk.repository.js`

### ✅ Validasi yang Dilakukan:

#### 1. **Noorder Exists Check**
```sql
SELECT no_rawat FROM permintaan_lab WHERE noorder = ?
```

**Validasi:**
- ✅ `noorder` harus ada di tabel `permintaan_lab`
- ✅ Jika tidak ada → return error

**Error Response:**
```json
{
  "success": false,
  "message": "No lab request found for noorder: PK202511010004",
  "payload": []
}
```

**Status Code:** `400 Bad Request`

#### 2. **Template Exists Check**
```sql
SELECT id_template, kd_jenis_prw, Pemeriksaan, satuan, urut
FROM template_laboratorium
WHERE id_template IN (?, ?, ?, ...)
```

**Validasi:**
- ✅ Semua `kode_pemeriksaan` harus ada di tabel `template_laboratorium`
- ✅ Jika ada yang tidak ditemukan → return error dengan list yang tidak ditemukan

**Error Response:**
```json
{
  "success": false,
  "message": "Template not found for 2 kode_pemeriksaan",
  "payload": [
    {
      "noorder": "PK202511010004",
      "missing_templates": ["9999", "8888"]
    }
  ]
}
```

**Status Code:** `400 Bad Request`

#### 3. **Tarif Exists Check**
```sql
SELECT kd_jenis_prw, nm_perawatan, total_byr, ...
FROM jns_perawatan_lab
WHERE kd_jenis_prw IN (?, ?, ?, ...)
```

**Validasi:**
- ✅ Semua `kode_tindakan` (dari template) harus punya tarif di `jns_perawatan_lab`
- ✅ Jika ada yang tidak ditemukan → return error

**Error Response:**
```json
{
  "success": false,
  "message": "Tarif not found for 1 kode_tindakan",
  "payload": [
    {
      "noorder": "PK202511010004",
      "missing_tarif": ["T999"]
    }
  ]
}
```

**Status Code:** `400 Bad Request`

#### 4. **Dokter PJ Exists Check**
```sql
SELECT kd_dokter FROM dokter WHERE kd_dokter = ?
```

**Validasi:**
- ✅ `dokter_pj` harus ada di tabel `dokter`
- ✅ Jika tidak ada → return error dengan pesan jelas

**Error Response:**
```json
{
  "success": false,
  "message": "Kode dokter tidak valid: \"D999\". Pastikan kode dokter terdaftar di sistem.",
  "payload": []
}
```

**Status Code:** `400 Bad Request`

#### 5. **Dokter Perujuk Exists Check**
```sql
SELECT kd_dokter FROM dokter WHERE kd_dokter = ?
```

**Validasi:**
- ✅ `dokter_perujuk` harus ada di tabel `dokter`
- ✅ Jika tidak ada → return error dengan pesan jelas

**Error Response:**
```json
{
  "success": false,
  "message": "Kode dokter perujuk tidak valid: \"D888\". Pastikan kode dokter terdaftar di sistem.",
  "payload": []
}
```

**Status Code:** `400 Bad Request`

#### 6. **Petugas Exists Check**
```sql
SELECT nip FROM petugas WHERE nip = ?
```

**Validasi:**
- ✅ `petugas` (NIP) harus ada di tabel `petugas`
- ✅ Jika tidak ada → return error dengan pesan jelas

**Error Response:**
```json
{
  "success": false,
  "message": "Kode petugas tidak valid: \"LAB999\". Pastikan kode petugas terdaftar di sistem.",
  "payload": []
}
```

**Status Code:** `400 Bad Request`

---

## 📊 Summary Table

| Level | Validasi | Lokasi | Status Code | Sebelum Buka DB? |
|-------|----------|--------|-------------|------------------|
| **1. Controller** | Required fields basic check | Controller | 400 | ✅ Ya |
| **1. Controller** | Pemeriksaan array format | Controller | 400 | ✅ Ya |
| **2. Service** | Required fields detailed | Validator | 400 | ✅ Ya |
| **2. Service** | Date format (YYYY-MM-DD) | Validator | 400 | ✅ Ya |
| **2. Service** | Time format (HH:MM:SS) | Validator | 400 | ✅ Ya |
| **2. Service** | Pemeriksaan array validation | Validator | 400 | ✅ Ya |
| **2. Service** | Pemeriksaan item validation | Validator | 400 | ✅ Ya |
| **3. Database** | Noorder exists | Repository | 400 | ❌ Tidak |
| **3. Database** | Template exists | Repository | 400 | ❌ Tidak |
| **3. Database** | Tarif exists | Repository | 400 | ❌ Tidak |
| **3. Database** | Dokter PJ exists | Repository | 400 | ❌ Tidak |
| **3. Database** | Dokter perujuk exists | Repository | 400 | ❌ Tidak |
| **3. Database** | Petugas exists | Repository | 400 | ❌ Tidak |

---

## 🎯 Validasi Flow

```
Request Masuk
    ↓
[Level 1: Controller]
    ├─ Required fields check
    ├─ Pemeriksaan array check
    └─ Pemeriksaan item format check
    ↓ (Jika gagal → 400 Bad Request)
    
[Level 2: Service Validator]
    ├─ Required fields detailed
    ├─ Date format (YYYY-MM-DD)
    ├─ Time format (HH:MM:SS)
    ├─ Pemeriksaan array validation
    └─ Pemeriksaan item validation
    ↓ (Jika gagal → 400 Bad Request, TIDAK buka DB)
    
[Buka Database Connection]
    ↓
[Level 3: Database Validation]
    ├─ Noorder exists
    ├─ Template exists
    ├─ Tarif exists
    ├─ Dokter PJ exists
    ├─ Dokter perujuk exists
    └─ Petugas exists
    ↓ (Jika gagal → 400 Bad Request, Rollback transaction)
    
[Insert Data]
    ↓
[Success Response]
```

---

## ✅ Field Validation Rules

### **Required Fields**
| Field | Type | Validation | Error Message |
|-------|------|------------|---------------|
| `noorder` | string | Required, not empty | "noorder is required and cannot be empty" |
| `dokter_pj` | string | Required, not empty | "dokter_pj is required and cannot be empty" |
| `petugas` | string | Required, not empty | "petugas is required and cannot be empty" |
| `dokter_perujuk` | string | Required, not empty | "dokter_perujuk is required and cannot be empty" |
| `tgl_periksa` | string | Required, format YYYY-MM-DD | "Date must be in format YYYY-MM-DD" |
| `jam_periksa` | string | Required, format HH:MM:SS | "Time must be in format HH:MM:SS" |
| `pemeriksaan` | array | Required, not empty array | "pemeriksaan cannot be empty" |
| `pemeriksaan[].kode_pemeriksaan` | string/number | Required, not empty | "kode_pemeriksaan is required and cannot be empty" |
| `pemeriksaan[].hasil` | string | Required, not empty | "hasil is required and cannot be empty" |

### **Optional Fields**
| Field | Type | Validation | Default Value |
|-------|------|------------|---------------|
| `pemeriksaan[].nilai_rujukan` | string | Optional | `""` (empty string) |
| `pemeriksaan[].keterangan` | string | Optional | `""` (empty string) |
| `kesan` | string | Optional | `null` (tidak di-insert jika kosong) |
| `saran` | string | Optional | `null` (tidak di-insert jika kosong) |

---

## 📝 Contoh Error Response Lengkap

### **Validation Error (Multiple Errors)**
```json
{
  "success": false,
  "message": "Validation failed: Found 3 error(s)",
  "errors": [
    {
      "field": "tgl_periksa",
      "message": "Date must be in format YYYY-MM-DD"
    },
    {
      "field": "jam_periksa",
      "message": "Time must be in format HH:MM:SS"
    },
    {
      "field": "pemeriksaan[0].hasil",
      "message": "hasil is required and cannot be empty",
      "index": 0
    }
  ],
  "payload": []
}
```

### **Database Validation Error**
```json
{
  "success": false,
  "message": "Kode dokter tidak valid: \"D999\". Pastikan kode dokter terdaftar di sistem.",
  "payload": []
}
```

---

## 🔒 Keamanan & Best Practices

1. **Fail-Fast Validation:** Validasi dilakukan sebelum buka database connection
2. **Transaction Safety:** Semua validasi database dalam transaction, jika gagal di-rollback
3. **Detailed Error Messages:** Pesan error jelas dan informatif
4. **Error Logging:** Semua error di-log untuk debugging
5. **Input Sanitization:** Trim whitespace, convert to string untuk konsistensi

---

## 📚 Related Files

- **Controller:** `api/bridging/pk/controllers/post-lab-pk.controller.js`
- **Service:** `api/bridging/pk/services/post-lab-pk.service.js`
- **Validator:** `api/bridging/pk/validators/lab-results-pk.validator.js`
- **Common Validator:** `api/bridging/shared/validators/common.validator.js`
- **Date Time Validator:** `api/bridging/shared/validators/date-time.validator.js`
- **Repository:** `api/bridging/pk/repositories/post-lab-pk.repository.js`
