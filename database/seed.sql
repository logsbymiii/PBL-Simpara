SET search_path TO public;

-- Password di bawah sudah berupa hash bcrypt (backend memakai password_verify).
-- Password awal sama dengan seed lama. GANTI sebelum dipakai publik.

-- 1. Oki / organisasi asal peminjam
INSERT INTO oki (nama_oki, password, status_akun) VALUES
('HMTI', '$2y$10$tEQ/G4OV.UYtLvmmVqyX7eL5LaiaS4OxJKm/ELwG6qdBDO.vybMlS', 'Aktif'),
('UKM Theateristic', '$2y$10$f.KsWxfWbbxPgmNmvBMAfOB4pBauUYRQFhEJpfEvAiTScsGhmbuqK', 'Aktif'),
('UKM Musik', '$2y$10$iWO6Ny4H3E2lxH6TJ9ef4uNdNeHez2exE2ilJQ.q8AP9Wl3bnae.S', 'Aktif'),
('BEM Fakultas', '$2y$10$7U86fqFDGgpOUjcoQO2/7ugNgMpn0ox8MH9itBaR3IswJKdkQXpQO', 'Aktif'),
('UKM Fotografi', '$2y$10$B7OsnyRxSVNj485lSdt8veAJq./AmDi3i.uWUSv2NjjvUXhECcLHq', 'Aktif'),
('UKM Olahraga', '$2y$10$Af/edKrPxCvzLNN5pxj/A.eeJIAKxIu35jJr0/D4GsdNbxJt2vs7i', 'Aktif');

-- 2. Admin
insert into admin (username, password, nama_admin, jabatan, email, no_hp, role, status_akun) values
('inventaris_hmti', '$2y$10$SPbamzFiR1U16yCGiAIhpuOKmu63K41d40Z2h.mpfJR3To8nmOLWK', 'Staf Inventaris', 'Staf Inventaris', null, null, 'admin', 'Aktif'),
('ketua_hmti', '$2y$10$KDUCL4HFXedge65Xeb9oX.ugnMigKBEzW3y5IxV02kOprarDKYdne', 'Daffa Azzi', 'Ketua HMTI', null, null, 'super_admin', 'Aktif'),
('admin', '$2y$10$lOUEA652dCMNl43pc2CnheZkOI30U7HEJ1mbqG3Rpqo17coe/AKHC', 'Administrator', 'Super Admin', null, null, 'super_admin', 'Aktif');

-- 3. Kategori barang
INSERT INTO kategori_barang (nama_kategori) VALUES
('Elektronik'), ('Audio'), ('Perlengkapan Acara');

-- 4. Barang
INSERT INTO barang (kode_barang, nama_barang, id_kategori, stok_total, kondisi)
SELECT v.kode, v.nama, k.id_kategori, v.stok, v.kondisi
  FROM (VALUES
    ('BRG-001', 'Laptop', 'Elektronik', 3, 'Baik'),
    ('BRG-002', 'Proyektor Epson', 'Elektronik', 1, 'Baik'),
    ('BRG-003', 'Kamera', 'Elektronik', 3, 'Baik'),
    ('BRG-004', 'Mikrofon', 'Audio', 4, 'Baik'),
    ('BRG-005', 'Sound System', 'Audio', 1, 'Baik'),
    ('BRG-006', 'White Screen', 'Perlengkapan Acara', 1, 'Baik'),
    ('BRG-007', 'Kabel HDMI', 'Elektronik', 3, 'Baik'),
    ('BRG-008', 'Handy Talky', 'Audio', 4, 'Baik'),
    ('BRG-009', 'Karpet', 'Perlengkapan Acara', 2, 'Baik'),
    ('BRG-010', 'Backdrop', 'Perlengkapan Acara', 1, 'Rusak'),
    ('BRG-011', 'Tripod Kamera', 'Elektronik', 3, 'Baik'),
    ('BRG-012', 'Terminal Kabel', 'Elektronik', 4, 'Baik')
  ) AS v(kode, nama, kategori, stok, kondisi)
  JOIN kategori_barang k ON k.nama_kategori = v.kategori;

-- 5. Agenda HMTI
INSERT INTO agenda_hmti
    (nama_acara, tgl_mulai, tgl_selesai, keterangan, id_admin)
SELECT v.nama,
       (now_wib()::DATE + v.hari_mulai),
       (now_wib()::DATE + v.hari_selesai),
       v.keterangan,
       a.id_admin
  FROM (VALUES
    ('Rapat Pleno HMTI', -20, -20, 'Rapat internal pengurus'),
    ('Seminar Nasional HMTI', 10, 11, 'Seluruh inventaris dipakai panitia internal'),
    ('Dies Natalis HMTI', 21, 22, 'Acara puncak tahunan')
  ) AS v(nama, hari_mulai, hari_selesai, keterangan)
 CROSS JOIN (
    SELECT id_admin FROM admin WHERE username = 'ketua_hmti'
 ) a;

