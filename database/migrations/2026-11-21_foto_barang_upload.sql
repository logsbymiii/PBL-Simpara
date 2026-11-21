-- Migrasi: foto barang unggahan admin disimpan di database (Neon).
-- Jalankan SEKALI di database yang sudah ada (database baru cukup memakai schema.sql terbaru).
-- Tidak menghapus data apa pun.

SET search_path TO public;

BEGIN;

-- 1. Kolom foto unggahan (boleh kosong). Kalau kosong, aplikasi memakai foto bawaan
--    dari foto_barang (file statis di frontend/assets/images/barang/).
ALTER TABLE barang ADD COLUMN IF NOT EXISTS foto_data BYTEA;
ALTER TABLE barang ADD COLUMN IF NOT EXISTS foto_mime VARCHAR(30);

-- foto_data dan foto_mime selalu terisi bersama atau kosong bersama, mime hanya JPEG/PNG/WebP
ALTER TABLE barang ADD CONSTRAINT chk_foto_upload CHECK (
    (foto_data IS NULL) = (foto_mime IS NULL)
    AND (foto_mime IS NULL OR foto_mime IN ('image/jpeg', 'image/png', 'image/webp'))
);

-- 2. View daftar barang TIDAK memuat isi foto (bytea), hanya penanda foto_upload:
--    ukuran foto dalam byte (NULL kalau tidak ada). Dipakai frontend sebagai versi/cache-buster.
--    Kolom baru ditaruh paling akhir supaya CREATE OR REPLACE VIEW diterima PostgreSQL.
CREATE OR REPLACE VIEW v_barang_hari_ini AS
SELECT b.id_barang,
       b.kode_barang,
       b.nama_barang,
       b.id_kategori,
       b.stok_total,
       b.kondisi,
       b.foto_barang,
       s.stok_tersedia,
       CASE
           WHEN b.kondisi = 'Rusak' THEN 'Tidak Tersedia'
           WHEN s.stok_tersedia = 0 THEN 'Dipinjam'
           ELSE 'Tersedia'
       END AS status,
       octet_length(b.foto_data) AS foto_upload
  FROM barang b
 CROSS JOIN LATERAL (
     SELECT fn_stok_tersedia(
         b.id_barang,
         now_wib()::DATE::TIMESTAMP,
         now_wib()::DATE::TIMESTAMP + INTERVAL '1 day' - INTERVAL '1 second'
     ) AS stok_tersedia
 ) s;

COMMIT;

-- Cek hasil:
-- SELECT id_barang, nama_barang, foto_barang, foto_upload FROM v_barang_hari_ini ORDER BY kode_barang;
