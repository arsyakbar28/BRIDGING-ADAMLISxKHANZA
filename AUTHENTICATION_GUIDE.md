# 🔐 Panduan Autentikasi API

## 📋 Cara Mendapatkan JWT Token

### 1. Login untuk Mendapatkan Token

**Endpoint:** `POST /api/auth/login`

**Request Body (JSON):**
```json
{
  "username": "your-username",
  "password": "your-password"
}
```

**Response Success:**
```json
{
  "success": true,
  "message": "Login successful",
  "payload": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": "never",
    "user": {
      "username": "your-username",
      "role": "admin"
    },
    "expiresAt": null,
    "message": "Token never expires"
  }
}
```

### 2. Menggunakan Token di Postman

Setelah mendapatkan token, gunakan di **Authorization Header**:

1. Pilih tab **Authorization** di Postman
2. Pilih type: **Bearer Token**
3. Paste token yang didapat dari response login
4. Atau manual di tab **Headers**:
   - Key: `Authorization`
   - Value: `Bearer <your-token-here>`

**Contoh:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Verifikasi Token (Optional)

**Endpoint:** `POST /api/auth/verify`

**Headers:**
```
Authorization: Bearer <your-token>
```

---

## ⚙️ Konfigurasi Environment Variables

### File `.env` yang Perlu Di-Set:

```env
# Authentication Configuration
JWT_SECRET=adam-lis-api-secret-key-change-in-production-use-strong-random-key
JWT_EXPIRES_IN=never
# JWT_EXPIRES_IN options: 1h, 24h, 7d, 30d, never (no expiry)

# Default Authentication Credentials
AUTH_USERNAME=default user
AUTH_PASSWORD=default passw
```

### Penjelasan Konfigurasi:

1. **JWT_SECRET** ⚠️ **WAJIB DIUBAH DI PRODUCTION**
   - Secret key untuk sign dan verify JWT token
   - Gunakan string random yang kuat (minimal 32 karakter)
   - Contoh: `openssl rand -base64 32`
   - **JANGAN** gunakan secret yang sama di production!

2. **JWT_EXPIRES_IN**
   - Waktu kedaluwarsa token
   - Opsi: `1h`, `24h`, `7d`, `30d`, atau `never` (tidak pernah expired)
   - Default: `24h`

3. **AUTH_USERNAME**
   - Username untuk login
   - **WAJIB DIUBAH** sesuai kebutuhan

4. **AUTH_PASSWORD**
   - Password untuk login
   - **WAJIB DIUBAH** sesuai kebutuhan
   - Gunakan password yang kuat

---

## 📝 Contoh Penggunaan di Postman

### Step 1: Login
```
POST http://localhost:5005/api/auth/login
Content-Type: application/json

{
  "username": "your-username",
  "password": "your-password"
}
```

### Step 2: Copy Token dari Response
Dari response, copy nilai `payload.token`

### Step 3: Gunakan Token di Request Lain
```
GET http://localhost:5005/adam-lis/bridging/lab-results-pk/10/12345
Authorization: Bearer <paste-token-di-sini>
```

---

## 🔒 Keamanan

1. ✅ **Selalu** gunakan HTTPS di production
2. ✅ **Jangan** commit file `.env` ke repository
3. ✅ **Ubah** JWT_SECRET dengan nilai yang unik dan kuat
4. ✅ **Ubah** AUTH_USERNAME dan AUTH_PASSWORD
5. ✅ Simpan token dengan aman, jangan expose di client-side code

---

## ❓ Troubleshooting

### Error: "Access denied. No token provided"
- Pastikan header `Authorization` sudah ditambahkan
- Format: `Bearer <token>` (ada spasi setelah "Bearer")

### Error: "Invalid token"
- Token mungkin sudah expired (jika JWT_EXPIRES_IN tidak "never")
- Token tidak valid atau sudah diubah
- Login ulang untuk mendapatkan token baru

### Error: "Invalid username or password"
- Pastikan AUTH_USERNAME dan AUTH_PASSWORD di `.env` sudah benar
- Pastikan request body menggunakan username dan password yang sesuai

