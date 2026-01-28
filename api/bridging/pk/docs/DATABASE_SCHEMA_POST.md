# 🗄️ Database Schema - POST Lab Results

## 📊 Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PERMINTAAN_LAB (Master)                        │
│─────────────────────────────────────────────────────────────────────────│
│ PK: noorder (VARCHAR)                                                   │
│ FK: no_rawat → REG_PERIKSA                                             │
│─────────────────────────────────────────────────────────────────────────│
│ Fields:                                                                 │
│ - noorder           : Nomor order (PK)                                 │
│ - no_rawat          : Nomor rawat pasien                               │
│ - tgl_permintaan    : Tanggal permintaan                               │
│ - jam_permintaan    : Jam permintaan                                   │
│ - tgl_hasil         : Tanggal hasil (UPDATE saat POST) ⭐              │
│ - jam_hasil         : Jam hasil (UPDATE saat POST) ⭐                  │
│ - status            : Status pemeriksaan                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1:N
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      PERIKSA_LAB (Header Tindakan)                      │
│─────────────────────────────────────────────────────────────────────────│
│ PK: (no_rawat + kd_jenis_prw + tgl_periksa + jam)                     │
│ FK: no_rawat → REG_PERIKSA                                             │
│ FK: kd_jenis_prw → JNS_PERAWATAN_LAB                                   │
│ FK: nip → PETUGAS                                                       │
│ FK: kd_dokter → DOKTER                                                  │
│ FK: dokter_perujuk → DOKTER                                            │
│─────────────────────────────────────────────────────────────────────────│
│ Fields:                                                                 │
│ - no_rawat                    : Nomor rawat pasien                     │
│ - nip                         : Kode petugas lab                       │
│ - kd_jenis_prw                : Kode jenis perawatan/tindakan         │
│ - tgl_periksa                 : Tanggal pemeriksaan                    │
│ - jam                         : Jam pemeriksaan                         │
│ - dokter_perujuk              : Kode dokter perujuk                    │
│ - kd_dokter                   : Kode dokter penanggung jawab           │
│ - status                      : Status (Ralan/Ranap)                   │
│ - kategori                    : Kategori (PK/PA/MB)                    │
│ - biaya                       : Total biaya tindakan                    │
│ - bagian_rs                   : Bagian RS dari tarif                   │
│ - bhp                         : Bahan Habis Pakai                      │
│ - tarif_perujuk               : Tarif untuk dokter perujuk             │
│ - tarif_tindakan_dokter       : Tarif untuk dokter pemeriksa          │
│ - tarif_tindakan_petugas      : Tarif untuk petugas                   │
│ - kso                         : Kerjasama Operasional                  │
│ - menejemen                   : Biaya menejemen                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1:N
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                 DETAIL_PERIKSA_LAB (Detail Pemeriksaan)                 │
│─────────────────────────────────────────────────────────────────────────│
│ PK: (no_rawat + kd_jenis_prw + tgl_periksa + jam + id_template)       │
│ FK: (no_rawat + kd_jenis_prw + tgl_periksa + jam) → PERIKSA_LAB       │
│ FK: id_template → TEMPLATE_LABORATORIUM                                │
│─────────────────────────────────────────────────────────────────────────│
│ Fields:                                                                 │
│ - no_rawat                    : Nomor rawat pasien                     │
│ - kd_jenis_prw                : Kode jenis perawatan/tindakan         │
│ - tgl_periksa                 : Tanggal pemeriksaan                    │
│ - jam                         : Jam pemeriksaan                         │
│ - id_template                 : Kode pemeriksaan (template)            │
│ - nilai                       : Hasil pemeriksaan ⭐                   │
│ - nilai_rujukan               : Nilai rujukan normal ⭐               │
│ - keterangan                  : Keterangan tambahan ⭐                │
│ - biaya_item                  : Biaya per item (default: 0.0)         │
│ - bagian_rs                   : Bagian RS dari tarif                   │
│ - bhp                         : Bahan Habis Pakai                      │
│ - bagian_perujuk              : Bagian untuk dokter perujuk            │
│ - bagian_dokter               : Bagian untuk dokter pemeriksa          │
│ - bagian_laborat              : Bagian untuk petugas lab               │
│ - kso                         : Kerjasama Operasional                  │
│ - menejemen                   : Biaya menejemen                        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    SARAN_KESAN_LAB (Kesan & Saran)                      │
│─────────────────────────────────────────────────────────────────────────│
│ PK: (no_rawat + tgl_periksa + jam)                                     │
│ FK: no_rawat → REG_PERIKSA                                             │
│─────────────────────────────────────────────────────────────────────────│
│ Fields:                                                                 │
│ - no_rawat                    : Nomor rawat pasien                     │
│ - tgl_periksa                 : Tanggal pemeriksaan                    │
│ - jam                         : Jam pemeriksaan                         │
│ - kesan                       : Kesan hasil pemeriksaan ⭐             │
│ - saran                       : Saran untuk pasien ⭐                  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Legend:**
- `PK` = Primary Key
- `FK` = Foreign Key
- `⭐` = Field yang diisi dari request POST

