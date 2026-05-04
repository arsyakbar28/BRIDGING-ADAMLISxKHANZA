# Dokumentasi API Bridging PA (Patologi Anatomi)

Dokumentasi ini menjelaskan cara menggunakan API **Patologi Anatomi (PA)** untuk mengambil data registrasi/order pasien dan mengirim hasil pemeriksaan PA dari LIS ke SIMRS/KHANZA.

API ini menggunakan format JSON dan membutuhkan token JWT untuk semua endpoint PA.

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

### Prefix Endpoint PA

```text
/adam-lis/bridging/pa
```

### Authentication

Semua endpoint PA wajib menggunakan header:

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

# 2. GET Registrasi Pasien PA

Endpoint ini digunakan oleh LIS/vendor untuk mengambil data order/registrasi PA dari SIMRS/KHANZA.

## Endpoint

```http
GET /adam-lis/bridging/pa/:limit/:noorder
```

## Parameter URL

| Parameter | Wajib | Keterangan |
|---|---:|---|
| `limit` | Ya | Jumlah maksimal data yang ingin ditampilkan. Nilai 1 sampai 10. |
| `noorder` | Ya | Nomor order PA. Bisa nomor lengkap atau sebagian nomor order. |

## Contoh Request

```bash
curl -X GET "http://localhost:5005/adam-lis/bridging/pa/1/PA202605040001" \
  -H "Authorization: Bearer TOKEN_ANDA"
```

## Contoh Response Sukses

```json
{
  "success": true,
  "message": "Registrasi Pasien - Patologi Anatomi berhasil ditampilkan",
  "payload": [
    {
      "registrasi": {
        "no_reg_rs": "PA202605040001",
        "diagnosa_awal": "-",
        "keterangan_klinis": "-",
        "organ": "no field",
        "lokalisasi": "Lokasi Pengaambilan jaringan",
        "bahan": "no field",
        "jenis_registrasi": "reguler",
        "kode_rs": "N02"
      },
      "pasien": {
        "no_rm": "001159",
        "nama": "An. ARSY MEIRA SALSABILA",
        "tanggal_lahir": "2022-05-05",
        "jenis_identitas": "KTP",
        "no_identitas": "3516010111210004",
        "jenis_kelamin": "P",
        "no_telphone": "087782076526",
        "alamat": "DSN LOSARI RT 001 RW 001",
        "m_provinsi_id": "JAWA TIMUR",
        "m_kabupaten_id": "KABUPATEN MOJOKERTO",
        "m_kecamatan_id": "JATIREJO"
      },
      "dokter_pengirim": {
        "kode": "D019",
        "nama": "dr. Henny Sugiharto, Sp.OG"
      },
      "unit_asal": {
        "kode": "U0002",
        "nama": "POLIKLINIK DALAM"
      },
      "penjamin": {
        "kode": "UMU",
        "nama": "BAYAR UMUM"
      },
      "icdt": {
        "kode": "-"
      },
      "tindakan": {
        "kode_tindakan": "J000125",
        "nama_tindakan": "INI COBA PA"
      }
    }
  ]
}
```

## Penjelasan Field Response GET

### Object `registrasi`

| Field | Keterangan | Sumber Data SIMRS/KHANZA |
|---|---|---|
| `no_reg_rs` | Nomor order PA dari rumah sakit | `permintaan_labpa.noorder` |
| `diagnosa_awal` | Diagnosa awal/klinis | `permintaan_labpa.diagnosa_klinis` |
| `keterangan_klinis` | Keterangan klinis tambahan | `permintaan_labpa.informasi_tambahan` |
| `organ` | Belum tersedia field khusus di KHANZA | Diisi `"no field"` |
| `lokalisasi` | Lokasi jaringan/pengambilan | `permintaan_labpa.lokasi_jaringan` |
| `bahan` | Belum tersedia field khusus di KHANZA | Diisi `"no field"` |
| `jenis_registrasi` | Jenis order | Default `reguler` |
| `kode_rs` | Kode rumah sakit | Default `N02` atau konfigurasi server |

