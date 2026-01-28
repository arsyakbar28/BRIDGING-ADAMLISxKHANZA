# 🔄 Data Transformation Mapping - Adam LIS to SIMRS

## 📊 Overview

Dokumen ini menjelaskan bagaimana data dari **Adam LIS** ditransformasi ke format **SIMRS (Khanza)** database.

---

## 🔀 Format Comparison

### Adam LIS Format (Request Body)

```json
{
  "no_registrasi": "PK202512220119",
  "no_laboratorium": "N02/251222/0012",
  "waktu_registrasi": "2025-12-22 21:56:35",
  "keterangan_hasil": "-",
  "diagnosa_awal": "-",
  "kode_rs": "N02",
  "kode_lab": "LAB_SUMBAWA",
  "username": "root",
  "nama_pegawai": "Root",
  "pemeriksa": null,
  "pasien": { ... },
  "dokter_pengirim": {
    "kode": "D0000090",
    "nama": "dr. YOLANDA PUSPITA,Sp.MK."
  },
  "unit_asal": { ... },
  "penjamin": { ... },
  "pemeriksaan": [
    {
      "kategori_pemeriksaan": {
        "nama_kategori": "KIMIA KLINIK",
        "nomor_urut": 2
      },
      "sub_kategori_pemeriksaan": {
        "nama_sub_kategori": "Glukosa",
        "nomor_urut": 4
      },
      "nomor_urut": 1,
      "kode_tindakan_simrs": "L000016",
      "nama_pemeriksaan_lis": "Glukosa Sewaktu",
      "kode_pemeriksaan_lis": "GDS",
      "total_duplo": 0,
      "status_duplo": false,
      "metode": "-",
      "waktu_pemeriksaan": "2025-12-22 21:57:08",
      "status_bridging": false,
      "histogram": "-",
      "scattergram": "-",
      "hasil": {
        "satuan": "mg/dL",
        "nilai_hasil": "120",
        "nilai_rujukan": "< 140",
        "flag_kode": "N"
      }
    }
  ]
}
```

### SIMRS Expected Format (Current)

```json
{
  "noorder": "PK202512220119",
  "dokter_pj": "D029",
  "petugas": "LAB007",
  "dokter_perujuk": "D018",
  "tgl_periksa": "2025-12-22",
  "jam_periksa": "21:57:08",
  "pemeriksaan": [
    {
      "kode_pemeriksaan": "1001",
      "hasil": "120",
      "nilai_rujukan": "70-100",
      "keterangan": "Normal"
    }
  ],
  "kesan": "Hasil dalam batas normal",
  "saran": "Lanjutkan pengobatan"
}
```

---

## 🗺️ Field Mapping Table

### Root Level Mapping

| Adam LIS Field | SIMRS Field | Type | Transformation | Notes |
|----------------|-------------|------|----------------|-------|
| `no_registrasi` | `noorder` | STRING | Direct copy | ✅ Primary identifier |
| `dokter_pengirim.kode` | `dokter_perujuk` | STRING | Extract from object | ✅ Dokter pengirim |
| `pemeriksa` | `dokter_pj` | STRING | ❌ **MISSING** | ⚠️ Perlu ditambahkan |
| `username` atau `nip_petugas` | `petugas` | STRING | ❌ **MISSING** | ⚠️ Perlu mapping petugas |
| `waktu_pemeriksaan[0]` split | `tgl_periksa` | DATE | Split date part | ✅ From first pemeriksaan |
| `waktu_pemeriksaan[0]` split | `jam_periksa` | TIME | Split time part | ✅ From first pemeriksaan |
| `keterangan_hasil` | `kesan` | TEXT | Direct copy (optional) | ⚠️ Optional |
| N/A | `saran` | TEXT | ❌ **MISSING** | ⚠️ Not in Adam LIS |

### Pemeriksaan Array Mapping

