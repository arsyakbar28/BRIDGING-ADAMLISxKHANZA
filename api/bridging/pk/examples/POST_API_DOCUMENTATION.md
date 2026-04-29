# POST Lab Results API Documentation

## 📍 Endpoint

```
POST /adam-lis/bridging/
```

**Base URL:** `http://localhost:5000` (atau sesuai konfigurasi server)

**Full URL:** `http://localhost:5000/adam-lis/bridging/`

## 🔐 Authentication

**Required:** Yes (Bearer Token)

**Header:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

## 📋 Request Body

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `noorder` | string | Nomor order lab | `"PK202512220119"` |
| `dokter_pj` | string | Kode dokter penanggung jawab | `"D029"` |
| `petugas` | string | Kode petugas/NIP | `"LAB007"` |
| `dokter_perujuk` | string | Kode dokter perujuk | `"D0000090"` |
| `tgl_periksa` | string | Tanggal pemeriksaan (YYYY-MM-DD) | `"2025-12-22"` |
| `jam_periksa` | string | Jam pemeriksaan (HH:mm:ss) | `"21:57:08"` |
| `pemeriksaan` | array | Array pemeriksaan (min 1 item) | See below |

### Optional Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `kesan` | string | Kesan hasil pemeriksaan | `"Hasil dalam batas normal"` |
| `saran` | string | Saran untuk pasien | `"Lanjutkan pengobatan"` |

### Pemeriksaan Array Structure

Setiap item dalam array `pemeriksaan` harus memiliki:

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `kode_pemeriksaan` | string/number | ✅ Yes | ID template pemeriksaan dari `template_laboratorium.id_template`, bukan kode/nama LIS | `"1001"` atau `1001` |
| `hasil` | string | ✅ Yes | Hasil pemeriksaan | `"120"` atau `"Negatif"` |
| `nilai_rujukan` | string | ❌ No | Nilai rujukan normal | `"70-100"` atau `"-"` |
| `keterangan` | string | ❌ No | Keterangan hasil | `"Normal"` atau `"Tinggi"` |

## 📝 Example Request

### cURL

```bash
curl -X POST http://localhost:5000/adam-lis/bridging/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "noorder": "PK202512220119",
    "dokter_pj": "D029",
    "petugas": "LAB007",
    "dokter_perujuk": "D0000090",
    "tgl_periksa": "2025-12-22",
    "jam_periksa": "21:57:08",
    "pemeriksaan": [
      {
        "kode_pemeriksaan": 1001,
        "hasil": "120",
        "nilai_rujukan": "< 140",
        "keterangan": "Normal"
      },
      {
        "kode_pemeriksaan": 1002,
        "hasil": "85",
        "nilai_rujukan": "70 - 110",
        "keterangan": "Normal"
      },
      {
        "kode_pemeriksaan": 1003,
        "hasil": "130",
        "nilai_rujukan": "< 140",
        "keterangan": "Normal"
      },
      {
        "kode_pemeriksaan": 1004,
        "hasil": "95",
        "nilai_rujukan": "-",
        "keterangan": "-"
      },
      {
        "kode_pemeriksaan": 1005,
        "hasil": "5.8",
        "nilai_rujukan": "< 6.5",
        "keterangan": "Normal"
      }
    ],
    "kesan": "Hasil pemeriksaan panel glukosa menunjukkan kadar gula darah dalam batas normal. HbA1C menunjukkan kontrol gula darah jangka panjang yang baik.",
    "saran": "Lanjutkan pola hidup sehat dengan diet seimbang dan olahraga teratur. Kontrol rutin setiap 3 bulan untuk pemantauan HbA1C."
  }'
```

### JavaScript (Fetch)

