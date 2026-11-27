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
| `R2_ACCOUNT_ID` | ID akun Cloudflare untuk R2 (opsional) |
| `R2_ACCESS_KEY_ID` | access key token API R2 (opsional) |
| `R2_SECRET_ACCESS_KEY` | secret key token API R2 (opsional) |
| `R2_BUCKET` | nama bucket R2 untuk foto barang (opsional) |

Di Docker/server, variabel yang sama diisi lewat environment, bukan file `.env` (sudah diteruskan lewat
`PassEnv` di `docker/apache.conf`). Kalau salah satu `R2_*` kosong, R2 dianggap tidak aktif dan aplikasi tetap jalan.
Nilai `R2_*` adalah rahasia: jangan ditulis di file yang di-commit.

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

**Foto barang (Cloudflare R2 lewat proxy backend).** Foto barang, baik bawaan maupun unggahan admin, disimpan di
bucket R2 dengan key `barang/<nama file>`. Kolom `barang.foto_barang` hanya berisi nama filenya, misalnya `kamera.jpg`.
Browser **tidak** mengambil foto dari URL `r2.dev`, karena domain itu diblokir di sebagian jaringan (mis. jaringan
kampus/operator tertentu). Semua foto diminta lewat backend: `GET /api/barang/{id}/foto`. Backend mengambil objeknya
dari R2 dengan S3 API bertanda tangan AWS Signature V4 (`backend/src/R2.php`, tanpa SDK), lalu meneruskannya ke browser.

Urutan sumber di `GET /api/barang/{id}/foto`:
1. `foto_data` (BYTEA, unggahan lama dari migrasi 2026-11-21, atau cadangan saat R2 tidak aktif), lalu
2. objek R2 `barang/<foto_barang>`, lalu
3. 404. Frontend kemudian memakai file statis `frontend/assets/images/barang/<nama>` sebagai cadangan, lalu ikon.

Unggahan admin disimpan ke R2 sebagai `barang/<slug-nama>-<id>-<timestamp>.<ext>` dan `foto_barang` diganti ke nama
itu. Kalau R2 tidak aktif atau gagal, foto disimpan ke kolom BYTEA (respons memberi tahu `penyimpanan: database`).
Menghapus foto unggahan menghapus objek R2-nya (foto bawaan tidak pernah dihapus) dan mengembalikan `foto_barang`
ke foto bawaan menurut nama barang (huruf kecil, spasi jadi `-`, `.jpg`). Form tambah/edit barang mengecilkan foto
di browser dulu (sisi terpanjang 800 px, JPEG, di bawah 300 KB). Aset UI (logo, ikon) tetap di repo.

Foto bawaan dari repo diunggah ke R2 sekali dengan `php backend/tools/r2_unggah_bawaan.php` (membaca `R2_*` dari
`backend/.env`). Tanda tangan SigV4 bisa diuji tanpa kredensial asli: `php backend/tests/sigv4_test.php`
(memakai vektor uji publik AWS).

Daftar barang tidak memuat isi foto; view `v_barang_hari_ini` hanya mengirim penanda `foto_upload` (ukuran BYTEA),
dan versi URL foto dibentuk dari `foto_barang` + `foto_upload`. Katalog (peminjam dan guest) menampilkan 12 kartu per halaman (4 kolom desktop, 3 tablet, 2 HP); foto diklik untuk membuka modal foto penuh.

| Endpoint | Akses | Keterangan |
|---|---|---|
| `GET /api/barang/{id}/foto` | publik | proxy foto (BYTEA atau R2), Content-Type asli, Cache-Control 1 hari, ETag/304, 404 kalau tidak ada |
| `POST /api/barang/{id}/foto` | admin | body = isi file gambar; jenis dicek dari isi file, maks. 300 KB; ke R2, cadangan BYTEA |
| `DELETE /api/barang/{id}/foto` | admin | hapus foto unggahan (R2 atau BYTEA), kembali ke foto bawaan |
| `GET /api/barang/{id}/peminjaman` | login | peminjaman aktif/mendatang barang itu (status Disetujui/Dipinjam): nama OKI, tanggal, jumlah, status. Tanpa nama peminjam, NIM, no HP, atau PIN |

**Batas percobaan (dihitung per session).**
- Login: maksimal 5 gagal dalam 10 menit.
- PIN pembatalan pengajuan: 3 kali salah, lalu terkunci 5 menit (`BATAS_PIN_SALAH`, `LAMA_KUNCI_PIN` di
  `backend/src/session.php`). Respons PIN salah berisi sisa kesempatan; respons 429 berisi `errors.retry_after`
  (detik) dan header `Retry-After`, dipakai modal PIN untuk countdown. Hitungan direset setelah PIN benar.
