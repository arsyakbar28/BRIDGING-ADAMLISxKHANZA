# BRIDGING ADAMLIS x KHANZA

API server Node.js/Express untuk bridging data laboratorium antara Adam LIS dan SIMRS Khanza.

## Kebutuhan Instalasi

Pastikan environment server sudah memiliki:

- Node.js `>= 14.0.0`
- npm
- Akses jaringan ke database MySQL/MariaDB SIMRS Khanza
- Database user dengan akses ke tabel lab Khanza yang dibutuhkan

Dependency utama project:

- `express` — HTTP API server
- `mysql2` — koneksi database MySQL/MariaDB
- `jsonwebtoken` — autentikasi JWT
- `dotenv` — membaca konfigurasi `.env`
- `cors` — CORS middleware
- `winston` dan `winston-daily-rotate-file` — logging

## Instalasi Project

Clone repository, lalu install dependency:

```bash
npm install
```

## Konfigurasi Environment

Buat file `.env` di root project.

Contoh isi `.env`:

```env
# Database Configuration
DB_HOST=IP_DATABASE_SIMRS
DB_PORT=3306
DB_NAME=nama_database_simrs
DB_USER=user_database
DB_PASSWORD=password_database

# Server Configuration
PORT=5005
NODE_ENV=development

# API Configuration
API_VERSION=v1

# Authentication Configuration
JWT_SECRET=ganti-dengan-secret-random-yang-kuat
JWT_EXPIRES_IN=never
# JWT_EXPIRES_IN options: 1h, 24h, 7d, 30d, never

# Default Authentication Credentials
AUTH_USERNAME=username_api
AUTH_PASSWORD=password_api

# Optional: kode rumah sakit untuk payload GET registration
KODE_RS=N02

# Optional: limit panjang field sesuai struktur database RS
# Isi 0 atau kosong untuk membiarkan database yang memvalidasi panjang field.
DB_LIMIT_HASIL_PEMERIKSAAN=0
DB_LIMIT_NILAI_RUJUKAN=0
DB_LIMIT_KETERANGAN=0
DB_LIMIT_KESAN=0
DB_LIMIT_SARAN=0

# Optional: level log
LOG_LEVEL=info
```

Jangan commit file `.env` ke repository karena berisi credential database dan credential API.

## Menjalankan Server

Mode production/basic:

```bash
npm start
```

Mode development dengan auto-reload:

```bash
npm run dev
```

Jika berhasil, server akan berjalan di port sesuai `.env`, misalnya:

```text
http://localhost:5005
```

Cek health endpoint:

```bash
curl http://localhost:5005/api/health
```

Response sukses:

```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2026-07-09T00:00:00.000Z"
}
```

## Setup PM2 untuk Production

PM2 digunakan agar service tetap berjalan di background dan otomatis restart jika crash.

### Install PM2

Install PM2 secara global di server:

```bash
npm install -g pm2
```

Cek instalasi:

```bash
pm2 --version
```

### Start aplikasi dengan PM2

Pastikan file `.env` sudah dibuat dan benar, lalu jalankan dari root project:

```bash
pm2 start app.js --name bridging-adamlis-khanza
```

Cek status process:

```bash
pm2 status
```

Cek log aplikasi:

```bash
pm2 logs bridging-adamlis-khanza
```

Restart aplikasi setelah ada perubahan kode atau `.env`:

```bash
pm2 restart bridging-adamlis-khanza
```

Stop aplikasi:

```bash
pm2 stop bridging-adamlis-khanza
```

Hapus process dari PM2:

```bash
pm2 delete bridging-adamlis-khanza
```

### Auto-start PM2 setelah server reboot

Jalankan:

```bash
pm2 startup
```

PM2 akan menampilkan command tambahan sesuai OS/server. Copy dan jalankan command yang ditampilkan tersebut.

Setelah process aplikasi sudah berjalan, simpan daftar process PM2:

```bash
pm2 save
```

Setelah server reboot, cek apakah process otomatis hidup:

```bash
pm2 status
curl http://localhost:5005/api/health
```

### Contoh workflow deploy dengan PM2

```bash
git pull origin main
npm install
pm2 restart bridging-adamlis-khanza
pm2 status
curl http://localhost:5005/api/health
```

Jika server menggunakan reverse proxy seperti Nginx, arahkan upstream ke port yang sama dengan `PORT` di `.env`, misalnya `localhost:5005`.

## Autentikasi

Semua endpoint bridging membutuhkan Bearer token JWT.

### Login

```http
POST /api/auth/login
```

Body:

```json
{
  "username": "username_api",
  "password": "password_api"
}
```

Contoh `curl`:

```bash
curl -X POST http://localhost:5005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"username_api","password":"password_api"}'
```

Response sukses berisi token:

```json
{
  "success": true,
  "message": "Login successful",
  "payload": {
    "token": "JWT_TOKEN",
    "tokenType": "Bearer",
    "expiresIn": "never",
    "user": {
      "username": "username_api",
      "role": "admin"
    }
  }
}
```

Gunakan token tersebut di header:

```http
Authorization: Bearer JWT_TOKEN
```

### Verify Token

```http
POST /api/auth/verify
```

Header:

```http
Authorization: Bearer JWT_TOKEN
```

## Endpoint Utama

Base protected endpoint:

```text
/adam-lis/bridging
```

### PK - Patologi Klinis

#### Get registrasi/order PK

```http
GET /adam-lis/bridging/:limit/:noorder
```

Contoh:

```bash
curl http://localhost:5005/adam-lis/bridging/10/PK202607080001 \
  -H "Authorization: Bearer JWT_TOKEN"
```

#### Get hasil lab PK

```http
GET /adam-lis/bridging/lab-results-pk/:limit/:noorder
```

Contoh:

```bash
curl http://localhost:5005/adam-lis/bridging/lab-results-pk/10/PK202607080001 \
  -H "Authorization: Bearer JWT_TOKEN"
```

#### POST hasil lab PK

```http
POST /adam-lis/bridging/
```

Contoh body:

```json
{
  "noorder": "PK202607080001",
  "dokter_pj": "D018",
  "petugas": "ASS001",
  "dokter_perujuk": "D018",
  "tgl_periksa": "2026-07-08",
  "jam_periksa": "12:34:56",
  "pemeriksaan": [
    {
      "kode_pemeriksaan": 3630,
      "nama_pemeriksaan": "Hemoglobin",
      "hasil": "14.2",
      "nilai_rujukan": "13.4 - 18.5",
      "keterangan": "Normal"
    },
    {
      "kode_pemeriksaan": 3631,
      "nama_pemeriksaan": "Leukosit",
      "hasil": "7.1",
      "nilai_rujukan": "4.0 - 10.0",
      "keterangan": "Normal"
    }
  ],
  "kesan": "-",
  "saran": "-"
}
```

Contoh `curl`:

```bash
curl -X POST http://localhost:5005/adam-lis/bridging/ \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d @payload-pk.json
```

Field wajib POST PK:

| Field | Keterangan |
| --- | --- |
| `noorder` | Nomor order dari `permintaan_lab` |
| `dokter_pj` | Kode dokter penanggung jawab, harus ada di tabel `dokter` |
| `petugas` | NIP petugas, harus ada di tabel `petugas` |
| `dokter_perujuk` | Kode dokter perujuk, harus ada di tabel `dokter` |
| `tgl_periksa` | Format `YYYY-MM-DD` |
| `jam_periksa` | Format `HH:mm:ss` |
| `pemeriksaan` | Array pemeriksaan, minimal 1 item |
| `pemeriksaan[].kode_pemeriksaan` | `id_template` dari `template_laboratorium` |
| `pemeriksaan[].hasil` | Nilai hasil pemeriksaan |

Field optional:

| Field | Keterangan |
| --- | --- |
| `pemeriksaan[].nilai_rujukan` | Nilai rujukan hasil lab |
| `pemeriksaan[].keterangan` | Keterangan/flag hasil |
| `kesan` | Kesan hasil lab |
| `saran` | Saran hasil lab |