-- 6. Pengajuan
-- Identitas peminjam disimpan langsung di pengajuan sesuai ERD (tanpa tabel peminjam).
INSERT INTO pengajuan (
    id_pengajuan, id_oki, nama_peminjam, nim_peminjam, no_hp_peminjam,
    nama_kegiatan, keperluan, tgl_pinjam, tgl_kembali,
    status, tgl_diajukan, alasan_penolakan
)
OVERRIDING SYSTEM VALUE
SELECT v.id,
       o.id_oki,
       v.nama_peminjam,
       v.nim,
       v.no_hp,
       v.nama_kegiatan,
       v.keperluan,
       t.hari_ini + v.hari_pinjam + v.jam_pinjam,
       t.hari_ini + v.hari_kembali + v.jam_kembali,
       v.status,
       t.hari_ini + v.hari_pengajuan + TIME '10:00',
       v.alasan_penolakan
  FROM (SELECT now_wib()::DATE AS hari_ini) t
 CROSS JOIN (VALUES
    (1, 'UKM Theateristic', 'Aqillah Zakky Ramadhana', '2310001', '081200000001', 'Dokumentasi latihan teater', 'Merekam latihan', -14, TIME '09:00', -12, TIME '17:00', 'Dikembalikan', -17, NULL),
    (2, 'HMTI', 'Samudra Adhikara', '2310002', '081200000002', 'Presentasi proker HMTI', 'Rapat pleno', -10, TIME '08:00', -9, TIME '17:00', 'Dikembalikan', -13, NULL),
    (3, 'UKM Musik', 'Luna Apriana', '2310003', '081200000003', 'Koordinasi panitia konser', 'Gladi bersih', -8, TIME '14:00', -7, TIME '22:00', 'Dikembalikan', -11, NULL),
    (4, 'UKM Musik', 'Nadia Putri', '2310009', '081200000009', 'Acara gathering', 'Gathering anggota', -5, TIME '08:00', -4, TIME '17:00', 'Ditolak', -8, 'Barang sudah dipesan pihak lain'),
    (5, 'UKM Fotografi', 'Dimas Pratama', '2310006', '081200000006', 'Workshop fotografi', 'Workshop internal', -3, TIME '09:00', -2, TIME '17:00', 'Dibatalkan', -6, NULL),
    (6, 'BEM Fakultas', 'Citra Ayu', '2310004', '081200000004', 'Rapat kerja BEM', 'Presentasi proker', 1, TIME '08:00', 2, TIME '17:00', 'Disetujui', -2, NULL),
    (7, 'UKM Theateristic', 'Aqillah Zakky Ramadhana', '2310001', '081200000001', 'Latihan pentas teater', 'Latihan vokal', -1, TIME '13:00', 1, TIME '17:00', 'Dipinjam', -3, NULL),
    (8, 'BEM Fakultas', 'Citra Ayu', '2310004', '081200000004', 'Seminar fakultas', 'Seminar tamu', -4, TIME '08:00', -1, TIME '20:00', 'Dipinjam', -6, NULL),
    (9, 'UKM Musik', 'Nadia Putri', '2310009', '081200000009', 'Latihan konser musik', 'Persiapan konser', 3, TIME '09:00', 4, TIME '21:00', 'Menunggu', 0, NULL),
    (10, 'UKM Fotografi', 'Dimas Pratama', '2310006', '081200000006', 'Dokumentasi turnamen', 'Dokumentasi acara', 5, TIME '08:00', 5, TIME '17:00', 'Menunggu', 0, NULL)
  ) AS v(
    id, nama_oki, nama_peminjam, nim, no_hp, nama_kegiatan, keperluan,
    hari_pinjam, jam_pinjam, hari_kembali, jam_kembali, status,
    hari_pengajuan, alasan_penolakan
  )
  JOIN oki o ON o.nama_oki = v.nama_oki;

-- 7. Detail pengajuan
INSERT INTO detail_pengajuan (id_detail_pengajuan, id_pengajuan, id_barang, jumlah)
OVERRIDING SYSTEM VALUE
SELECT v.id, v.id_pengajuan, b.id_barang, v.jumlah
  FROM (VALUES
    (1, 1, 'BRG-001', 1), (2, 1, 'BRG-003', 1),
    (3, 2, 'BRG-007', 2), (4, 2, 'BRG-011', 1),
    (5, 3, 'BRG-012', 1), (6, 3, 'BRG-004', 1),
    (7, 4, 'BRG-002', 1),
    (8, 5, 'BRG-003', 1),
    (9, 6, 'BRG-002', 1), (10, 6, 'BRG-006', 1),
    (11, 7, 'BRG-004', 2), (12, 7, 'BRG-005', 1),
    (13, 8, 'BRG-008', 2),
    (14, 9, 'BRG-001', 2),
    (15, 10, 'BRG-003', 1), (16, 10, 'BRG-011', 1)
  ) AS v(id, id_pengajuan, kode_barang, jumlah)
  JOIN barang b ON b.kode_barang = v.kode_barang;