### Object `pasien`

| Field | Keterangan |
|---|---|
| `no_rm` | Nomor rekam medis pasien |
| `nama` | Nama pasien |
| `tanggal_lahir` | Tanggal lahir format `YYYY-MM-DD` |
| `jenis_identitas` | `KTP` jika NIK tersedia, jika tidak `Lainnya` |
| `no_identitas` | Nomor identitas/NIK |
| `jenis_kelamin` | `L` = laki-laki, `P` = perempuan |
| `no_telphone` | Nomor telepon pasien |
| `alamat` | Alamat pasien |
| `m_provinsi_id` | Nama provinsi |
| `m_kabupaten_id` | Nama kabupaten/kota |
| `m_kecamatan_id` | Nama kecamatan |

### Object lain

| Object | Keterangan |
|---|---|
| `dokter_pengirim` | Kode dan nama dokter pengirim/perujuk |
| `unit_asal` | Poli/bangsal asal pasien |
| `penjamin` | Penjamin/asuransi pasien |
| `icdt` | Kode diagnosa ICD, jika tersedia |
| `tindakan` | Kode dan nama tindakan PA yang diminta |

## Response Jika Data Tidak Ditemukan

```json
{
  "success": false,
  "message": "No registration data found for: PA202605040001",
  "payload": []
}
```

---

# 3. POST Hasil Pemeriksaan PA

Endpoint ini digunakan oleh LIS/vendor untuk mengirim hasil pemeriksaan PA ke SIMRS/KHANZA.

Berbeda dengan PK/MB, hasil PA **tidak menggunakan array pemeriksaan** dan **tidak menggunakan kode template pemeriksaan**. Hasil PA berbentuk naratif/free text.

## Endpoint

```http
POST /adam-lis/bridging/pa
```

## Contoh Request

```bash
curl -X POST "http://localhost:5005/adam-lis/bridging/pa" \
  -H "Authorization: Bearer TOKEN_ANDA" \
  -H "Content-Type: application/json" \
  -d '{
    "noorder": "PA202605040001",
    "dokter_pj": "D019",
    "petugas": "TPP003",
    "dokter_perujuk": "D019",
    "tgl_periksa": "2026-05-04",
    "jam_periksa": "21:00:00",
    "hasil_pa": {
      "diagnosa_klinik": "Tumor mammae sinistra",
      "makroskopik": "Diterima jaringan mammae ukuran 2x1x1 cm, warna putih kecoklatan, konsistensi kenyal.",
      "mikroskopik": "Tampak jaringan dengan proliferasi sel epitel dan stroma fibrotik. Tidak tampak tanda keganasan.",
      "kesimpulan": "Fibroadenoma mammae",
      "kesan": "Tumor jinak mammae"
    },
    "saran": "Kontrol berkala sesuai advis dokter."
  }'
```

## Body JSON

| Field | Wajib | Format | Keterangan |
|---|---:|---|---|
| `noorder` | Ya | String | Nomor order PA dari rumah sakit. Contoh: `PA202605040001` |
| `dokter_pj` | Ya | String | Kode dokter penanggung jawab hasil. Harus ada di master dokter KHANZA. |
| `petugas` | Ya | String | Kode/NIP petugas laboratorium. Harus ada di master petugas KHANZA. |
| `dokter_perujuk` | Ya | String | Kode dokter pengirim/perujuk. Harus ada di master dokter KHANZA. |
| `tgl_periksa` | Ya | `YYYY-MM-DD` | Tanggal hasil pemeriksaan. |
| `jam_periksa` | Ya | `HH:mm:ss` | Jam hasil pemeriksaan. |
| `hasil_pa` | Ya | Object | Object hasil pemeriksaan PA. |
| `saran` | Tidak | String | Saran/tindak lanjut. Opsional. |
| `kesan` | Tidak | String | Kesan umum. Jika kosong, sistem memakai `hasil_pa.kesan`. |

### Object `hasil_pa`

