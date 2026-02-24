# Struktur DB (adhyaksa_db) & Implementasi PA / MB

Dokumen ini berdasarkan **inspeksi langsung** ke database `adhyaksa_db` (host: 103.164.212.138). File hasil inspeksi lengkap: **`DB_SCHEMA_INSPECTED.md`** (root project).

---

## 1. Ringkasan struktur per modul

| Modul | Tabel permintaan (registration) | Tabel detail permintaan | Tabel periksa (hasil) | Tabel detail hasil |
|-------|---------------------------------|--------------------------|------------------------|---------------------|
| **PK** | `permintaan_lab` | `permintaan_detail_permintaan_lab` | `periksa_lab` (kategori='PK') | `detail_periksa_lab` |
| **PA** | `permintaan_labpa` | *(cek: mungkin sama atau ada tabel lain)* | `periksa_lab` (kategori='PA') | `detail_periksa_labpa` |
| **MB** | `permintaan_labmb` | `permintaan_detail_permintaan_labmb` | `periksa_lab` (kategori='MB') | `detail_periksa_lab` (shared dengan PK) |

---

## 2. Tabel yang diinspeksi

### 2.1 Permintaan (registration)

- **permintaan_lab**  
  - Dipakai untuk **PK** saja.  
  - Kolom: noorder, no_rawat, tgl_permintaan, jam_permintaan, tgl_sampel, jam_sampel, tgl_hasil, jam_hasil, dokter_perujuk, status, informasi_tambahan, diagnosa_klinis.  
  - **Tidak ada kolom kategori.**  
  - Row count: 1138. Semua noorder prefix **PK**.

- **permintaan_labpa**  
  - Dipakai untuk **PA**.  
  - Kolom sama seperti `permintaan_lab` **ditambah**: pengambilan_bahan, diperoleh_dengan, lokasi_jaringan, diawetkan_dengan, pernah_dilakukan_di, tanggal_pa_sebelumnya, nomor_pa_sebelumnya, diagnosa_pa_sebelumnya.  
  - Row count: 2.

- **permintaan_labmb**  
  - Dipakai untuk **MB**.  
  - Kolom sama seperti `permintaan_lab` (tanpa kolom tambahan seperti PA).  
  - Row count: 0.

### 2.2 Detail permintaan (template yang dipesan)

- **permintaan_detail_permintaan_lab**  
  - noorder, kd_jenis_prw, id_template, stts_bayar.  
  - Dipakai untuk **PK**.  
  - Row count: 12677.

- **permintaan_detail_permintaan_labmb**  
  - Struktur sama.  
  - Row count: 0.

*(Untuk PA: di list tabel ada permintaan_labpa; perlu konfirmasi apakah ada `permintaan_detail_permintaan_labpa` atau PA pakai tabel lain untuk detail permintaan.)*

### 2.3 Hasil periksa (header)

- **periksa_lab** (satu tabel untuk semua)  
  - Kolom: no_rawat, nip, kd_jenis_prw, tgl_periksa, jam, dokter_perujuk, bagian_rs, bhp, tarif_*, kso, menejemen, biaya, kd_dokter, status, **kategori** enum('PA','PK','MB').  
  - Distinct kategori di data: **PK, PA** (MB belum ada data).  
  - Row count: 2052.

### 2.4 Detail hasil periksa

- **detail_periksa_lab**  
  - Format: no_rawat, kd_jenis_prw, tgl_periksa, jam, **id_template**, **nilai**, nilai_rujukan, keterangan, bagian_rs, bhp, bagian_*, kso, menejemen, biaya_item.  
  - Dipakai untuk **PK** (dan kemungkinan **MB**).  
  - Row count: 13558.

- **detail_periksa_labpa**  
  - Format **berbeda**: no_rawat, kd_jenis_prw, tgl_periksa, jam, **diagnosa_klinik**, **makroskopik**, **mikroskopik**, **kesimpulan**, **kesan**.  
  - Tidak ada id_template/nilai/nilai_rujukan per item seperti PK.  
  - Row count: 1.  
  - Jadi **PA punya format hasil sendiri** (naratif makro/mikro/kesimpulan/kesan), bukan list pemeriksaan + nilai seperti PK.

