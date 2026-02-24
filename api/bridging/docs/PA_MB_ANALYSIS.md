# Analisis Modul PA & MB – Patologi Anatomi & Mikrobiologi

## Ringkasan

Modul **PK (Patologi Klinis)** sudah selesai. Modul **PA (Patologi Anatomi)** dan **MB (Mikrobiologi)** saat ini hanya punya **placeholder routes** (501 Not Implemented). Dokumen ini memetakan perbedaan dengan PK dan langkah implementasi PA & MB.

---

## Perbandingan Struktur Saat Ini

### PK (Patologi Klinis) – Sudah Lengkap

| Layer        | File | Status |
|-------------|------|--------|
| Routes      | `pk/routes.js` | ✅ 3 endpoints (GET reg, GET lab-results, POST) |
| Controllers | `patient-registration-pk.controller.js`, `lab-results-pk.controller.js`, `post-lab-pk.controller.js` | ✅ |
| Services    | `patient-registration-pk.service.js`, `lab-results-pk.service.js`, `post-lab-pk.service.js` | ✅ |
| Repositories| `patient-pk.repository.js`, `lab-pk.repository.js`, `post-lab-pk.repository.js` | ✅ |
| Validators  | `lab-results-pk.validator.js` | ✅ |

### PA (Patologi Anatomi) – Belum

| Layer        | File | Status |
|-------------|------|--------|
| Routes      | `pa/routes.js` | ⚠️ Hanya placeholder (501) |
| Controllers | - | ❌ Belum ada |
| Services    | - | ❌ Belum ada |
| Repositories| - | ❌ Belum ada |
| Validators  | - | ❌ Belum ada |

### MB (Mikrobiologi) – Belum

| Layer        | File | Status |
|-------------|------|--------|
| Routes      | `mb/routes.js` | ⚠️ Hanya placeholder (501) |
| Controllers | - | ❌ Belum ada |
| Services    | - | ❌ Belum ada |
| Repositories| - | ❌ Belum ada |
| Validators  | - | ❌ Belum ada |

---

## Database – Sama untuk PK, PA, MB

Di SIMRS/Khanza, **tabel yang dipakai PK juga dipakai PA dan MB**. Pembeda hanya kolom **`kategori`** (`'PK'`, `'PA'`, `'MB'`).

### Tabel Bersama

| Tabel | Dipakai untuk | Pembeda |
|-------|----------------|--------|
| `permintaan_lab` | Semua | `noorder` (bisa PA..., MB...) – tidak ada filter kategori di query saat ini |
| `periksa_lab` | Semua | `kategori` = 'PK' / 'PA' / 'MB' |
| `detail_periksa_lab` | Semua | Tidak ada kategori; link via no_rawat + tgl + jam + kd_jenis_prw |
| `saran_kesan_lab` | Semua | Tidak ada kategori |
| `template_laboratorium` | Semua | Link ke `jns_perawatan_lab` (yang punya kategori) |
| `jns_perawatan_lab` | Semua | Kolom `kategori` = 'PK' / 'PA' / 'MB' |
| `dokter`, `petugas` | Semua | Sama |

### Contoh di Kode PK

- **Lab results (GET):**  
  `WHERE pl.kategori = 'PK'` di `lab-pk.repository.js`.
- **Post lab (INSERT):**  
  `kategori: tarifData.kategori || 'PK'` di `post-lab-pk.service.js`.

Untuk PA: ganti `'PK'` → `'PA'`.  
Untuk MB: ganti `'PK'` → `'MB'`.

---

## Perbedaan Bisnis (Asumsi)

| Aspek | PK | PA | MB |
|-------|----|----|-----|
| Prefix noorder | PK... | PA... | MB... |
| Kategori di DB | 'PK' | 'PA' | 'MB' |
| Tabel | Sama | Sama | Sama |
| Flow (GET reg → GET lab → POST) | Sama | Sama | Sama |
| Validasi & format request/response | Sama | Sama (bisa dipakai ulang) | Sama (bisa dipakai ulang) |