| Adam LIS Field | SIMRS Field | Type | Transformation | Notes |
|----------------|-------------|------|----------------|-------|
| `kode_pemeriksaan_lis` | `kode_pemeriksaan` | STRING | Direct copy | ✅ Template ID |
| `hasil.nilai_hasil` | `hasil` | STRING | Extract from `hasil` object | ✅ Result value |
| `hasil.nilai_rujukan` | `nilai_rujukan` | STRING | Extract from `hasil` object | ✅ Reference value |
| `hasil.flag_kode` | `keterangan` | STRING | Map flag to text | ✅ Need mapper |

---

## 🔧 Required Transformations

### 1. **Date/Time Splitting**

**Adam LIS:**
```json
"waktu_pemeriksaan": "2025-12-22 21:57:08"
```

**SIMRS:**
```json
"tgl_periksa": "2025-12-22",
"jam_periksa": "21:57:08"
```

**Transform Function:**
```javascript
function splitDateTime(waktu_pemeriksaan) {
  const [tgl_periksa, jam_periksa] = waktu_pemeriksaan.split(' ');
  return { tgl_periksa, jam_periksa };
}
```

---

### 2. **Pemeriksaan Array Transformation**

**Adam LIS:**
```json
{
  "kode_pemeriksaan_lis": "GDS",
  "nama_pemeriksaan_lis": "Glukosa Sewaktu",
  "hasil": {
    "satuan": "mg/dL",
    "nilai_hasil": "120",
    "nilai_rujukan": "< 140",
    "flag_kode": "N"
  }
}
```

**SIMRS:**
```json
{
  "kode_pemeriksaan": "GDS",
  "hasil": "120",
  "nilai_rujukan": "< 140",
  "keterangan": "Normal"
}
```

**Transform Function:**
```javascript
function transformPemeriksaan(adamPemeriksaan) {
  return {
    kode_pemeriksaan: adamPemeriksaan.kode_pemeriksaan_lis,
    hasil: adamPemeriksaan.hasil.nilai_hasil,
    nilai_rujukan: adamPemeriksaan.hasil.nilai_rujukan || "-",
    keterangan: mapFlagToKeterangan(adamPemeriksaan.hasil.flag_kode)
  };
}

function mapFlagToKeterangan(flag_kode) {
  const flagMap = {
    'N': 'Normal',
    'L': 'Rendah',
    'H': 'Tinggi',
    'A': 'Abnormal',
    'C': 'Critical'
  };
  return flagMap[flag_kode] || '-';
}
```

---

### 3. **Dokter Mapping**

**Adam LIS:**
```json
"dokter_pengirim": {
  "kode": "D0000090",
  "nama": "dr. YOLANDA PUSPITA,Sp.MK."
}
```

**SIMRS:**
```json
"dokter_perujuk": "D0000090"
```

**Transform Function:**
```javascript
function extractDokterKode(dokter_pengirim) {
  return dokter_pengirim?.kode || null;
}
```

---

## 🚨 Missing Fields Problem

### ❌ Fields Missing in Adam LIS

| SIMRS Field (Required) | Status | Solution |
|------------------------|--------|----------|
| `dokter_pj` | ❌ Missing | 1. Tambahkan di Adam LIS response<br>2. Gunakan default dokter<br>3. Ambil dari permintaan_lab |
| `petugas` | ❌ Missing | 1. Map dari `username`<br>2. Tambahkan field `nip_petugas`<br>3. Ambil dari permintaan_lab |
| `saran` | ❌ Missing | Optional - bisa dikosongkan |

---

## 🔄 Complete Transformation Example

### Input (Adam LIS):

