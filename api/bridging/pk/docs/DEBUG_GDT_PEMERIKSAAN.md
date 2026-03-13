# Debug: Pemeriksaan GDT (Gambaran Darah Tepi) tidak muncul di endpoint

Jika "Gambaran Darah Tepi (GDT)" tampil di SIMRS tapi tidak di response API, cek di database SIMRS:

## 1. Cek di `template_laboratorium` – GDT pakai kd_jenis_prw apa

**Query:**
```sql
SELECT id_template, kd_jenis_prw, Pemeriksaan, urut
FROM template_laboratorium
WHERE Pemeriksaan LIKE '%Gambaran Darah Tepi%' OR Pemeriksaan LIKE '%GDT%';
```

**Jalankan di Ubuntu (MySQL client):**
```bash
mysql -u USER -p NAMA_DATABASE -e "SELECT id_template, kd_jenis_prw, Pemeriksaan, urut FROM template_laboratorium WHERE Pemeriksaan LIKE '%Gambaran Darah Tepi%' OR Pemeriksaan LIKE '%GDT%';"
```
Ganti `USER` dan `NAMA_DATABASE` dengan user dan nama database SIMRS. `-p` akan minta password.

**Contoh (interaktif, masuk dulu ke mysql):**
```bash
mysql -u root -p
# masuk password, lalu:
USE nama_database_simrs;
SELECT id_template, kd_jenis_prw, Pemeriksaan, urut FROM template_laboratorium WHERE Pemeriksaan LIKE '%Gambaran Darah Tepi%' OR Pemeriksaan LIKE '%GDT%';
```

Catat **kd_jenis_prw** untuk GDT.

## 2. Cek noorder ini punya tindakan itu di `permintaan_detail_permintaan_lab` atau tidak

Ganti `PK202602240078` dengan noorder yang dipakai.

**Query:**
```sql
SELECT pdpl.noorder, pdpl.id_template, pdpl.kd_jenis_prw, tl.Pemeriksaan, tl.kd_jenis_prw AS tl_kd_jenis_prw
FROM permintaan_detail_permintaan_lab pdpl
LEFT JOIN template_laboratorium tl ON pdpl.id_template = tl.id_template
WHERE pdpl.noorder = 'PK202602240078';
```

**Jalankan di Ubuntu (satu baris):**
```bash
mysql -u USER -p NAMA_DATABASE -e "SELECT pdpl.noorder, pdpl.id_template, pdpl.kd_jenis_prw, tl.Pemeriksaan, tl.kd_jenis_prw AS tl_kd_jenis_prw FROM permintaan_detail_permintaan_lab pdpl LEFT JOIN template_laboratorium tl ON pdpl.id_template = tl.id_template WHERE pdpl.noorder = 'PK202602240078';"
```

- Jika **kd_jenis_prw** GDT (dari query 1) **tidak muncul** di hasil (baik dari `pdpl.kd_jenis_prw` maupun `tl.kd_jenis_prw`), maka untuk noorder ini tidak ada baris yang “mengajak” tindakan GDT, jadi API tidak akan menampilkan GDT.
- Di SIMRS, GDT bisa tetap tampil karena UI mengambil semua template untuk suatu panel/tindakan dari master, bukan hanya dari detail permintaan.

## 3. Solusi jika GDT punya tindakan sendiri yang tidak ada di pdpl

- **Opsi A:** Pastikan saat input permintaan lab di SIMRS, tindakan yang berisi GDT juga dicentang/ditambah sehingga ada baris di `permintaan_detail_permintaan_lab` untuk noorder ini (dengan `id_template` GDT atau `kd_jenis_prw` tindakan GDT).
- **Opsi B:** Jika di SIMRS GDT selalu tampil sebagai bagian dari satu “paket” (satu kd_jenis_prw) dengan Hb/Leukosit/dll, pastikan di `template_laboratorium` baris GDT memakai **kd_jenis_prw yang sama** dengan paket itu. Setelah itu, selama ada minimal satu baris di pdpl untuk noorder ini yang (via id_template) mengarah ke kd_jenis_prw itu, API akan menampilkan semua template termasuk GDT.