-- 8. Pengembalian untuk pengajuan 1-3
INSERT INTO pengembalian (
    id_pengembalian, id_pengajuan, id_admin, tgl_kembali_aktual, catatan
)
OVERRIDING SYSTEM VALUE
SELECT v.id,
       v.id_pengajuan,
       a.id_admin,
       p.tgl_kembali - v.selisih,
       v.catatan
  FROM (VALUES
    (1, 1, INTERVAL '30 minutes', 'Dikembalikan tepat waktu'),
    (2, 2, INTERVAL '15 minutes', 'Satu kabel HDMI rusak'),
    (3, 3, INTERVAL '-10 hours', 'Terlambat; satu terminal kabel hilang')
  ) AS v(id, id_pengajuan, selisih, catatan)
  JOIN pengajuan p ON p.id_pengajuan = v.id_pengajuan
 CROSS JOIN (
    SELECT id_admin FROM admin WHERE username = 'inventaris_hmti'
 ) a;

-- 9. Detail pengembalian (termasuk jumlah barang yang diperiksa)
INSERT INTO detail_pengembalian (
    id_pengembalian, id_detail_pengajuan, kondisi_brg_kembali, catatan, foto_bukti, jumlah
) VALUES
    (1, 1, 'Baik', NULL, NULL, 1),
    (1, 2, 'Baik', NULL, NULL, 1),
    (2, 3, 'Rusak', 'Konektor patah', NULL, 2),
    (2, 4, 'Baik', NULL, NULL, 1),
    (3, 5, 'Hilang', 'Tidak ditemukan saat pengecekan', NULL, 1),
    (3, 6, 'Baik', NULL, NULL, 1);

-- 10. Riwayat status pengajuan (alur lengkap sesuai status akhir tiap pengajuan)
-- Pelaku OKI: pengajuan dibuat dan dibatalkan. Pelaku admin: verifikasi, serah terima, pengembalian.
INSERT INTO riwayat_status (id_pengajuan, id_oki, status_lama, status_baru, waktu, alasan)
SELECT p.id_pengajuan, p.id_oki, NULL, 'Menunggu', p.tgl_diajukan, 'Pengajuan dibuat'
  FROM pengajuan p;

INSERT INTO riwayat_status (id_pengajuan, id_oki, status_lama, status_baru, waktu, alasan)
SELECT p.id_pengajuan, p.id_oki, 'Menunggu', 'Dibatalkan',
       p.tgl_diajukan + INTERVAL '1 hour', 'Dibatalkan oleh peminjam'
  FROM pengajuan p
 WHERE p.status = 'Dibatalkan';

INSERT INTO riwayat_status (id_pengajuan, id_admin, status_lama, status_baru, waktu, alasan)
SELECT p.id_pengajuan, a.id_admin, 'Menunggu', 'Ditolak',
       p.tgl_diajukan + INTERVAL '2 hours', p.alasan_penolakan
  FROM pengajuan p
 CROSS JOIN (SELECT id_admin FROM admin WHERE username = 'inventaris_hmti') a
 WHERE p.status = 'Ditolak';

INSERT INTO riwayat_status (id_pengajuan, id_admin, status_lama, status_baru, waktu, alasan)
SELECT p.id_pengajuan, a.id_admin, 'Menunggu', 'Disetujui',
       p.tgl_diajukan + INTERVAL '2 hours', 'Pengajuan disetujui oleh admin'
  FROM pengajuan p
 CROSS JOIN (SELECT id_admin FROM admin WHERE username = 'inventaris_hmti') a
 WHERE p.status IN ('Disetujui', 'Dipinjam', 'Dikembalikan');

INSERT INTO riwayat_status (id_pengajuan, id_admin, status_lama, status_baru, waktu, alasan)
SELECT p.id_pengajuan, a.id_admin, 'Disetujui', 'Dipinjam', p.tgl_pinjam, 'Barang diserahkan'
  FROM pengajuan p
 CROSS JOIN (SELECT id_admin FROM admin WHERE username = 'inventaris_hmti') a
 WHERE p.status IN ('Dipinjam', 'Dikembalikan');

INSERT INTO riwayat_status (id_pengajuan, id_admin, status_lama, status_baru, waktu, alasan)
SELECT r.id_pengajuan, r.id_admin, 'Dipinjam', 'Dikembalikan', r.tgl_kembali_aktual, 'Barang dikembalikan'
  FROM pengembalian r;

-- Atur sequence setelah seed menggunakan ID eksplisit.
SELECT setval(pg_get_serial_sequence('pengajuan', 'id_pengajuan'), (SELECT MAX(id_pengajuan) FROM pengajuan));
SELECT setval(pg_get_serial_sequence('detail_pengajuan', 'id_detail_pengajuan'), (SELECT MAX(id_detail_pengajuan) FROM detail_pengajuan));
SELECT setval(pg_get_serial_sequence('pengembalian', 'id_pengembalian'), (SELECT MAX(id_pengembalian) FROM pengembalian));