# Dokumentasi API Bridging MB (Mikrobiologi)

Dokumentasi ini menjelaskan cara menggunakan API **Mikrobiologi (MB)** untuk mengambil data registrasi/order pasien dan mengirim hasil pemeriksaan MB dari LIS ke SIMRS/KHANZA.

API MB dibuat mengikuti flow **PK (Patologi Klinis)** karena struktur datanya sama-sama berbasis item pemeriksaan/template.

---

## 1. Informasi Umum

### Base URL

```text
http://SERVER:PORT
```

Contoh lokal:

```text
http://localhost:5005
```

### Prefix Endpoint MB

```text
/adam-lis/bridging/mb
```

### Authentication

Semua endpoint MB wajib menggunakan header:

```http
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

Token didapat dari endpoint login:

```http
POST /api/auth/login
```

Contoh login:

```bash
curl -X POST "http://localhost:5005/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "PASSWORD_ANDA"
  }'
```

Response login akan mengembalikan token di:

```json
payload.token
```

---

# 2. GET Registrasi Pasien MB

Endpoint ini digunakan oleh LIS/vendor untuk mengambil data order/registrasi MB dari SIMRS/KHANZA.

## Endpoint

```http
GET /adam-lis/bridging/mb/:limit/:noorder
```

## Parameter URL

| Parameter | Wajib | Keterangan |
|---|---:|---|
| `limit` | Ya | Jumlah maksimal data yang ingin ditampilkan. Nilai 1 sampai 10. |
| `noorder` | Ya | Nomor order MB. Bisa nomor lengkap atau sebagian nomor order. |

## Contoh Request

```bash
curl -X GET "http://localhost:5005/adam-lis/bridging/mb/1/MB202605040001" \
  -H "Authorization: Bearer TOKEN_ANDA"
```

## Contoh Response Sukses

```json
{
  "success": true,
  "message": "Found 1 registration records for search: MB202605040001",
  "payload": [
    {
      "no_registrasi": "MB202605040001",
      "waktu_registrasi": "2026-05-04 20:13:10",
      "diagnosa_awal": "-",
      "keterangan_klinis": "-",
      "kodeRS": "N02",
      "pasien": {
        "no_rm": "001159",
        "nama": "An. ARSY MEIRA SALSABILA",
        "jenis_kelamin": "P",
        "alamat": "DSN LOSARI RT 001 RW 001",
        "tanggal_lahir": "2022-05-05",
        "no_telphone": "087782076526",
        "nik": "3516010111210004",
        "ras": "Hitam/Putih",
        "berat_badan": "-",
        "jenis_registrasi": "Reguler",
        "m_provinsi_id": "JAWA TIMUR",
        "m_kabupaten_id": "KABUPATEN MOJOKERTO",
        "m_kecamatan_id": "JATIREJO"
      },
      "dokter_pengirim": {
        "nama": "dr. Henny Sugiharto, Sp.OG",
        "kode": "D019"
      },
      "unit_asal": {
        "nama": "POLIKLINIK DALAM",
        "kode": "U0002"
      },
      "pemeriksaan": [
        {
          "nama_pemeriksaan": "Ini Data Coba 2",
          "kode_pemeriksaan": 19519
        },
        {
          "nama_pemeriksaan": "Ini Data COba 1",
          "kode_pemeriksaan": 19520
        }
      ],
      "penjamin": {
        "nama": "BAYAR UMUM",
        "kode": "UMU"
      },
      "icdt": []
    }
  ]
}
```

## Penjelasan Field Response GET

| Field | Keterangan | Sumber Data SIMRS/KHANZA |
|---|---|---|
| `no_registrasi` | Nomor order MB dari rumah sakit | `permintaan_labmb.noorder` |
| `waktu_registrasi` | Waktu order dibuat | `permintaan_labmb.tgl_permintaan + jam_permintaan` |
| `diagnosa_awal` | Diagnosa klinis | `permintaan_labmb.diagnosa_klinis` |
| `keterangan_klinis` | Informasi tambahan klinis | `permintaan_labmb.informasi_tambahan` |
| `kodeRS` | Kode rumah sakit | `.env KODE_RS` atau default sistem |
| `pasien` | Data pasien | Master pasien + registrasi |
| `dokter_pengirim` | Dokter pengirim/perujuk | Master dokter |
| `unit_asal` | Poli/bangsal asal pasien | Poliklinik/bangsal |
| `pemeriksaan` | Daftar item pemeriksaan yang diminta | `permintaan_detail_permintaan_labmb` + `template_laboratorium` |
| `penjamin` | Penjamin/asuransi pasien | `penjab` |
| `icdt` | Diagnosa ICD jika tersedia | `diagnosa_pasien` |

### Object `pemeriksaan`

Field penting untuk POST hasil MB:

| Field | Keterangan |
|---|---|
| `kode_pemeriksaan` | ID template pemeriksaan. Dikirim kembali saat POST hasil. |
| `nama_pemeriksaan` | Nama item pemeriksaan. |

Contoh:

```json
{
  "nama_pemeriksaan": "Ini Data Coba 2",
  "kode_pemeriksaan": 19519
}
```

## Response Jika Data Tidak Ditemukan

```json
{
  "success": false,
  "message": "No registration data found for: MB202605040001",
  "payload": []
}
```

---

# 3. POST Hasil Pemeriksaan MB

Endpoint ini digunakan oleh LIS/vendor untuk mengirim hasil pemeriksaan Mikrobiologi ke SIMRS/KHANZA.

Format POST MB mengikuti format POST PK, yaitu memakai array `pemeriksaan`.

## Endpoint

```http
POST /adam-lis/bridging/mb
```

## Contoh Request

```bash
curl -X POST "http://localhost:5005/adam-lis/bridging/mb" \
  -H "Authorization: Bearer TOKEN_ANDA" \
  -H "Content-Type: application/json" \
  -d '{
    "noorder": "MB202605040001",
    "dokter_pj": "D019",
    "petugas": "TPP003",
    "dokter_perujuk": "D019",
    "tgl_periksa": "2026-05-04",
    "jam_periksa": "22:00:00",
    "pemeriksaan": [
      {
        "kode_pemeriksaan": 19519,
        "hasil": "Positif",
        "nilai_rujukan": "Negatif",
        "keterangan": "H"
      },
      {
        "kode_pemeriksaan": 19520,
        "hasil": "Escherichia coli",
        "nilai_rujukan": "-",
        "keterangan": ""
      }
    ],
    "kesan": "Ditemukan pertumbuhan bakteri.",
    "saran": "Terapi antibiotik sesuai hasil sensitivitas."
  }'