## Dukungan Format Adam LIS

Controller PK juga menerima beberapa field dari format Adam LIS dan menormalisasi ke format internal:

| Field Adam LIS | Field internal |
| --- | --- |
| `no_registrasi` | `noorder` |
| `dokter_pengirim.kode` | `dokter_pj` dan `dokter_perujuk` jika field internal belum ada |
| `kode_pegawai` | `petugas` jika `petugas` belum ada |
| `waktu_selesai` | `tgl_periksa` dan `jam_periksa` jika field internal belum ada |

## Logic Tarif PK

POST hasil PK menyimpan data ke:

- `periksa_lab` — header tindakan per `kd_jenis_prw`
- `detail_periksa_lab` — detail hasil per `id_template`
- `permintaan_lab` — update `tgl_hasil` dan `jam_hasil`
- `saran_kesan_lab` — jika `kesan` atau `saran` dikirim

Sumber tarif otomatis ditentukan server:

| Kondisi | Mode | Perilaku |
| --- | --- | --- |
| `jns_perawatan_lab.total_byr > 0` | `tindakan` | Tarif disimpan pada header `periksa_lab`; biaya detail disimpan 0 |
| `jns_perawatan_lab.total_byr = 0` dan `template_laboratorium.biaya_item > 0` | `template` | Tarif disimpan per item pada `detail_periksa_lab`; tarif header disimpan 0 agar billing tidak menghitung ganda |
| Header dan template sama-sama 0 | `none` | Biaya disimpan 0 |

Client/LIS tidak perlu mengirim parameter tarif. Tarif selalu dihitung dari database Khanza.

## Endpoint MB - Mikrobiologi

```http
GET  /adam-lis/bridging/mb/:limit/:noorder
GET  /adam-lis/bridging/mb/lab-results/:limit/:noorder
POST /adam-lis/bridging/mb
```

## Endpoint PA - Patologi Anatomi

```http
GET  /adam-lis/bridging/pa/:limit/:noorder
POST /adam-lis/bridging/pa
```

## Script NPM

```bash
npm start
```

Menjalankan server dengan `node app.js`.

```bash
npm run dev
```

Menjalankan server dengan `nodemon app.js`.

```bash
npm test
npm run test-bridging
npm run test-lab-results-pk
```


## Logging

Log ditulis ke folder `logs/`:

- `app-YYYY-MM-DD.log` — log aplikasi umum
- `error-YYYY-MM-DD.log` — log error
- `post-errors-YYYY-MM-DD.log` — detail error saat POST hasil lab

## Troubleshooting

### `No registration data found`

Pastikan `noorder` sudah ada di tabel `permintaan_lab` pada database yang dikonfigurasi di `.env`.

### `Access denied. No token provided.`

Pastikan header berikut dikirim:

```http
Authorization: Bearer JWT_TOKEN
```

### `Invalid token` atau `Token has expired`

Login ulang lewat `/api/auth/login` dan gunakan token terbaru.

### `Kode dokter tidak valid`

Pastikan `dokter_pj` dan `dokter_perujuk` ada di tabel `dokter`.

### `Kode petugas tidak valid`

Pastikan `petugas` ada di tabel `petugas`.

### `Template not found`

Pastikan `pemeriksaan[].kode_pemeriksaan` adalah `id_template` yang valid di tabel `template_laboratorium`.

### Error karakter khusus seperti `≤` atau `≥`

Project menormalisasi beberapa karakter Unicode ke ASCII sebelum insert database. Contoh `≤` menjadi `<=`, `≥` menjadi `>=`.

## Catatan Deploy

- Gunakan `JWT_SECRET` yang kuat dan berbeda untuk tiap environment.
- Jangan gunakan credential testing/production di dokumentasi atau commit repository.
- Pastikan server aplikasi dapat mengakses host database SIMRS.
- Pastikan user database memiliki permission yang diperlukan untuk read/write tabel lab Khanza.
