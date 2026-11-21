# SIMPARA

Sistem Informasi Peminjaman Barang inventaris HMTI. OKI (organisasi) mendaftar dan mengajukan
peminjaman barang; admin HMTI memverifikasi, menyerahkan barang, mencatat pengembalian, dan melihat laporan.

- Frontend: HTML, CSS, JavaScript biasa (tanpa framework), di-deploy ke Vercel.
- Backend: PHP 8.1+ native + PDO, berupa REST API JSON.
- Database: PostgreSQL (online di Neon).

## Struktur folder

```
backend/
  public/        index.php + .htaccess (document root API)
  routes/api.php daftar endpoint
  src/           bootstrap, router, koneksi database, session, helper, controllers/
  .env.example   contoh variabel lingkungan
database/
  schema.sql     tabel, view, fungsi, dan prosedur (untuk database kosong)
  seed.sql       data awal (password dan PIN masih placeholder)
  migrations/    perubahan untuk database yang sudah berjalan (dijalankan manual, berurutan)
docker/          konfigurasi Apache + skrip start untuk image backend
frontend/
  index.html     halaman depan publik
  pages/         halaman auth/, peminjam/, admin/
  js/            services/api.js, components/, utils/, pages/
  css/
Dockerfile       image backend (php:8.3-apache)
```

## Menjalankan di lokal (Laragon)

1. Taruh project di `C:\laragon\www\PBL-Simpara`, nyalakan Apache dan PostgreSQL dari Laragon.
   Pastikan ekstensi PHP `pdo_pgsql` aktif.
2. Buat database kosong, lalu import schema dan seed (lihat bagian di bawah).
3. Salin `backend/.env.example` menjadi `backend/.env`, lalu isi nilainya. File `.env` tidak boleh di-commit.
4. Cek API: buka `http://localhost/PBL-Simpara/backend/public/api/ping`. Kalau database terhubung,
   respons berisi `"database": "terhubung"`.
5. Buka frontend lewat Laragon (`http://localhost/PBL-Simpara/frontend/`) atau Live Server.
   Catatan: `frontend/js/services/api.js` mengarah ke backend online kalau tidak dibuka dari Vercel.
   Untuk memakai backend lokal, ubah sementara `API_BASE_URL` di file itu (jangan di-commit), dan samakan
   `CORS_ORIGIN` di `.env` dengan alamat frontend.

## Variabel `.env` (backend)

| Variabel | Isi |
|---|---|
| `APP_ENV` | `development` (pesan error detail) atau `production` |
| `DB_HOST` | host PostgreSQL |
| `DB_PORT` | port PostgreSQL |
| `DB_NAME` | nama database |
| `DB_USER` | user database |
| `DB_PASS` | password database |
| `DB_SSLMODE` | mode SSL (Neon butuh SSL); kosongkan untuk lokal tanpa SSL |
| `CORS_ORIGIN` | alamat frontend yang boleh memanggil API |

Di Docker/server, variabel yang sama diisi lewat environment, bukan file `.env`.

## Import database

Jalankan di database **kosong** (schema.sql tidak menghapus tabel yang sudah ada):

```
psql -h <host> -U <user> -d <database> -f database/schema.sql
psql -h <host> -U <user> -d <database> -f database/seed.sql
```

Sebelum menjalankan `seed.sql`, ganti semua teks `GANTI_...` (password akun dan PIN contoh) dengan nilai asli
di salinan lokal, dan jangan commit nilai aslinya. Seed memakai ekstensi `pgcrypto` untuk membuat hash bcrypt.
Bisa juga lewat pgAdmin atau SQL Editor Neon: buka file, salin isinya, jalankan berurutan.

Database yang sudah berjalan (mis. Neon) tidak perlu dibuat ulang: jalankan file di `database/migrations/`
yang belum pernah dijalankan, urut sesuai tanggal di nama file.

## Fitur dan endpoint penting

**Foto barang.** Ada dua sumber, dengan urutan prioritas:
1. Foto unggahan admin, disimpan di database (`barang.foto_data` BYTEA + `foto_mime`), maksimal 300 KB, JPEG/PNG/WebP.
   Form tambah/edit barang mengecilkan foto di browser dulu (sisi terpanjang 800 px, JPEG).
2. Foto bawaan sebagai aset di repo (`frontend/assets/images/barang/`); kolom `barang.foto_barang` hanya berisi
   nama filenya, misalnya `kamera.jpg`.

Daftar barang tidak memuat isi foto; view `v_barang_hari_ini` hanya mengirim penanda `foto_upload` (ukuran byte),
yang dipakai frontend sebagai versi URL foto. Katalog (peminjam dan guest) menampilkan 6 kartu per halaman.

| Endpoint | Akses | Keterangan |
|---|---|---|
| `GET /api/barang/{id}/foto` | publik | foto unggahan (Content-Type asli, Cache-Control, ETag), 404 kalau tidak ada |
| `POST /api/barang/{id}/foto` | admin | body = isi file gambar; jenis dicek dari isi file, maks. 300 KB |
| `DELETE /api/barang/{id}/foto` | admin | hapus foto unggahan, kembali ke foto bawaan |
| `GET /api/barang/{id}/peminjaman` | login | peminjaman aktif/mendatang barang itu (status Disetujui/Dipinjam): nama OKI, tanggal, jumlah, status. Tanpa nama peminjam, NIM, no HP, atau PIN |

**Batas percobaan (dihitung per session).**
- Login: maksimal 5 gagal dalam 10 menit.
- PIN pembatalan pengajuan: 3 kali salah, lalu terkunci 5 menit (`BATAS_PIN_SALAH`, `LAMA_KUNCI_PIN` di
  `backend/src/session.php`). Respons PIN salah berisi sisa kesempatan; respons 429 berisi `errors.retry_after`
  (detik) dan header `Retry-After`, dipakai modal PIN untuk countdown. Hitungan direset setelah PIN benar.