---

## 🔗 Reference Tables (Read Only)

```
┌─────────────────────────────┐    ┌─────────────────────────────┐
│  TEMPLATE_LABORATORIUM      │    │   JNS_PERAWATAN_LAB         │
│─────────────────────────────│    │─────────────────────────────│
│ PK: id_template             │    │ PK: kd_jenis_prw            │
│─────────────────────────────│    │─────────────────────────────│
│ - id_template (kode)        │    │ - kd_jenis_prw              │
│ - kd_jenis_prw              │    │ - nm_perawatan              │
│ - Pemeriksaan (nama)        │    │ - total_byr                 │
│ - satuan                    │    │ - bagian_rs                 │
│ - urut                      │    │ - bhp                       │
└─────────────────────────────┘    │ - tarif_perujuk             │
                                    │ - tarif_tindakan_dokter     │
┌─────────────────────────────┐    │ - tarif_tindakan_petugas    │
│         DOKTER              │    │ - kso                       │
│─────────────────────────────│    │ - menejemen                 │
│ PK: kd_dokter               │    │ - kategori                  │
│─────────────────────────────│    │ - status                    │
│ - kd_dokter                 │    └─────────────────────────────┘
│ - nm_dokter                 │
└─────────────────────────────┘    ┌─────────────────────────────┐
                                    │        PETUGAS              │
                                    │─────────────────────────────│
                                    │ PK: nip                     │
                                    │─────────────────────────────│
                                    │ - nip                       │
                                    │ - nama                      │
                                    └─────────────────────────────┘
```

---

## 📝 Detailed Field Mapping

### **1. PERMINTAAN_LAB (UPDATE)**

**Operation:** `UPDATE` - Update tanggal dan jam hasil

| Field Name | Type | Source | Example Value | Notes |
|------------|------|--------|---------------|-------|
| `tgl_hasil` | DATE | `labData.tgl_periksa` | `2025-12-22` | Tanggal hasil selesai |
| `jam_hasil` | TIME | `labData.jam_periksa` | `21:57:08` | Jam hasil selesai |

**Condition:** `WHERE noorder = ?`

**SQL:**
```sql
UPDATE permintaan_lab 
SET tgl_hasil = ?, jam_hasil = ?
WHERE noorder = ?
```

**Example:**
```sql
UPDATE permintaan_lab 
SET tgl_hasil = '2025-12-22', jam_hasil = '21:57:08'
WHERE noorder = 'PK202512220119'
```

---

### **2. PERIKSA_LAB (INSERT)**

**Operation:** `INSERT` - 1 row per tindakan (kd_jenis_prw)

**Primary Key:** Composite (`no_rawat` + `kd_jenis_prw` + `tgl_periksa` + `jam`)

| Field Name | Type | Source | Example Value | Notes |
|------------|------|--------|---------------|-------|
| `no_rawat` | VARCHAR | From `permintaan_lab` | `2025/12/22/000123` | Dari query noorder |
| `nip` | VARCHAR | `labData.petugas` | `LAB007` | Kode petugas |
| `kd_jenis_prw` | VARCHAR | From `template_laboratorium.kd_jenis_prw` | `L000016` | Auto-group dari template |
| `tgl_periksa` | DATE | `labData.tgl_periksa` | `2025-12-22` | Tanggal pemeriksaan |
| `jam` | TIME | `labData.jam_periksa` | `21:57:08` | Jam pemeriksaan |
| `dokter_perujuk` | VARCHAR | `labData.dokter_perujuk` | `D0000090` | Dokter pengirim |
| `kd_dokter` | VARCHAR | `labData.dokter_pj` | `D029` | Dokter penanggung jawab |
| `status` | VARCHAR | From `jns_perawatan_lab.status` | `Ralan` | Status rawat |
| `kategori` | VARCHAR | From `jns_perawatan_lab.kategori` | `PK` | Kategori lab |
| `biaya` | DECIMAL | From `jns_perawatan_lab.total_byr` | `50000.00` | Total biaya tindakan |
| `bagian_rs` | DECIMAL | From `jns_perawatan_lab.bagian_rs` | `25000.00` | Bagian rumah sakit |
| `bhp` | DECIMAL | From `jns_perawatan_lab.bhp` | `5000.00` | Bahan habis pakai |
| `tarif_perujuk` | DECIMAL | From `jns_perawatan_lab.tarif_perujuk` | `10000.00` | Tarif dokter perujuk |
| `tarif_tindakan_dokter` | DECIMAL | From `jns_perawatan_lab.tarif_tindakan_dokter` | `5000.00` | Tarif dokter pemeriksa |
| `tarif_tindakan_petugas` | DECIMAL | From `jns_perawatan_lab.tarif_tindakan_petugas` | `3000.00` | Tarif petugas |
| `kso` | DECIMAL | From `jns_perawatan_lab.kso` | `1000.00` | Kerjasama operasional |
| `menejemen` | DECIMAL | From `jns_perawatan_lab.menejemen` | `1000.00` | Biaya menejemen |