| Field | Wajib | Maksimal Panjang DB | Keterangan |
|---|---:|---:|---|
| `diagnosa_klinik` | Tidak* | 50 karakter | Diagnosa klinik. |
| `makroskopik` | Tidak* | 1024 karakter | Hasil makroskopik. |
| `mikroskopik` | Tidak* | 1024 karakter | Hasil mikroskopik. |
| `kesimpulan` | Tidak* | 300 karakter | Kesimpulan hasil PA. |
| `kesan` | Tidak* | 300 karakter | Kesan hasil PA. |

Keterangan:

`*` Minimal salah satu field di dalam `hasil_pa` harus diisi.

Jika teks melebihi panjang maksimal kolom DB, sistem akan memotong teks sesuai batas kolom agar tidak gagal insert.

## Contoh Response Sukses

```json
{
  "success": true,
  "message": "PA lab results posted successfully for noorder: PA202605040001",
  "summary": {
    "noorder": "PA202605040001",
    "no_rawat": "2026/05/04/000001",
    "total_tindakan": 1,
    "tgl_periksa": "2026-05-04",
    "jam_periksa": "21:00:00"
  },
  "biaya_periksa": {
    "total": 100000,
    "mata_uang": "IDR",
    "formatted": "Rp 100.000"
  },
  "payload": [
    {
      "kode_jenis_perawatan": "J000125",
      "nama_perawatan": "INI COBA PA",
      "dokter_pj": "D019",
      "petugas": "TPP003",
      "dokter_perujuk": "D019",
      "tgl_periksa": "2026-05-04",
      "jam_periksa": "21:00:00",
      "no_rawat": "2026/05/04/000001",
      "hasil_pa": {
        "diagnosa_klinik": "Tumor mammae sinistra",
        "makroskopik": "Diterima jaringan mammae ukuran 2x1x1 cm, warna putih kecoklatan, konsistensi kenyal.",
        "mikroskopik": "Tampak jaringan dengan proliferasi sel epitel dan stroma fibrotik. Tidak tampak tanda keganasan.",
        "kesimpulan": "Fibroadenoma mammae",
        "kesan": "Tumor jinak mammae"
      }
    }
  ],
  "saran_kesan": {
    "kesan": "Tumor jinak mammae",
    "saran": "Kontrol berkala sesuai advis dokter."
  }
}
```

## Response Gagal Validasi

Contoh jika field wajib tidak dikirim:

```json
{
  "success": false,
  "message": "Required fields: noorder, dokter_pj, petugas, dokter_perujuk, tgl_periksa, jam_periksa, hasil_pa",
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
  "message": "No PA lab request found for noorder: PA202605040001",
  "payload": []
}
```

---

# 4. Alias Field yang Didukung

Untuk memudahkan integrasi dengan vendor LIS, endpoint POST PA juga mendukung beberapa nama field alternatif.

| Field Alternatif | Akan Dianggap Sebagai |
|---|---|
| `no_reg_rs` | `noorder` |
| `no_registrasi` | `noorder` |
| `hasil` | `hasil_pa` |
| `kode_dokter` | `dokter_pj` dan `dokter_perujuk` jika belum dikirim |
| `dokter_pengirim.kode` | `dokter_pj` dan `dokter_perujuk` jika belum dikirim |
| `kode_pegawai` | `petugas` |
| `waktu_selesai` | Dipecah menjadi `tgl_periksa` dan `jam_periksa` |

## Contoh Request Dengan Format Alternatif Vendor

```json
{
  "no_reg_rs": "PA202605040001",
  "kode_dokter": "D019",
  "kode_pegawai": "TPP003",
  "waktu_selesai": "2026-05-04 21:00:00",
  "hasil": {
    "diagnosa_klinik": "Tumor mammae sinistra",
    "makroskopik": "Diterima jaringan mammae ukuran 2x1x1 cm.",
    "mikroskopik": "Tampak jaringan dengan proliferasi sel epitel.",
    "kesimpulan": "Fibroadenoma mammae",
    "kesan": "Tumor jinak mammae"
  },
  "saran": "Kontrol berkala."
}
```

