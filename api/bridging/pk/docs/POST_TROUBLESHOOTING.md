# Troubleshooting POST Lab Results

## Error: "Terjadi kesalahan saat memproses data. Silakan periksa kembali data yang dikirim."

Pesan ini muncul ketika terjadi error di dalam service yang tidak cocok dengan pola error yang dikenal (foreign key, duplicate, dll). Penyebab umum:

### 1. Format payload tidak sesuai

API mengharapkan **field root** berikut (wajib):

| Field | Contoh | Keterangan |
|-------|--------|------------|
| `noorder` | `"PK202603100031"` | Boleh dari mapping `no_registrasi` |
| `dokter_pj` | `"1420507881"` | Kode dokter penanggung jawab (harus ada di tabel `dokter`) |
| `petugas` | `"197808082014062011"` | NIP/kode petugas (harus ada di tabel `petugas`) |
| `dokter_perujuk` | `"1420507881"` | Kode dokter perujuk |
| `tgl_periksa` | `"2026-03-13"` | Format YYYY-MM-DD |
| `jam_periksa` | `"10:00:27"` | Format HH:mm:ss |
| `pemeriksaan` | `[{ ... }]` | Array, minimal 1 item |

Jika payload dari Adam LIS memakai nama lain, **transform dulu** sebelum kirim, contoh:

- `no_registrasi` → `noorder`
- `dokter_pengirim.kode` → `dokter_perujuk` dan bisa juga `dokter_pj`
- `nama_pegawai_pemeriksa` / `kode_pegawai` → `petugas` (kirim kode/NIP)
- `waktu_selesai` → pecah jadi `tgl_periksa` dan `jam_periksa`

### 2. `kode_pemeriksaan` harus id_template dari SIMRS

`kode_pemeriksaan` di API = **id_template** dari tabel `template_laboratorium` (biasanya **angka**), bukan kode/nama dari LIS (mis. "PSA").

- **Salah:** `"kode_pemeriksaan": "PSA"` → di SIMRS tidak ada template dengan id "PSA".
- **Benar:** `"kode_pemeriksaan": 291` (atau `"291"`) → 291 = id_template untuk PSA di `template_laboratorium`.

**Opsi untuk Adam LIS:** Jika LIS mengirim kode "PSA" dan id_template 291 ada di field lain (mis. `keterangan`), API bisa memakai **keterangan** sebagai id_template bila isinya angka:

```json
{
  "kode_pemeriksaan": "PSA",
  "keterangan": "291",
  "hasil": { "nilai_hasil": "2.02", "nilai_rujukan": "≤ 4" }
}
```

Di service, jika `keterangan` berisi angka yang valid sebagai id_template, itu yang dipakai untuk lookup template.

### 3. Format `hasil`

- **Bentuk string (langsung):** `"hasil": "2.02"`
- **Bentuk objek Adam LIS:** `"hasil": { "nilai_hasil": "2.02", "nilai_rujukan": "≤ 4" }`  
  API akan mengambil `nilai_hasil` sebagai nilai yang disimpan.

### 4. noorder tidak ada di SIMRS

Pastikan **noorder** (mis. PK202603100031) sudah ada di tabel `permintaan_lab`. Kalau tidak, API mengembalikan:  
`"No lab request found for noorder: ..."`

### 5. Kode dokter / petugas tidak terdaftar

Pastikan `dokter_pj` dan `petugas` (NIP) ada di tabel `dokter` dan `petugas` di database SIMRS. Jika tidak, akan muncul pesan error yang menyebut kode dokter atau petugas tidak valid.

---

## Contoh payload minimal yang valid

```json
{
  "noorder": "PK202603100031",
  "dokter_pj": "1420507881",
  "petugas": "197808082014062011",
  "dokter_perujuk": "1420507881",
  "tgl_periksa": "2026-03-13",
  "jam_periksa": "10:00:27",
  "pemeriksaan": [
    {
      "kode_pemeriksaan": 291,
      "hasil": "2.02",
      "nilai_rujukan": "≤ 4",
      "keterangan": ""
    }
  ]
}
```

Atau dengan format Adam LIS (hasil objek + id_template lewat keterangan):

```json
{
  "noorder": "PK202603100031",
  "dokter_pj": "1420507881",
  "petugas": "197808082014062011",
  "dokter_perujuk": "1420507881",
  "tgl_periksa": "2026-03-13",
  "jam_periksa": "10:00:27",
  "pemeriksaan": [
    {
      "kode_pemeriksaan": "PSA",
      "keterangan": "291",
      "hasil": {
        "nilai_hasil": "2.02",
        "nilai_rujukan": "≤ 4"
      }
    }
  ]
}
```

Pastikan **291** (atau id_template lain) benar-benar ada di tabel `template_laboratorium` untuk lab yang dipakai.
