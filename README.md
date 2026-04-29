# BRIDGING-ADAMLISxKHANZA

## Prasyarat

- Node.js minimal versi 14.
- MySQL atau MariaDB.
- Database Khanza/SIMRS dengan nama `sik`.

## Instalasi


Install dependency:

```bash
npm install
```


Buat atau sesuaikan file `.env` di root project:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=sik
DB_USER=dbusername
DB_PASSWORD=dbpassword

PORT=5005
NODE_ENV=development
API_VERSION=v1

JWT_SECRET=adam-lis-api-local-dev-secret-change-before-production
JWT_EXPIRES_IN=never

AUTH_USERNAME=admin
AUTH_PASSWORD=admin123

DEFAULT_LAB_PETUGAS_NIP=-
DEFAULT_LAB_DOKTER_KD=-

LOG_LEVEL=info
```

Jalankan server:

```bash
npm start
```

Untuk development dengan auto reload:

```bash
npm run dev
```

## API Sandbox

Setelah server berjalan, buka dokumentasi interaktif Swagger:

```text
http://localhost:5005/api-docs
```

OpenAPI JSON tersedia di:

```text
http://localhost:5005/api-docs/openapi.json
```

Health check:

```text
http://localhost:5005/api/health
```

## Cara Menggunakan

1. Login via `POST /api/auth/login` dengan username/password dari `.env`.
2. Salin token dari response login.
3. Klik tombol `Authorize` di Swagger UI.
4. Masukkan token dengan format `Bearer <token>`.
5. Pilih endpoint sesuai metode integrasi yang dipakai.

## Konsep Integrasi

Registrasi pasien dapat memakai salah satu metode:

- GET pull: Adam LIS hit endpoint GET project ini untuk menarik data order PK, PA, atau MK dari database `sik`.
- POST push: project/SIMRS hit endpoint POST registrasi eksternal yang dibuat Adam LIS.

Jangan gunakan GET pull dan POST push bersamaan untuk order yang sama.

Catatan: endpoint POST registrasi pada grup `PK`, `MB`, dan `PA` adalah endpoint LIS eksternal. Placeholder Swagger sudah diset ke:

```text
PK: http://192.168.100.111:2311/adam-lis/bridging_sim_rs/registrasi
PA: http://192.168.100.111:2312/api/v1/adamlis/patologi-anatomi/bridging/registrasi
MK: http://192.168.100.111:2313/api/v2/adamlis/mikrobiologi/bridging/registrasi
```

Jika host berubah, isi ulang `lisBaseUrl` pada pilihan server Swagger sebelum Execute.

Pengembalian hasil:

- Update hasil PK dari Adam LIS ke Khanza memakai `POST /adam-lis/bridging/update-hasil` sesuai format Adam LIS.
- PA/MB memakai endpoint arsip untuk create hasil dan PUT arsip untuk revisi agar perubahan dari LIS ikut mengupdate database `sik`.

## Endpoint Penting

Auth:

```text
POST /api/auth/login
POST /api/auth/verify
```

Registrasi GET pull dari project:

```text
GET /adam-lis/bridging/{limit}/{noorder}
GET /adam-lis/bridging/pa/{limit}/{noorder}
GET /adam-lis/bridging/mb/{limit}/{noorder}
```

Registrasi POST push ke Adam LIS eksternal:

```text
POST http://192.168.100.111:2311/adam-lis/bridging_sim_rs/registrasi
POST http://192.168.100.111:2312/api/v1/adamlis/patologi-anatomi/bridging/registrasi
POST http://192.168.100.111:2313/api/v2/adamlis/mikrobiologi/bridging/registrasi
```

Pengembalian hasil dari Adam LIS ke project:

```text
POST /adam-lis/bridging/update-hasil
POST /api/v1/adamlis/patologi-anatomi/bridging/arsip
PUT  /api/v1/adamlis/patologi-anatomi/bridging/arsip
POST /api/v2/adamlis/mikrobiologi/bridging/arsip
PUT  /api/v2/adamlis/mikrobiologi/bridging/arsip/{no_lab}
```
