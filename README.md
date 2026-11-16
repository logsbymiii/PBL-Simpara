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

Foto barang disimpan sebagai aset di repo (`frontend/assets/images/barang/`, tanpa upload); kolom `barang.foto_barang` hanya berisi nama filenya, misalnya `kamera.jpg`.