```javascript
const response = await fetch('http://localhost:5000/adam-lis/bridging/', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    noorder: "PK202512220119",
    dokter_pj: "D029",
    petugas: "LAB007",
    dokter_perujuk: "D0000090",
    tgl_periksa: "2025-12-22",
    jam_periksa: "21:57:08",
    pemeriksaan: [
      {
        kode_pemeriksaan: 1001,
        hasil: "120",
        nilai_rujukan: "< 140",
        keterangan: "Normal"
      },
      {
        kode_pemeriksaan: 1002,
        hasil: "85",
        nilai_rujukan: "70 - 110",
        keterangan: "Normal"
      },
      {
        kode_pemeriksaan: 1003,
        hasil: "130",
        nilai_rujukan: "< 140",
        keterangan: "Normal"
      },
      {
        kode_pemeriksaan: 1004,
        hasil: "95",
        nilai_rujukan: "-",
        keterangan: "-"
      },
      {
        kode_pemeriksaan: 1005,
        hasil: "5.8",
        nilai_rujukan: "< 6.5",
        keterangan: "Normal"
      }
    ],
    kesan: "Hasil pemeriksaan panel glukosa menunjukkan kadar gula darah dalam batas normal. HbA1C menunjukkan kontrol gula darah jangka panjang yang baik.",
    saran: "Lanjutkan pola hidup sehat dengan diet seimbang dan olahraga teratur. Kontrol rutin setiap 3 bulan untuk pemantauan HbA1C."
  })
});

const data = await response.json();
console.log(data);
```

### Postman

1. Method: `POST`
2. URL: `http://localhost:5000/adam-lis/bridging/`
3. Headers:
   - `Authorization`: `Bearer YOUR_JWT_TOKEN`
   - `Content-Type`: `application/json`
4. Body (raw JSON): Gunakan contoh JSON di atas