```

## Body JSON

| Field | Wajib | Format | Keterangan |
|---|---:|---|---|
| `noorder` | Ya | String | Nomor order MB dari rumah sakit. Contoh: `MB202605040001` |
| `dokter_pj` | Ya | String | Kode dokter penanggung jawab hasil. Harus ada di master dokter KHANZA. |
| `petugas` | Ya | String | Kode/NIP petugas laboratorium. Harus ada di master petugas KHANZA. |
| `dokter_perujuk` | Ya | String | Kode dokter pengirim/perujuk. Harus ada di master dokter KHANZA. |
| `tgl_periksa` | Ya | `YYYY-MM-DD` | Tanggal hasil pemeriksaan. |
| `jam_periksa` | Ya | `HH:mm:ss` | Jam hasil pemeriksaan. |
| `pemeriksaan` | Ya | Array | Daftar hasil item pemeriksaan. Minimal 1 item. |
| `kesan` | Tidak | String | Kesan hasil pemeriksaan. Opsional. |
| `saran` | Tidak | String | Saran/tindak lanjut. Opsional. |

### Object `pemeriksaan[]`

| Field | Wajib | Keterangan |
|---|---:|---|
| `kode_pemeriksaan` | Ya | ID template pemeriksaan dari response GET registrasi MB. |
| `hasil` | Ya | Nilai hasil pemeriksaan. Bisa teks atau angka. |
| `nilai_rujukan` | Tidak | Nilai rujukan. Jika tidak ada, bisa isi `"-"` atau kosong. |
| `keterangan` | Tidak | Keterangan abnormal/flag. Contoh: `H`, `L`, `N`, atau kosong. |

Contoh item:

```json
{
  "kode_pemeriksaan": 19519,
  "hasil": "Positif",
  "nilai_rujukan": "Negatif",
  "keterangan": "H"
}
```

## Contoh Response Sukses

```json
{
  "success": true,
  "message": "MB lab results posted successfully for noorder: MB202605040001",
  "summary": {
    "noorder": "MB202605040001",
    "no_rawat": "2026/05/04/000001",
    "total_tindakan": 1,
    "total_pemeriksaan": 2,
    "tgl_periksa": "2026-05-04",
    "jam_periksa": "22:00:00"
  },
  "biaya_periksa": {
    "total": 130000,
    "mata_uang": "IDR",
    "formatted": "Rp 130.000",
    "breakdown": [
      {
        "kode_tindakan": "J000126",
        "nama_tindakan": "INI COBA MB",
        "biaya": 130000
      }
    ]
  },
  "payload": [
    {
      "no_urut": 1,
      "kode_jenis_perawatan": "J000126",
      "nama_perawatan": "INI COBA MB",
      "dokter_pj": "D019",
      "petugas": "TPP003",
      "dokter_perujuk": "D019",
      "tgl_periksa": "2026-05-04",
      "jam_periksa": "22:00:00",
      "no_rawat": "2026/05/04/000001",
      "biaya_tindakan": 130000,
      "detail_pemeriksaan": [
        {
          "kode_pemeriksaan": 19519,
          "nama_pemeriksaan": "Ini Data Coba 2",
          "hasil": "Positif",
          "satuan": "10",
          "nilai_rujukan": "Negatif",
          "keterangan": "H",
          "status": "High"
        },
        {
          "kode_pemeriksaan": 19520,
          "nama_pemeriksaan": "Ini Data COba 1",
          "hasil": "Escherichia coli",
          "satuan": "-",
          "nilai_rujukan": "-",
          "keterangan": "",
          "status": "Normal"
        }
      ]
    }
  ],
  "saran_kesan": {
    "kesan": "Ditemukan pertumbuhan bakteri.",
    "saran": "Terapi antibiotik sesuai hasil sensitivitas."
  }
}
```

## Response Gagal Validasi

Contoh jika field wajib tidak dikirim:

```json
{
  "success": false,
  "message": "Required fields: noorder, pemeriksaan (array), dokter_pj, petugas, dokter_perujuk, tgl_periksa, jam_periksa",
  "payload": []
}
```

Contoh jika kode petugas tidak valid:

```json
{
  "success": false,
  "message": "Kode petugas tidak valid: \"TPP999\". Pastikan kode petugas terdaftar di sistem.",
  "payload": []
}
```

Contoh jika nomor order tidak ditemukan:

```json
{
  "success": false,
  "message": "No lab request found for noorder: MB202605040001",
  "payload": []
}
```

Contoh jika kode pemeriksaan tidak ditemukan:

```json
{
  "success": false,
  "message": "Template not found for 1 kode_pemeriksaan",
  "payload": [
    {
      "noorder": "MB202605040001",
      "missing_templates": [99999]
    }
  ]
}
```

---

# 4. GET Hasil Pemeriksaan MB

Endpoint ini digunakan untuk mengambil kembali hasil MB yang sudah tersimpan di SIMRS/KHANZA.

## Endpoint

```http
GET /adam-lis/bridging/mb/lab-results/:limit/:noorder
```

## Contoh Request

```bash
curl -X GET "http://localhost:5005/adam-lis/bridging/mb/lab-results/1/MB202605040001" \
  -H "Authorization: Bearer TOKEN_ANDA"
