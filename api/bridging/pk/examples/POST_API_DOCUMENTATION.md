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
| `noorder` | string | Nomor order lab | `"PK202511010004"` |
| `dokter_pj` | string | Kode dokter penanggung jawab | `"D029"` |
| `petugas` | string | Kode petugas/NIP | `"LAB007"` |
| `dokter_perujuk` | string | Kode dokter perujuk | `"D018"` |
| `tgl_periksa` | string | Tanggal pemeriksaan (YYYY-MM-DD) | `"2025-11-01"` |
| `jam_periksa` | string | Jam pemeriksaan (HH:mm:ss) | `"16:00:38"` |
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
| `kode_pemeriksaan` | string/number | ✅ Yes | ID template pemeriksaan | `"1001"` atau `1001` |
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
    "noorder": "PK202511010004",
    "dokter_pj": "D029",
    "petugas": "LAB007",
    "dokter_perujuk": "D018",
    "tgl_periksa": "2025-11-01",
    "jam_periksa": "16:00:38",
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
    "kesan": "Hasil pemeriksaan dalam batas normal",
    "saran": "Lanjutkan pengobatan sesuai anjuran dokter"
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
    noorder: "PK202511010004",
    dokter_pj: "D029",
    petugas: "LAB007",
    dokter_perujuk: "D018",
    tgl_periksa: "2025-11-01",
    jam_periksa: "16:00:38",
    pemeriksaan: [
      {
        kode_pemeriksaan: "1001",
        hasil: "120",
        nilai_rujukan: "70-100",
        keterangan: "Normal"
      },
      {
        kode_pemeriksaan: "1002",
        hasil: "5.5",
        nilai_rujukan: "3.5-5.5",
        keterangan: "Normal"
      }
    ],
    kesan: "Hasil pemeriksaan dalam batas normal",
    saran: "Lanjutkan pengobatan sesuai anjuran dokter"
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
  "message": "Lab results posted successfully for noorder: PK202511010004",
  "payload": [
    {
      "noorder": "PK202511010004",
      "no_rawat": "2025/11/01/0001",
      "tgl_periksa": "2025-11-01",
      "jam_periksa": "16:00:38",
      "inserted_periksa": 2,
      "inserted_detail": 2,
      "status": "updated"
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
  "message": "No lab request found for noorder: PK202511010004",
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
4. **Kode Pemeriksaan:** Harus sesuai dengan `id_template` yang ada di tabel `template_laboratorium`
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
- `pemeriksaan[].kode_pemeriksaan`: Required, tidak boleh kosong
- `pemeriksaan[].hasil`: Required, tidak boleh kosong
- `pemeriksaan[].nilai_rujukan`: Optional
- `pemeriksaan[].keterangan`: Optional
- `kesan`: Optional
- `saran`: Optional

## 📚 Related Documentation

- [GET Registration API](./README.md#-pk-patologi-klinis-endpoints)
- [GET Lab Results API](./README.md#-pk-patologi-klinis-endpoints)
- [Authentication Guide](../../../../AUTHENTICATION_GUIDE.md)