## ✅ Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Lab results posted successfully for noorder: PK202512220119",
  "summary": {
    "noorder": "PK202512220119",
    "no_rawat": "2025/12/22/000123",
    "total_tindakan": 1,
    "total_pemeriksaan": 5,
    "tgl_periksa": "2025-12-22",
    "jam_periksa": "21:57:08"
  },
  "biaya_periksa": {
    "total": 150000,
    "mata_uang": "IDR",
    "formatted": "Rp 150.000",
    "breakdown": [
      {
        "kode_tindakan": "L000016",
        "nama_tindakan": "Panel Glukosa",
        "biaya": 150000,
        "detail": {
          "total": 150000,
          "bagian_rs": 75000,
          "bhp": 15000,
          "tarif_perujuk": 30000,
          "tarif_tindakan_dokter": 15000,
          "tarif_tindakan_petugas": 10000,
          "kso": 3000,
          "menejemen": 2000
        }
      }
    ]
  },
  "saran_kesan": {
    "kesan": "Hasil pemeriksaan panel glukosa menunjukkan kadar gula darah dalam batas normal. HbA1C menunjukkan kontrol gula darah jangka panjang yang baik.",
    "saran": "Lanjutkan pola hidup sehat dengan diet seimbang dan olahraga teratur. Kontrol rutin setiap 3 bulan untuk pemantauan HbA1C."
  },
  "payload": [
    {
      "no_urut": 1,
      "kode_jenis_perawatan": "L000016",
      "nama_perawatan": "Panel Glukosa",
      "dokter_pj": "D029",
      "petugas": "LAB007",
      "dokter_perujuk": "D0000090",
      "tgl_periksa": "2025-12-22",
      "jam_periksa": "21:57:08",
      "no_rawat": "2025/12/22/000123",
      "biaya_tindakan": 150000,
      "breakdown_biaya": {
        "total": 150000,
        "bagian_rs": 75000,
        "bhp": 15000,
        "tarif_perujuk": 30000,
        "tarif_tindakan_dokter": 15000,
        "tarif_tindakan_petugas": 10000,
        "kso": 3000,
        "menejemen": 2000
      },
      "detail_pemeriksaan": [
        {
          "kode_pemeriksaan": 1001,
          "nama_pemeriksaan": "Glukosa Sewaktu",
          "hasil": "120",
          "satuan": "mg/dL",
          "nilai_rujukan": "< 140",
          "keterangan": "Normal",
          "status": "Normal"
        },
        {
          "kode_pemeriksaan": 1002,
          "nama_pemeriksaan": "Glukosa Puasa",
          "hasil": "85",
          "satuan": "mg/dL",
          "nilai_rujukan": "70 - 110",
          "keterangan": "Normal",
          "status": "Normal"
        },
        {
          "kode_pemeriksaan": 1003,
          "nama_pemeriksaan": "Glukosa 2 Jam PP",
          "hasil": "130",
          "satuan": "mg/dL",
          "nilai_rujukan": "< 140",
          "keterangan": "Normal",
          "status": "Normal"
        },
        {
          "kode_pemeriksaan": 1004,
          "nama_pemeriksaan": "Glukosa Stick",
          "hasil": "95",
          "satuan": "mg/dL",
          "nilai_rujukan": "-",
          "keterangan": "-",
          "status": "Normal"
        },
        {
          "kode_pemeriksaan": 1005,
          "nama_pemeriksaan": "HbA1C",
          "hasil": "5.8",
          "satuan": "%",
          "nilai_rujukan": "< 6.5",
          "keterangan": "Normal",
          "status": "Normal"
        }
      ]
    }
  ]
}
```

## ❌ Error Responses

### 401 Unauthorized (No Token)

```json
{
  "success": false,
  "message": "Access denied. No token provided.",
  "payload": []
}
```

### 400 Bad Request (Validation Error)

```json
{
  "success": false,
  "message": "Validation failed: Found 2 error(s)",
  "errors": [
    {
      "field": "tgl_periksa",
      "message": "tgl_periksa must be in YYYY-MM-DD format"
    },
    {
      "field": "pemeriksaan[0].hasil",
      "message": "hasil is required and cannot be empty"
    }
  ],
  "payload": []
}
```

### 404 Not Found (Noorder Not Found)

```json
{
  "success": false,
  "message": "No lab request found for noorder: PK202512220119",
  "payload": []
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Database error: ...",
  "payload": []
}
```

## 📌 Important Notes

1. **Authentication Required:** Semua request harus menyertakan JWT token di header `Authorization`
2. **Date Format:** `tgl_periksa` harus dalam format `YYYY-MM-DD` (contoh: `2025-11-01`)
3. **Time Format:** `jam_periksa` harus dalam format `HH:mm:ss` (contoh: `16:00:38`)
4. **Kode Pemeriksaan:** Harus sesuai dengan `id_template` yang ada di tabel `template_laboratorium`, bukan kode/nama pemeriksaan dari LIS
5. **Kode Dokter:** `dokter_pj` dan `dokter_perujuk` harus valid di database
6. **Kode Petugas:** `petugas` harus valid NIP di database
7. **Pemeriksaan Array:** Minimal harus ada 1 item pemeriksaan
8. **Transaction:** Semua data akan disimpan dalam transaction, jika ada error semua akan di-rollback

## 🔍 Validation Rules

- `noorder`: Required, tidak boleh kosong
- `dokter_pj`: Required, tidak boleh kosong
- `petugas`: Required, tidak boleh kosong
- `dokter_perujuk`: Required, tidak boleh kosong
- `tgl_periksa`: Required, format YYYY-MM-DD
- `jam_periksa`: Required, format HH:mm:ss
- `pemeriksaan`: Required, array tidak boleh kosong
- `pemeriksaan[].kode_pemeriksaan`: Required, tidak boleh kosong, harus berisi `template_laboratorium.id_template`
- `pemeriksaan[].hasil`: Required, tidak boleh kosong
- `pemeriksaan[].nilai_rujukan`: Optional
- `pemeriksaan[].keterangan`: Optional
- `kesan`: Optional
- `saran`: Optional

## 📚 Related Documentation

- [GET Registration API](./README.md#-pk-patologi-klinis-endpoints)
- [GET Lab Results API](./README.md#-pk-patologi-klinis-endpoints)
- [Authentication Guide](../../../../AUTHENTICATION_GUIDE.md)