```json
{
  "no_registrasi": "PK202512220119",
  "waktu_registrasi": "2025-12-22 21:56:35",
  "keterangan_hasil": "Hasil dalam batas normal",
  "dokter_pengirim": {
    "kode": "D0000090",
    "nama": "dr. YOLANDA PUSPITA,Sp.MK."
  },
  "username": "root",
  "pemeriksaan": [
    {
      "kode_pemeriksaan_lis": "GDS",
      "nama_pemeriksaan_lis": "Glukosa Sewaktu",
      "waktu_pemeriksaan": "2025-12-22 21:57:08",
      "hasil": {
        "satuan": "mg/dL",
        "nilai_hasil": "120",
        "nilai_rujukan": "< 140",
        "flag_kode": "N"
      }
    },
    {
      "kode_pemeriksaan_lis": "GDP",
      "nama_pemeriksaan_lis": "Glukosa Puasa",
      "waktu_pemeriksaan": "2025-12-22 21:57:08",
      "hasil": {
        "satuan": "mg/dL",
        "nilai_hasil": "85",
        "nilai_rujukan": "70 - 110",
        "flag_kode": "N"
      }
    }
  ]
}
```

### Output (SIMRS Format):

```json
{
  "noorder": "PK202512220119",
  "dokter_pj": "D0000090",
  "petugas": "ROOT",
  "dokter_perujuk": "D0000090",
  "tgl_periksa": "2025-12-22",
  "jam_periksa": "21:57:08",
  "pemeriksaan": [
    {
      "kode_pemeriksaan": "GDS",
      "hasil": "120",
      "nilai_rujukan": "< 140",
      "keterangan": "Normal"
    },
    {
      "kode_pemeriksaan": "GDP",
      "hasil": "85",
      "nilai_rujukan": "70 - 110",
      "keterangan": "Normal"
    }
  ],
  "kesan": "Hasil dalam batas normal",
  "saran": ""
}
```

### Transformation Code:

```javascript
function transformAdamLIStoSIMRS(adamData) {
  // Extract datetime from first pemeriksaan
  const firstPemeriksaan = adamData.pemeriksaan[0];
  const { tgl_periksa, jam_periksa } = splitDateTime(firstPemeriksaan.waktu_pemeriksaan);
  
  // Transform pemeriksaan array
  const pemeriksaan = adamData.pemeriksaan.map(p => ({
    kode_pemeriksaan: p.kode_pemeriksaan_lis,
    hasil: p.hasil.nilai_hasil,
    nilai_rujukan: p.hasil.nilai_rujukan || "-",
    keterangan: mapFlagToKeterangan(p.hasil.flag_kode)
  }));
  
  // Build SIMRS format
  return {
    noorder: adamData.no_registrasi,
    dokter_pj: adamData.dokter_pengirim?.kode || "DEFAULT_DOKTER",
    petugas: mapUsernameToPetugas(adamData.username),
    dokter_perujuk: adamData.dokter_pengirim?.kode,
    tgl_periksa,
    jam_periksa,
    pemeriksaan,
    kesan: adamData.keterangan_hasil || "",
    saran: ""
  };
}

function splitDateTime(waktu) {
  const [date, time] = waktu.split(' ');
  return { tgl_periksa: date, jam_periksa: time };
}

function mapFlagToKeterangan(flag) {
  const map = {
    'N': 'Normal',
    'L': 'Rendah',
    'H': 'Tinggi',
    'A': 'Abnormal',
    'C': 'Critical'
  };
  return map[flag] || '-';
}

function mapUsernameToPetugas(username) {
  // Option 1: Query database for NIP
  // Option 2: Use mapping table
  // Option 3: Use username as-is (uppercase)
  return username.toUpperCase();
}
```

---

## 🎯 Recommended Solutions

### **Solution 1: Add Adapter Middleware** ⭐ (RECOMMENDED)

Create middleware to transform Adam LIS format to SIMRS format automatically.

**File:** `api/bridging/pk/middleware/adam-lis-adapter.middleware.js`