**SQL:**
```sql
INSERT INTO periksa_lab 
(no_rawat, nip, kd_jenis_prw, tgl_periksa, jam, dokter_perujuk, bagian_rs, bhp, 
 tarif_perujuk, tarif_tindakan_dokter, tarif_tindakan_petugas, kso, menejemen, 
 biaya, kd_dokter, status, kategori)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

**Example:**
```sql
INSERT INTO periksa_lab VALUES (
  '2025/12/22/000123',  -- no_rawat
  'LAB007',             -- nip
  'L000016',            -- kd_jenis_prw
  '2025-12-22',         -- tgl_periksa
  '21:57:08',           -- jam
  'D0000090',           -- dokter_perujuk
  25000.00,             -- bagian_rs
  5000.00,              -- bhp
  10000.00,             -- tarif_perujuk
  5000.00,              -- tarif_tindakan_dokter
  3000.00,              -- tarif_tindakan_petugas
  1000.00,              -- kso
  1000.00,              -- menejemen
  50000.00,             -- biaya
  'D029',               -- kd_dokter
  'Ralan',              -- status
  'PK'                  -- kategori
)
```

---

### **3. DETAIL_PERIKSA_LAB (INSERT)**

**Operation:** `INSERT` - 1 row per pemeriksaan (per item di array)

**Primary Key:** Composite (`no_rawat` + `kd_jenis_prw` + `tgl_periksa` + `jam` + `id_template`)

| Field Name | Type | Source | Example Value | Notes |
|------------|------|--------|---------------|-------|
| `no_rawat` | VARCHAR | From `permintaan_lab` | `2025/12/22/000123` | Dari query noorder |
| `kd_jenis_prw` | VARCHAR | From `template_laboratorium.kd_jenis_prw` | `L000016` | Kode tindakan |
| `tgl_periksa` | DATE | `labData.tgl_periksa` | `2025-12-22` | Tanggal pemeriksaan |
| `jam` | TIME | `labData.jam_periksa` | `21:57:08` | Jam pemeriksaan |
| `id_template` | INT | `pemeriksaan[i].kode_pemeriksaan` | `1001` | Kode pemeriksaan ⭐ |
| `nilai` | VARCHAR | `pemeriksaan[i].hasil` | `120` | Hasil pemeriksaan ⭐ |
| `nilai_rujukan` | VARCHAR | `pemeriksaan[i].nilai_rujukan` | `70-100` | Nilai normal ⭐ |
| `keterangan` | VARCHAR | `pemeriksaan[i].keterangan` | `Normal` | Keterangan ⭐ |
| `biaya_item` | DECIMAL | Fixed | `0.0` | Default 0 |
| `bagian_rs` | DECIMAL | From `jns_perawatan_lab.bagian_rs` | `25000.00` | Bagian RS |
| `bhp` | DECIMAL | From `jns_perawatan_lab.bhp` | `5000.00` | BHP |
| `bagian_perujuk` | DECIMAL | From `jns_perawatan_lab.tarif_perujuk` | `10000.00` | Bagian perujuk |
| `bagian_dokter` | DECIMAL | From `jns_perawatan_lab.tarif_tindakan_dokter` | `5000.00` | Bagian dokter |
| `bagian_laborat` | DECIMAL | From `jns_perawatan_lab.tarif_tindakan_petugas` | `3000.00` | Bagian petugas |
| `kso` | DECIMAL | From `jns_perawatan_lab.kso` | `1000.00` | KSO |
| `menejemen` | DECIMAL | From `jns_perawatan_lab.menejemen` | `1000.00` | Menejemen |

**SQL:**
```sql
INSERT INTO detail_periksa_lab 
(no_rawat, kd_jenis_prw, tgl_periksa, jam, id_template, nilai, nilai_rujukan, keterangan, 
 bagian_rs, bhp, bagian_perujuk, bagian_dokter, bagian_laborat, kso, menejemen, biaya_item)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