### 2.5 Lain-lain (shared)

- **saran_kesan_lab**: no_rawat, tgl_periksa, jam, saran, kesan. Dipakai bersama.
- **template_laboratorium**: dipakai bersama (link via kd_jenis_prw).
- **jns_perawatan_lab**: punya kolom **kategori** enum('PK','PA','MB').  
  - Summary: **PK 523**, **PA 34**, **MB 9**.

---

## 3. Kesimpulan untuk implementasi

### 3.1 PK (sudah jalan)

- GET registration: `permintaan_lab` + `permintaan_detail_permintaan_lab` (selected template) + join pasien, dokter, poli, dll.
- GET lab results: `periksa_lab` (kategori='PK') + `detail_periksa_lab`.
- POST lab results: insert/update `periksa_lab` (kategori PK), `detail_periksa_lab`, `permintaan_lab`, `saran_kesan_lab`.

### 3.2 PA (perlu beda logic)

- **GET registration**  
  - Sumber: **permintaan_labpa** (bukan permintaan_lab).  
  - Join: reg_periksa, pasien, dokter, poliklinik, penjab, kamar_inap, bangsal, dll. (sama seperti PK).  
  - Daftar pemeriksaan: perlu konfirmasi apakah ada `permintaan_detail_permintaan_labpa` atau pakai tabel lain; jika tidak ada, bisa pakai logic mirip “selected template” dari tabel yang dipakai SIMRS untuk PA.

- **GET lab results**  
  - Header: `periksa_lab` dengan **kategori = 'PA'**.  
  - Detail: **detail_periksa_labpa** (makroskopik, mikroskopik, kesimpulan, kesan), **bukan** detail_periksa_lab.  
  - Response format harus menyesuaikan struktur ini (tidak per-item id_template/nilai seperti PK).

- **POST lab results**  
  - Insert **periksa_lab** dengan **kategori = 'PA'**.  
  - Insert **detail_periksa_labpa** (diagnosa_klinik, makroskopik, mikroskopik, kesimpulan, kesan).  
  - Request body PA akan beda dari PK: kemungkinan tidak array pemeriksaan (kode_pemeriksaan + hasil), tapi field naratif (makroskopik, mikroskopik, kesimpulan, kesan).  
  - Update **permintaan_labpa** (tgl_hasil, jam_hasil).  
  - Saran/kesan: tetap pakai **saran_kesan_lab** jika dipakai untuk PA di SIMRS.

### 3.3 MB (mirip PK, beda sumber permintaan)

- **GET registration**  
  - Sumber: **permintaan_labmb** + **permintaan_detail_permintaan_labmb** (bukan permintaan_lab).  
  - Join sama seperti PK (reg_periksa, pasien, dokter, poli, dll.).

- **GET lab results**  
  - Header: `periksa_lab` dengan **kategori = 'MB'**.  
  - Detail: pakai **detail_periksa_lab** (struktur sama dengan PK: id_template, nilai, nilai_rujukan, keterangan).  
  - Bisa reuse logic PK, hanya ganti kategori dan sumber noorder.

- **POST lab results**  
  - Sama seperti PK: insert **periksa_lab** (kategori='MB'), **detail_periksa_lab**, update **permintaan_labmb** (tgl_hasil, jam_hasil), **saran_kesan_lab**.  
  - Request/response body bisa sama dengan PK (array pemeriksaan dengan kode_pemeriksaan, hasil, nilai_rujukan, keterangan).

---

## 4. Rencana implementasi

### 4.1 MB (lebih sederhana, mirip PK)

1. **Repository**  
   - **patient-mb.repository.js**: query **permintaan_labmb** + **permintaan_detail_permintaan_labmb**; selected template dari sini. Join tabel lain sama seperti patient-pk tapi dari permintaan_labmb.  
   - **lab-mb.repository.js**: copy lab-pk, ganti semua filter **kategori = 'PK'** → **kategori = 'MB'**; tetap pakai **detail_periksa_lab**.  
   - **post-lab-mb.repository.js**:  
     - getLabRequestInfo: ambil no_rawat dari **permintaan_labmb** (WHERE noorder = ?).  
     - updatePermintaanLab: **UPDATE permintaan_labmb** SET tgl_hasil, jam_hasil WHERE noorder = ?.  
     - Insert tetap: periksa_lab (kategori='MB'), detail_periksa_lab, saran_kesan_lab.  
     - Delete old: tetap per no_rawat + tgl_periksa + jam di periksa_lab + detail_periksa_lab + saran_kesan_lab.