```javascript
function adaptAdamLISRequest(req, res, next) {
  const adamData = req.body;
  
  // Check if this is Adam LIS format
  if (adamData.no_registrasi && !adamData.noorder) {
    // Transform to SIMRS format
    req.body = transformAdamLIStoSIMRS(adamData);
    req.originalAdamData = adamData; // Keep original for logging
  }
  
  next();
}

module.exports = { adaptAdamLISRequest };
```

**Benefits:**
- ✅ No changes needed in Adam LIS
- ✅ No changes in existing validator/service
- ✅ Easy to maintain
- ✅ Can be toggled on/off

---

### **Solution 2: Database Lookup for Missing Fields**

Query `permintaan_lab` to get `dokter_pj` and `petugas`:

```sql
SELECT 
  pl.dokter_perujuk,
  pl.nip as petugas,
  d.kd_dokter as dokter_pj
FROM permintaan_lab pl
LEFT JOIN reg_periksa rp ON pl.no_rawat = rp.no_rawat
LEFT JOIN dokter d ON rp.kd_dokter = d.kd_dokter
WHERE pl.noorder = ?
```

**Benefits:**
- ✅ Use existing data
- ✅ More accurate

**Drawbacks:**
- ⚠️ Additional database query
- ⚠️ Slower performance

---

### **Solution 3: Request Adam LIS to Add Fields**

Ask Adam LIS team to add these fields to their response:

```json
{
  "no_registrasi": "PK202512220119",
  "dokter_pj": "D029",          // ⭐ NEW
  "nip_petugas": "LAB007",      // ⭐ NEW
  "dokter_pengirim": {
    "kode": "D0000090"
  },
  "saran": "Lanjutkan terapi"   // ⭐ NEW (optional)
}
```

**Benefits:**
- ✅ Clean solution
- ✅ No transformation needed
- ✅ Fastest performance

**Drawbacks:**
- ⚠️ Requires Adam LIS changes
- ⚠️ Depends on external team

---

## 📊 Comparison Matrix

| Solution | Complexity | Performance | Maintainability | Recommendation |
|----------|------------|-------------|-----------------|----------------|
| **Adapter Middleware** | 🟡 Medium | 🟢 Fast | 🟢 Easy | ⭐⭐⭐⭐⭐ |
| **Database Lookup** | 🟡 Medium | 🟡 Medium | 🟡 Medium | ⭐⭐⭐ |
| **Request Adam LIS Changes** | 🟢 Low | 🟢 Fast | 🟢 Easy | ⭐⭐⭐⭐ |

---

## 🚀 Next Steps

1. **Immediate:** Implement Adapter Middleware (Solution 1)
2. **Short-term:** Request Adam LIS to add missing fields (Solution 3)
3. **Fallback:** Use Database Lookup if needed (Solution 2)

---

## 📝 Implementation Priority

### High Priority (Must Have):
- ✅ Transform `no_registrasi` → `noorder`
- ✅ Extract `dokter_pengirim.kode` → `dokter_perujuk`
- ✅ Split `waktu_pemeriksaan` → `tgl_periksa` + `jam_periksa`
- ✅ Transform `pemeriksaan` array structure
- ✅ Map `flag_kode` → `keterangan`

### Medium Priority (Should Have):
- ⚠️ Resolve `dokter_pj` (use database lookup or default)
- ⚠️ Resolve `petugas` (map from username or database)

### Low Priority (Nice to Have):
- 📝 Transform `keterangan_hasil` → `kesan`
- 📝 Add default empty `saran`

---

## 🔍 Testing Checklist

- [ ] Test with single pemeriksaan
- [ ] Test with multiple pemeriksaan
- [ ] Test with different flag codes (N, L, H, A, C)
- [ ] Test with null/missing values
- [ ] Test with special characters in results
- [ ] Test datetime parsing edge cases
- [ ] Test with missing optional fields
- [ ] Verify database inserts are correct
- [ ] Check if tarif calculation works
- [ ] Validate transaction rollback on error