---

# 5. Proses Penyimpanan ke Database KHANZA

Saat POST berhasil, sistem akan menyimpan/mengubah data berikut:

## Tabel `periksa_lab`

Digunakan sebagai header pemeriksaan laboratorium.

| Kolom | Isi |
|---|---|
| `no_rawat` | Diambil dari `permintaan_labpa.no_rawat` |
| `nip` | Dari request `petugas` |
| `kd_jenis_prw` | Diambil dari `permintaan_pemeriksaan_labpa.kd_jenis_prw` |
| `tgl_periksa` | Dari request `tgl_periksa` |
| `jam` | Dari request `jam_periksa` |
| `dokter_perujuk` | Dari request `dokter_perujuk` |
| `kd_dokter` | Dari request `dokter_pj` |
| `biaya` | Dari master `jns_perawatan_lab.total_byr` |
| `status` | `Ralan` atau `Ranap`, mengikuti status order |
| `kategori` | Selalu `PA` |

## Tabel `detail_periksa_labpa`

Digunakan untuk menyimpan hasil naratif PA.

| Kolom | Isi |
|---|---|
| `diagnosa_klinik` | `hasil_pa.diagnosa_klinik` |
| `makroskopik` | `hasil_pa.makroskopik` |
| `mikroskopik` | `hasil_pa.mikroskopik` |
| `kesimpulan` | `hasil_pa.kesimpulan` |
| `kesan` | `hasil_pa.kesan` |

## Tabel `permintaan_labpa`

Order PA akan di-update:

| Kolom | Isi |
|---|---|
| `tgl_hasil` | Dari request `tgl_periksa` |
| `jam_hasil` | Dari request `jam_periksa` |

## Tabel `saran_kesan_lab`

Jika ada `saran` atau `kesan`, sistem juga menyimpan ke tabel ini.

---

# 6. Catatan Penting untuk Tim IT RS dan Vendor

1. **Nomor order wajib sudah ada di KHANZA**  
   Vendor tidak membuat order baru melalui POST hasil. Order harus dibuat dulu dari SIMRS/KHANZA.

2. **Kode dokter wajib sesuai master KHANZA**  
   Field `dokter_pj` dan `dokter_perujuk` harus ada di tabel master dokter.

3. **Kode petugas wajib sesuai master KHANZA**  
   Field `petugas` harus ada di tabel master petugas.

4. **PA tidak menggunakan kode pemeriksaan/template**  
   Jangan kirim format PK seperti `pemeriksaan[]`. PA memakai `hasil_pa`.

5. **Format tanggal dan jam harus benar**
   - Tanggal: `YYYY-MM-DD`
   - Jam: `HH:mm:ss`

6. **POST dengan no_rawat + tanggal + jam yang sama akan mengganti data lama**  
   Sistem menghapus data PA lama pada kombinasi `no_rawat`, `tgl_periksa`, dan `jam_periksa` yang sama sebelum insert ulang. Ini berguna untuk revisi hasil.

7. **Kategori tindakan harus PA**  
   Tindakan yang terhubung ke order PA harus punya kategori `PA` di master `jns_perawatan_lab`.

---

# 7. Ringkasan Cepat

## Ambil Order PA

```http
GET /adam-lis/bridging/pa/1/PA202605040001
```

## Kirim Hasil PA

```http
POST /adam-lis/bridging/pa
```

Body minimal:

```json
{
  "noorder": "PA202605040001",
  "dokter_pj": "D019",
  "petugas": "TPP003",
  "dokter_perujuk": "D019",
  "tgl_periksa": "2026-05-04",
  "jam_periksa": "21:00:00",
  "hasil_pa": {
    "diagnosa_klinik": "Tumor mammae sinistra",
    "makroskopik": "Diterima jaringan...",
    "mikroskopik": "Tampak jaringan...",
    "kesimpulan": "Fibroadenoma mammae",
    "kesan": "Tumor jinak mammae"
  }
}
```