2. **Service / Controller / Validator**  
   - Bisa clone dari PK, ganti panggilan ke repository MB dan pastikan **kategori 'MB'** dipakai di insert.

3. **Routes**  
   - GET .../mb/:limit/:noorder  
   - GET .../lab-results-mb/:limit/:noorder  
   - POST .../mb  

4. **Mount**  
   - Mount router MB di `/adam-lis/bridging/mb` dan tambah route lab-results-mb jika design menghendaki.

### 4.2 PA (format hasil beda)

1. **GET registration**  
   - Repository: query **permintaan_labpa**, join reg_periksa, pasien, dokter, poli, dll.  
   - Daftar pemeriksaan: cek di SIMRS apakah ada tabel detail permintaan PA (mis. permintaan_detail_permintaan_labpa); jika ada, pakai untuk “template terpilih”.

2. **GET lab results**  
   - Repository:  
     - Header dari **periksa_lab** WHERE kategori = 'PA'.  
     - Detail dari **detail_periksa_labpa** (makroskopik, mikroskopik, kesimpulan, kesan).  
   - Response format: sesuaikan dengan struktur detail_periksa_labpa (bukan array item dengan id_template/nilai).

3. **POST lab results**  
   - Repository:  
     - Insert **periksa_lab** (kategori='PA').  
     - Insert **detail_periksa_labpa** (diagnosa_klinik, makroskopik, mikroskopik, kesimpulan, kesan).  
     - Update **permintaan_labpa** (tgl_hasil, jam_hasil).  
     - Saran/kesan: pakai saran_kesan_lab jika memang dipakai untuk PA.  
   - Validator & request body: definisikan format khusus PA (field naratif, bukan array pemeriksaan seperti PK).

4. **Routes**  
   - GET .../pa/:limit/:noorder  
   - GET .../lab-results-pa/:limit/:noorder  
   - POST .../pa  

---

## 5. Hal yang perlu dikonfirmasi

1. **PA – detail permintaan**  
   Apakah ada tabel `permintaan_detail_permintaan_labpa` atau PA memakai tabel lain untuk “pemeriksaan yang dipesan” per noorder? Jika ada, tambahkan ke script inspeksi dan sesuaikan GET registration PA.

2. **PA – satu vs banyak detail hasil**  
   `detail_periksa_labpa` saat ini seperti “satu baris per (no_rawat, kd_jenis_prw, tgl, jam)” dengan makro/mikro/kesimpulan/kesan. Konfirmasi: satu permintaan PA = satu baris detail_periksa_labpa atau bisa banyak (per kd_jenis_prw)?

3. **MB – detail permintaan**  
   Sudah ada **permintaan_detail_permintaan_labmb** (struktur sama dengan PK). GET registration MB cukup pakai permintaan_labmb + permintaan_detail_permintaan_labmb.

4. **Prefix noorder**  
   Asumsi: PK → prefix PK, PA → prefix PA, MB → prefix MB. Jika konvensi lain, sesuaikan validasi atau routing.

---

## 6. Cara cek ulang struktur DB

Jalankan:

```bash
node scripts/inspect-db-schema.js
```

Hasil ditulis ke **`DB_SCHEMA_INSPECTED.md`**.  
Pastikan `.env` berisi:

- DB_HOST=103.164.212.138  
- DB_PORT=3306  
- DB_NAME=adhyaksa_db  
- DB_USER=adhyaksa  
- DB_PASSWORD=...

---

## 7. Referensi file

- Hasil inspeksi: **`DB_SCHEMA_INSPECTED.md`**  
- Analisis modul: **`api/bridging/docs/PA_MB_ANALYSIS.md`**  
- Script inspeksi: **`scripts/inspect-db-schema.js`**
