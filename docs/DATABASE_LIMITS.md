# Database Column Limits Configuration

Setiap RS memiliki schema database Khanza yang berbeda-beda. Untuk mencegah error database saat insert data lab, sistem ini menyediakan konfigurasi text limits yang fleksibel.

## 🔍 Cara Mengecek Schema Database Anda

Jalankan script berikut untuk menganalisa database Khanza Anda:

```bash
node scripts/check-db-limits.js
```

Script akan menampilkan informasi kolom database dan memberikan rekomendasi konfigurasi.

## ⚙️ Konfigurasi di .env

Sesuaikan nilai berikut di file `.env`:

```env
# Database Column Limits
DB_LIMIT_HASIL_PEMERIKSAAN=0    # Kolom 'nilai' di detail_periksa_lab
DB_LIMIT_NILAI_RUJUKAN=0        # Kolom 'nilai_rujukan' di detail_periksa_lab  
DB_LIMIT_KETERANGAN=0           # Kolom 'keterangan' di detail_periksa_lab
DB_LIMIT_KESAN=0                # Kolom 'kesan' di saran_kesan_lab
DB_LIMIT_SARAN=0                # Kolom 'saran' di saran_kesan_lab
```

## 📝 Nilai Konfigurasi

| Nilai | Behavior |
|-------|----------|
| `0` | **Disable validation** - Biarkan MySQL handle constraint (Recommended) |
| `255` | Validasi maksimal 255 karakter (untuk VARCHAR(255)) |
| `65535` | Validasi maksimal 65535 karakter (untuk TEXT) |
| `16777215` | Validasi maksimal 16MB (untuk MEDIUMTEXT) |

## 🎯 Rekomendasi

**Untuk kebanyakan RS:** Set semua nilai ke `0`

```env
DB_LIMIT_HASIL_PEMERIKSAAN=0
DB_LIMIT_NILAI_RUJUKAN=0
DB_LIMIT_KETERANGAN=0
DB_LIMIT_KESAN=0
DB_LIMIT_SARAN=0
```

Alasan:
- ✅ Lebih fleksibel untuk berbagai schema DB
- ✅ MySQL akan memberikan error yang jelas jika ada constraint violation
- ✅ Tidak perlu maintenance config saat ada perubahan schema
- ✅ Performa lebih baik (tidak ada double validation)

## 🚨 Kapan Menggunakan Limits

Gunakan limits hanya jika:
- Ada requirement bisnis spesifik untuk limit karakter
- Ingin memberikan error message yang lebih user-friendly
- Ada constraint khusus di aplikasi LIS yang mengirim data

## 🔄 Auto-Replace System

Sistem auto-replace akan tetap bekerja regardless of text limit settings:

- ✅ Deteksi duplicate data otomatis
- ✅ Replace data lama dengan data baru
- ✅ Response message yang informatif (`INSERT` vs `UPDATE`)