Jadi secara teknis, **PA dan MB bisa mengikuti pola PK** dengan hanya mengubah:

- Nilai **kategori** (`'PA'` / `'MB'`).
- Nama modul di route/controller/service/repository (pa/mb).

Tidak perlu tabel baru; yang perlu dipastikan di DB:

- Ada data `jns_perawatan_lab` dengan `kategori = 'PA'` dan `kategori = 'MB'`.
- Ada `template_laboratorium` yang mengacu ke kd_jenis_prw untuk PA/MB.
- `permintaan_lab` bisa dipakai untuk noorder PA... / MB... (biasanya hanya konvensi penomoran).

---

## Endpoint yang Perlu Ada untuk PA & MB

Agar setara dengan PK, setiap modul butuh 3 endpoint:

| Aksi | PK (existing) | PA (target) | MB (target) |
|------|----------------|-------------|-------------|
| GET registration | `GET /adam-lis/bridging/:limit/:noorder` (PK) | `GET /adam-lis/bridging/pa/:limit/:noorder` | `GET /adam-lis/bridging/mb/:limit/:noorder` |
| GET lab results | `GET /adam-lis/bridging/lab-results-pk/:limit/:noorder` | `GET /adam-lis/bridging/lab-results-pa/:limit/:noorder` | `GET /adam-lis/bridging/lab-results-mb/:limit/:noorder` |
| POST lab results | `POST /adam-lis/bridging/` (PK) | `POST /adam-lis/bridging/pa` | `POST /adam-lis/bridging/mb` |

Catatan:

- GET registration saat ini **satu endpoint** untuk semua noorder; bisa tetap begitu (PA/MB noorder tetep lewat sini) atau bisa ditambah route khusus `/pa/...` dan `/mb/...` jika ingin pemisahan jelas.
- GET lab results dan POST **harus** filter/insert per kategori, jadi perlu endpoint atau path terpisah (mis. lab-results-pa, lab-results-mb, dan POST /pa, /mb).

---

## Rencana Implementasi (Step-by-Step)

### Fase 1 – PA (Patologi Anatomi)

1. **Repository (clone PK, ganti kategori)**  
   - `pa/repositories/patient-pa.repository.js`  
     - Copy dari `patient-pk.repository.js`.  
     - Jika nanti ada filter kategori di `permintaan_lab`, tambahkan `WHERE ... AND pl.kategori = 'PA'`; kalau tidak, bisa tetap sama dulu.
   - `pa/repositories/lab-pa.repository.js`  
     - Copy dari `lab-pk.repository.js`, ganti semua `kategori = 'PK'` → `kategori = 'PA'`.
   - `pa/repositories/post-lab-pa.repository.js`  
     - Copy dari `post-lab-pk.repository.js` (tidak perlu ubah query; kategori di-set dari service).

2. **Services**  
   - `pa/services/patient-registration-pa.service.js` – clone dari PK, panggil repo PA.  
   - `pa/services/lab-results-pa.service.js` – clone dari PK, panggil repo PA.  
   - `pa/services/post-lab-pa.service.js` – clone dari PK; di bagian insert `periksa_lab` set **`kategori: 'PA'`** (dan pastikan tarif dari `jns_perawatan_lab` yang kategori PA).

3. **Validators**  
   - `pa/validators/lab-results-pa.validator.js` – copy dari `lab-results-pk.validator.js` (bisa sama persis).

4. **Controllers**  
   - `pa/controllers/patient-registration-pa.controller.js`  
   - `pa/controllers/lab-results-pa.controller.js`  
   - `pa/controllers/post-lab-pa.controller.js`  
   Masing-masing clone dari controller PK, ganti panggilan ke service PA.

5. **Routes**  
   - Di `pa/routes.js`:  
     - `GET /:limit/:noorder` → patient-registration-pa  
     - `GET /lab-results/:limit/:noorder` → lab-results-pa  
     - `POST /` → post-lab-pa  