```

## Keterangan

Endpoint ini mencari hasil MB berdasarkan `noorder`, lalu membaca data dari:

```text
periksa_lab
detail_periksa_lab
saran_kesan_lab
```

Dengan filter:

```text
kategori = MB
```

---

# 5. Alias Field yang Didukung

Untuk memudahkan integrasi dengan vendor LIS, endpoint POST MB juga mendukung beberapa nama field alternatif.

| Field Alternatif | Akan Dianggap Sebagai |
|---|---|
| `no_registrasi` | `noorder` |
| `dokter_pengirim.kode` | `dokter_pj` dan `dokter_perujuk` jika belum dikirim |
| `kode_pegawai` | `petugas` |
| `waktu_selesai` | Dipecah menjadi `tgl_periksa` dan `jam_periksa` |

Contoh:

```json
{
  "no_registrasi": "MB202605040001",
  "dokter_pengirim": {
    "kode": "D019"
  },
  "kode_pegawai": "TPP003",
  "waktu_selesai": "2026-05-04 22:00:00",
  "pemeriksaan": [
    {
      "kode_pemeriksaan": 19519,
      "hasil": "Positif",
      "nilai_rujukan": "Negatif",
      "keterangan": "H"
    }
  ],
  "kesan": "Ditemukan pertumbuhan bakteri.",
  "saran": "Terapi antibiotik sesuai hasil sensitivitas."
}
```

---

# 6. Proses Penyimpanan ke Database KHANZA

Saat POST berhasil, sistem akan menyimpan/mengubah data berikut:

## Tabel `periksa_lab`

Digunakan sebagai header pemeriksaan laboratorium.

| Kolom | Isi |
|---|---|
| `no_rawat` | Diambil dari `permintaan_labmb.no_rawat` |
| `nip` | Dari request `petugas` |
| `kd_jenis_prw` | Diambil dari template/tindakan pemeriksaan |
| `tgl_periksa` | Dari request `tgl_periksa` |
| `jam` | Dari request `jam_periksa` |
| `dokter_perujuk` | Dari request `dokter_perujuk` |
| `kd_dokter` | Dari request `dokter_pj` |
| `biaya` | Dari master `jns_perawatan_lab.total_byr` |
| `status` | `Ralan` atau `Ranap`, mengikuti status order MB |
| `kategori` | Selalu `MB` |

## Tabel `detail_periksa_lab`

Digunakan untuk menyimpan hasil item pemeriksaan MB.

| Kolom | Isi |
|---|---|
| `id_template` | Dari `pemeriksaan[].kode_pemeriksaan` |
| `nilai` | Dari `pemeriksaan[].hasil` |
| `nilai_rujukan` | Dari `pemeriksaan[].nilai_rujukan` |
| `keterangan` | Dari `pemeriksaan[].keterangan` |

## Tabel `permintaan_labmb`

Order MB akan di-update:

| Kolom | Isi |
|---|---|
| `tgl_hasil` | Dari request `tgl_periksa` |
| `jam_hasil` | Dari request `jam_periksa` |

## Tabel `saran_kesan_lab`

Jika ada `kesan` atau `saran`, sistem juga menyimpan ke tabel ini.

---

# 7. Catatan Penting untuk Tim IT RS dan Vendor

1. **Nomor order wajib sudah ada di KHANZA**  
   Vendor tidak membuat order baru melalui POST hasil. Order harus dibuat dulu dari SIMRS/KHANZA.

2. **Kode dokter wajib sesuai master KHANZA**  
   Field `dokter_pj` dan `dokter_perujuk` harus ada di tabel master dokter.

3. **Kode petugas wajib sesuai master KHANZA**  
   Field `petugas` harus ada di tabel master petugas.

4. **Kode pemeriksaan wajib dari GET registrasi MB**  
   Gunakan `kode_pemeriksaan` yang diterima dari endpoint GET registrasi MB. Jangan membuat kode sendiri.

5. **MB memakai format array `pemeriksaan[]`**  
   Berbeda dengan PA. MB sama seperti PK.

6. **Format tanggal dan jam harus benar**
   - Tanggal: `YYYY-MM-DD`
   - Jam: `HH:mm:ss`

7. **POST dengan no_rawat + tanggal + jam yang sama akan mengganti data lama**  
   Sistem menghapus data MB lama pada kombinasi `no_rawat`, `tgl_periksa`, dan `jam_periksa` yang sama sebelum insert ulang. Ini berguna untuk revisi hasil.

8. **Kategori tindakan harus MB**  
   Tindakan/template yang terhubung ke order MB harus punya kategori `MB` di master `jns_perawatan_lab`.

---

# 8. Ringkasan Cepat

## Ambil Order MB

```http
GET /adam-lis/bridging/mb/1/MB202605040001
```

## Kirim Hasil MB

```http
POST /adam-lis/bridging/mb
```

Body minimal:

```json
{
  "noorder": "MB202605040001",
  "dokter_pj": "D019",
  "petugas": "TPP003",
  "dokter_perujuk": "D019",
  "tgl_periksa": "2026-05-04",
  "jam_periksa": "22:00:00",
  "pemeriksaan": [
    {
      "kode_pemeriksaan": 19519,
      "hasil": "Positif",
      "nilai_rujukan": "Negatif",
      "keterangan": "H"
    }
  ]
}
```