**Example:**
```sql
INSERT INTO detail_periksa_lab VALUES (
  '2025/12/22/000123',  -- no_rawat
  'L000016',            -- kd_jenis_prw
  '2025-12-22',         -- tgl_periksa
  '21:57:08',           -- jam
  1001,                 -- id_template (kode_pemeriksaan)
  '120',                -- nilai (hasil)
  '70-100',             -- nilai_rujukan
  'Normal',             -- keterangan
  25000.00,             -- bagian_rs
  5000.00,              -- bhp
  10000.00,             -- bagian_perujuk
  5000.00,              -- bagian_dokter
  3000.00,              -- bagian_laborat
  1000.00,              -- kso
  1000.00,              -- menejemen
  0.0                   -- biaya_item
)
```

---

### **4. SARAN_KESAN_LAB (INSERT - Optional)**

**Operation:** `INSERT` - Hanya jika `kesan` atau `saran` ada di request

**Primary Key:** Composite (`no_rawat` + `tgl_periksa` + `jam`)

| Field Name | Type | Source | Example Value | Notes |
|------------|------|--------|---------------|-------|
| `no_rawat` | VARCHAR | From `permintaan_lab` | `2025/12/22/000123` | Dari query noorder |
| `tgl_periksa` | DATE | `labData.tgl_periksa` | `2025-12-22` | Tanggal pemeriksaan |
| `jam` | TIME | `labData.jam_periksa` | `21:57:08` | Jam pemeriksaan |
| `kesan` | TEXT | `labData.kesan` | `Hasil dalam batas normal` | Kesan hasil ⭐ |
| `saran` | TEXT | `labData.saran` | `Lanjutkan pengobatan` | Saran untuk pasien ⭐ |

**SQL:**
```sql
INSERT INTO saran_kesan_lab 
(no_rawat, tgl_periksa, jam, kesan, saran)
VALUES (?, ?, ?, ?, ?)
```

**Example:**
```sql
INSERT INTO saran_kesan_lab VALUES (
  '2025/12/22/000123',                 -- no_rawat
  '2025-12-22',                        -- tgl_periksa
  '21:57:08',                          -- jam
  'Hasil pemeriksaan dalam batas normal', -- kesan
  'Lanjutkan pengobatan sesuai anjuran'  -- saran
)
```

---

## 🔄 Data Flow Example

### Request Body:
```json
{
  "noorder": "PK202512220119",
  "dokter_pj": "D029",
  "petugas": "LAB007",
  "dokter_perujuk": "D0000090",
  "tgl_periksa": "2025-12-22",
  "jam_periksa": "21:57:08",
  "pemeriksaan": [
    {
      "kode_pemeriksaan": "1001",
      "hasil": "120",
      "nilai_rujukan": "70-100",
      "keterangan": "Normal"
    },
    {
      "kode_pemeriksaan": "1002",
      "hasil": "5.5",
      "nilai_rujukan": "3.5-5.5",
      "keterangan": "Normal"
    }
  ],
  "kesan": "Hasil dalam batas normal",
  "saran": "Lanjutkan pengobatan"
}
```

### Database Operations:

```sql
-- Step 1: Get no_rawat
SELECT no_rawat FROM permintaan_lab WHERE noorder = 'PK202512220119'
-- Result: no_rawat = '2025/12/22/000123'

-- Step 2: Get template data
SELECT id_template, kd_jenis_prw, Pemeriksaan, satuan, urut
FROM template_laboratorium
WHERE id_template IN (1001, 1002)
-- Result: 
--   1001 → kd_jenis_prw = 'L000016', Pemeriksaan = 'Glukosa', satuan = 'mg/dL'
--   1002 → kd_jenis_prw = 'L000016', Pemeriksaan = 'HbA1c', satuan = '%'

-- Step 3: Group by kd_jenis_prw
-- Group: L000016 → [1001, 1002]

-- Step 4: Get tarif data
SELECT * FROM jns_perawatan_lab WHERE kd_jenis_prw = 'L000016'
-- Result: total_byr = 50000, bagian_rs = 25000, etc.

-- Step 5: Delete old data
DELETE FROM detail_periksa_lab 
WHERE no_rawat = '2025/12/22/000123' 
  AND tgl_periksa = '2025-12-22' 
  AND jam = '21:57:08'

DELETE FROM periksa_lab 
WHERE no_rawat = '2025/12/22/000123' 
  AND tgl_periksa = '2025-12-22' 
  AND jam = '21:57:08'

DELETE FROM saran_kesan_lab 
WHERE no_rawat = '2025/12/22/000123' 
  AND tgl_periksa = '2025-12-22' 
  AND jam = '21:57:08'

-- Step 6: Insert periksa_lab (1 row for L000016)
INSERT INTO periksa_lab VALUES (
  '2025/12/22/000123', 'LAB007', 'L000016', 
  '2025-12-22', '21:57:08', 'D0000090',
  25000.00, 5000.00, 10000.00, 5000.00, 3000.00, 
  1000.00, 1000.00, 50000.00, 'D029', 'Ralan', 'PK'
)

-- Step 7: Insert detail_periksa_lab (2 rows)
INSERT INTO detail_periksa_lab VALUES (
  '2025/12/22/000123', 'L000016', '2025-12-22', '21:57:08',
  1001, '120', '70-100', 'Normal',
  25000.00, 5000.00, 10000.00, 5000.00, 3000.00, 
  1000.00, 1000.00, 0.0
)

INSERT INTO detail_periksa_lab VALUES (
  '2025/12/22/000123', 'L000016', '2025-12-22', '21:57:08',
  1002, '5.5', '3.5-5.5', 'Normal',
  25000.00, 5000.00, 10000.00, 5000.00, 3000.00, 
  1000.00, 1000.00, 0.0
)

-- Step 8: Update permintaan_lab
UPDATE permintaan_lab 
SET tgl_hasil = '2025-12-22', jam_hasil = '21:57:08'
WHERE noorder = 'PK202512220119'

-- Step 9: Insert saran_kesan_lab
INSERT INTO saran_kesan_lab VALUES (
  '2025/12/22/000123', '2025-12-22', '21:57:08',
  'Hasil dalam batas normal', 'Lanjutkan pengobatan'
)

-- Step 10: COMMIT
```

---

## 📊 Data Relationship Summary

```
1 PERMINTAAN_LAB (noorder)
    ↓ (tgl_hasil, jam_hasil updated)
    ├── 1..N PERIKSA_LAB (grouped by kd_jenis_prw)
    │       ↓
    │       └── 1..N DETAIL_PERIKSA_LAB (one per pemeriksaan)
    │
    └── 0..1 SARAN_KESAN_LAB (optional)
```

**Example:**
- 1 noorder = `PK202512220119`
  - 1 PERIKSA_LAB untuk tindakan `L000016` (Glukosa Panel)
    - 5 DETAIL_PERIKSA_LAB:
      - Glukosa Sewaktu
      - Glukosa Puasa
      - Glukosa 2 jam PP
      - Glukosa Stick
      - HbA1C
  - 1 SARAN_KESAN_LAB (kesan & saran)

---

## 🔑 Important Notes

1. **Composite Primary Keys:**
   - `PERIKSA_LAB`: (`no_rawat`, `kd_jenis_prw`, `tgl_periksa`, `jam`)
   - `DETAIL_PERIKSA_LAB`: (`no_rawat`, `kd_jenis_prw`, `tgl_periksa`, `jam`, `id_template`)
   - `SARAN_KESAN_LAB`: (`no_rawat`, `tgl_periksa`, `jam`)

2. **Auto-Grouping:**
   - Pemeriksaan otomatis di-group berdasarkan `kd_jenis_prw` dari `template_laboratorium`
   - 1 tindakan (PERIKSA_LAB) bisa punya banyak pemeriksaan (DETAIL_PERIKSA_LAB)

3. **Delete Before Insert:**
   - Sistem menghapus data lama dengan key yang sama sebelum insert baru
   - Mencegah duplikasi data

4. **Tarif Calculation:**
   - Tarif diambil dari `jns_perawatan_lab` berdasarkan `kd_jenis_prw`
   - Semua komponen biaya di-copy ke `periksa_lab` dan `detail_periksa_lab`

5. **Transaction:**
   - Semua operasi dalam 1 transaction
   - Rollback jika ada error

---

## 🎯 Key Validations

Before INSERT, system validates:

1. ✅ `noorder` exists in `permintaan_lab`
2. ✅ `kode_pemeriksaan` exists in `template_laboratorium`
3. ✅ `kd_jenis_prw` exists in `jns_perawatan_lab`
4. ✅ `dokter_pj` exists in `dokter`
5. ✅ `petugas` exists in `petugas`
6. ✅ `dokter_perujuk` exists in `dokter`

If any validation fails → **ROLLBACK** and return error.
