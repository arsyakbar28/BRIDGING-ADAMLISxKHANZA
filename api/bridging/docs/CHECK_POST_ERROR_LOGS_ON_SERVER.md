# Cek Log POST Error di Server

Log POST error disimpan di server dengan pola nama: **`post-errors-YYYY-MM-DD.log`**  
Lokasi default (relatif ke direktori project saat app jalan): **`logs/post-errors-YYYY-MM-DD.log`**

Jika app jalan pakai `utils/logger.js`, path absolut biasanya:
- **`<project_root>/logs/post-errors-2026-03-13.log`** (contoh untuk tanggal 13 Maret 2026)

---

## 1. Masuk ke server & masuk folder project

```bash
ssh user@your-server
cd /path/ke/project/BRIDGING\ ADAMLISXKHANZA
```

(Ganti `user`, `your-server`, dan `/path/ke/project` sesuai server kamu.)

---

## 2. Lihat file log POST error yang ada

```bash
ls -la logs/post-errors-*.log
```

Atau hanya yang terbaru (urut tanggal):

```bash
ls -t logs/post-errors-*.log | head -5
```

---

## 3. Baca isi log POST error terbaru (hari ini)

```bash
# Ganti 2026-03-13 dengan tanggal yang mau dicek
cat logs/post-errors-2026-03-13.log
```

Atau hanya **beberapa baris terakhir**:

```bash
tail -100 logs/post-errors-2026-03-13.log
```

---

## 4. Format isi log

Setiap baris biasanya **satu JSON** (Winston). Contoh:

```json
{"level":"error","message":"POST Request Error","timestamp":"...","type":"POST_ERROR","method":"POST","endpoint":"/adam-lis/bridging/pk","noorder":"PK202603100031","error":{"message":"...","stack":"..."},"request":{"body":{...}}}
```

Yang penting:
- **`noorder`** – nomor order yang gagal
- **`error.message`** – pesan error
- **`request.body`** – payload yang dikirim (dibatasi/sanitized)

---

## 5. Cek hanya error untuk noorder tertentu

```bash
grep "PK202603100031" logs/post-errors-2026-03-13.log
```

(Ganti `PK202603100031` dan nama file log sesuai kebutuhan.)

---

## 6. Baca log yang “cantik” (satu baris JSON per baris di-format)

Jika di server ada `jq`:

```bash
tail -20 logs/post-errors-2026-03-13.log | while read line; do echo "$line" | jq . 2>/dev/null || echo "$line"; done
```

Tanpa `jq`, cukup `tail`/`cat` seperti di atas.

---

## 7. Satu perintah: log terbaru + 50 baris terakhir

```bash
LATEST=$(ls -t logs/post-errors-*.log 2>/dev/null | head -1)
echo "File: $LATEST"
tail -50 "$LATEST"
```

Ini menampilkan file **post-errors** terbaru dan 50 baris terakhir isinya.

---

Setelah dapat isi log, fokus ke **`error.message`** dan **`noorder`** / **`request.body`** untuk debug kenapa POST gagal.