6. **Mount di main bridging**  
   - Di `api/bridging/routes.js` (atau `app.js`):  
     - Mount `paRouter` di `/adam-lis/bridging/pa` (dan jika mau, tambah route lab-results-pa di level utama, mis. `GET /adam-lis/bridging/lab-results-pa/:limit/:noorder`).

### Fase 2 – MB (Mikrobiologi)

Langkah sama persis seperti PA, tapi:

- Semua file dan referensi **pa** → **mb**.
- Semua **kategori 'PA'** → **kategori 'MB'**.

---

## Checklist Implementasi

### PA

- [ ] `pa/repositories/patient-pa.repository.js` (clone patient-pk, sesuaikan jika perlu filter PA)
- [ ] `pa/repositories/lab-pa.repository.js` (clone lab-pk, `kategori = 'PA'`)
- [ ] `pa/repositories/post-lab-pa.repository.js` (clone post-lab-pk)
- [ ] `pa/services/patient-registration-pa.service.js`
- [ ] `pa/services/lab-results-pa.service.js`
- [ ] `pa/services/post-lab-pa.service.js` (insert dengan `kategori: 'PA'`)
- [ ] `pa/validators/lab-results-pa.validator.js`
- [ ] `pa/controllers/patient-registration-pa.controller.js`
- [ ] `pa/controllers/lab-results-pa.controller.js`
- [ ] `pa/controllers/post-lab-pa.controller.js`
- [ ] `pa/routes.js` (3 route: get reg, get lab-results, post)
- [ ] Mount route PA di main app (`/adam-lis/bridging/pa` dan lab-results-pa jika di level utama)
- [ ] Cek DB: ada `jns_perawatan_lab.kategori = 'PA'` dan template terkait

### MB

- [ ] Semua file mb (repositories, services, validators, controllers) – clone dari PA, ganti PA → MB, kategori → 'MB'
- [ ] `mb/routes.js` (3 route)
- [ ] Mount route MB di main app
- [ ] Cek DB: ada `jns_perawatan_lab.kategori = 'MB'` dan template terkait

---

## Hal yang Perlu Dikonfirmasi

1. **Konvensi noorder**  
   Apakah di SIMRS noorder PA selalu prefix `PA...` dan MB `MB...`? Jika ya, GET registration bisa tetap satu endpoint; GET lab results dan POST harus per kategori (PA/MB).

2. **`permintaan_lab`**  
   Apakah ada kolom `kategori` di `permintaan_lab`? Jika ada, repository patient-registration untuk PA/MB bisa filter `WHERE pl.kategori = 'PA'` / `'MB'` agar hanya daftar permintaan lab PA/MB.

3. **Tarif dan template**  
   Pastikan di DB sudah ada master untuk PA dan MB:
   - `jns_perawatan_lab` dengan `kategori = 'PA'` dan `kategori = 'MB'`.
   - `template_laboratorium` untuk kd_jenis_prw yang dipakai PA/MB.

4. **Backward compatibility**  
   Apakah endpoint utama tetap:
   - `GET /adam-lis/bridging/:limit/:noorder` (semua noorder),
   - `POST /adam-lis/bridging/` (hanya PK),
   dan PA/MB hanya lewat path `/pa` dan `/mb`? Atau ingin satu POST yang deteksi kategori dari noorder (PK/PA/MB)? Keputusan ini memengaruhi cara mount route dan logika di controller.

---

## Kesimpulan

- **PA dan MB** secara struktur dan database **sama dengan PK**; yang beda hanya **kategori** (`'PA'` / `'MB'`) di query dan insert.
- Implementasi paling cepat: **clone modul PK** jadi PA dan MB, lalu:
  - Ganti semua referensi **PK** → **PA** atau **MB**.
  - Ganti semua **kategori 'PK'** → **'PA'** atau **'MB'** di repository dan service.
  - Mount route `/pa` dan `/mb` serta endpoint lab-results-pa dan lab-results-mb sesuai design di atas.

Setelah itu, yang perlu dicek adalah data master (tarif, template, dan jika ada konvensi noorder) serta keputusan endpoint (backward compatibility dan pemisahan path PA/MB).
