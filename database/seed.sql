
INSERT INTO oki (nama_oki) VALUES
 ('HMTI'), ('UKM Theateristic'), ('UKM Musik'), ('BEM Fakultas'), ('UKM Fotografi'), ('UKM Olahraga');

INSERT INTO admin (username, password, nama_admin, jabatan, role) VALUES
 ('inventaris_hmti', '$2y$10$pvoLPce.4LCmWW5UImZJL.iyDIE5p.eMYKaOjMbhIi8qgzmlZdSV.', 'Raja Moreno Putra S.', 'Staf Inventaris', 'admin'),
 ('ketua_hmti',      '$2y$10$pvoLPce.4LCmWW5UImZJL.iyDIE5p.eMYKaOjMbhIi8qgzmlZdSV.', 'Daffa Azzi',          'Ketua HMTI',     'super_admin'),
 ('admin',           '$2y$10$pvoLPce.4LCmWW5UImZJL.iyDIE5p.eMYKaOjMbhIi8qgzmlZdSV.', 'Administrator',       'Super Admin',    'super_admin');

INSERT INTO peminjam (nim, nama_peminjam, email, no_hp, id_oki, password)
SELECT v.nim, v.nama, v.email, v.hp, o.id_oki, '$2y$10$3cvBzUKKZT7GGdbOVVe2Ae935HfnbP8wwGt9tqxWbZ/OPO1.UQu6K'
FROM (VALUES
 ('2310001','Aqillah Zakky Ramadhana','aqilah@mail.com','081200000001','UKM Theateristic'),
 ('2310002','Samudra Adhikara',       'samudra@mail.com','081200000002','HMTI'),
 ('2310003','Luna Apriana',           'luna@mail.com',   '081200000003','UKM Musik'),
 ('2310004','Citra Ayu',              'citra@mail.com',  '081200000004','BEM Fakultas'),
 ('2310005','Ragaska Abimana',        'ragaska@mail.com','081200000005','HMTI'),
 ('2310006','Dimas Pratama',          'dimas@mail.com',  '081200000006','UKM Fotografi'),
 ('2310007','Saba Nabila',            'saba@mail.com',   '081200000007','UKM Olahraga'),
 ('2310008','Rizky Fadillah',         'rizky@mail.com',  '081200000008','HMTI'),
 ('2310009','Nadia Putri',            'nadia@mail.com',  '081200000009','UKM Musik'),
 ('2310010','Bagas Saputra',          'bagas@mail.com',  '081200000010','BEM Fakultas')
) AS v(nim, nama, email, hp, oki) JOIN oki o ON o.nama_oki = v.oki;

INSERT INTO kategori_barang (nama_kategori) VALUES ('Elektronik'), ('Audio'), ('Perlengkapan Acara');

INSERT INTO barang (kode_barang, nama_barang, id_kategori, stok_total, kondisi)
SELECT v.kode, v.nama, k.id_kategori, v.stok, v.kondisi
FROM (VALUES
 ('BRG-001','Laptop',          'Elektronik',         3,'Baik'),
 ('BRG-002','Proyektor Epson', 'Elektronik',         1,'Baik'),
 ('BRG-003','Kamera',          'Elektronik',         3,'Baik'),
 ('BRG-004','Mikrofon',        'Audio',              4,'Baik'),
 ('BRG-005','Sound System',    'Audio',              1,'Baik'),
 ('BRG-006','White Screen',    'Perlengkapan Acara', 1,'Baik'),
 ('BRG-007','Kabel HDMI',      'Elektronik',         3,'Baik'),
 ('BRG-008','Handy Talky',     'Audio',              4,'Baik'),
 ('BRG-009','Karpet',          'Perlengkapan Acara', 2,'Baik'),
 ('BRG-010','Backdrop',        'Perlengkapan Acara', 1,'Rusak'),
 ('BRG-011','Tripod Kamera',   'Elektronik',         3,'Baik'),
 ('BRG-012','Terminal Kabel',  'Elektronik',         4,'Baik')   -- awalnya 5, 1 hilang (lihat pengajuan 3)
) AS v(kode, nama, kat, stok, kondisi) JOIN kategori_barang k ON k.nama_kategori = v.kat;

-- Agenda HMTI (tanggal terkunci), relatif dari hari ini. Sengaja tidak bentrok dengan pengajuan di bawah.
INSERT INTO agenda_hmti (nama_agenda, tanggal_mulai, tanggal_selesai, keterangan, id_admin)
SELECT v.nama, now_wib()::date + v.d1, now_wib()::date + v.d2, v.ket, a.id_admin
FROM (VALUES
 ('Rapat Pleno HMTI',      -20, -20, 'Rapat internal pengurus'),
 ('Seminar Nasional HMTI',  10,  11, 'Seluruh inventaris dipakai panitia internal'),
 ('Dies Natalis HMTI',      21,  22, 'Acara puncak tahunan')
) AS v(nama, d1, d2, ket)
CROSS JOIN (SELECT id_admin FROM admin WHERE username = 'ketua_hmti') a;

-- Pengajuan. id peminjam/admin dicari lewat nim/username supaya tidak bergantung urutan.
-- d(n) = hari ini (WIB) digeser n hari
CREATE TEMP TABLE _t AS SELECT now_wib()::date AS hari_ini;

INSERT INTO pengajuan
 (id_pengajuan, id_peminjam, nama_peminjaman, keperluan, tanggal_pinjam, tanggal_kembali, status,
  tanggal_diajukan, id_admin, tanggal_verifikasi, alasan_penolakan, id_admin_serah, tanggal_serah_terima)
OVERRIDING SYSTEM VALUE
SELECT v.id, (SELECT id_peminjam FROM peminjam WHERE nim = v.nim), v.judul, v.perlu,
       t.hari_ini + v.d_pinjam + v.j_pinjam, t.hari_ini + v.d_kembali + v.j_kembali, v.status,
       t.hari_ini + v.d_ajuan + TIME '10:00',
       (SELECT id_admin FROM admin WHERE username = v.adm),
       CASE WHEN v.adm IS NOT NULL THEN t.hari_ini + v.d_ajuan + TIME '14:00' END,
       v.tolak,
       CASE WHEN v.status IN ('Dipinjam','Dikembalikan') THEN (SELECT id_admin FROM admin WHERE username = v.adm) END,
       CASE WHEN v.status IN ('Dipinjam','Dikembalikan') THEN t.hari_ini + v.d_pinjam + v.j_pinjam END
FROM _t t, (VALUES
 -- id, nim, judul, keperluan, d_pinjam, jam, d_kembali, jam, status, d_ajuan, admin, alasan tolak
 (1,'2310001','Dokumentasi latihan teater','Merekam latihan',   -14,TIME '09:00',-12,TIME '17:00','Dikembalikan',-17,'inventaris_hmti',NULL),
 (2,'2310002','Presentasi proker HMTI',    'Rapat pleno',        -10,TIME '08:00', -9,TIME '17:00','Dikembalikan',-13,'inventaris_hmti',NULL),
 (3,'2310003','Koordinasi panitia konser', 'Gladi bersih',        -8,TIME '14:00', -7,TIME '22:00','Dikembalikan',-11,'ketua_hmti',     NULL),
 (4,'2310009','Acara gathering',           'Gathering anggota',   -5,TIME '08:00', -4,TIME '17:00','Ditolak',     -8,'inventaris_hmti','Barang sudah dipesan pihak lain'),
 (5,'2310006','Workshop fotografi',        'Workshop internal',   -3,TIME '09:00', -2,TIME '17:00','Dibatalkan',  -6,NULL,NULL),
 (6,'2310004','Rapat kerja BEM',           'Presentasi proker',    1,TIME '08:00',  2,TIME '17:00','Disetujui',    -2,'inventaris_hmti',NULL),
 (7,'2310001','Latihan pentas teater',     'Latihan vokal',       -1,TIME '13:00',  1,TIME '17:00','Dipinjam',     -3,'inventaris_hmti',NULL),
 (8,'2310004','Seminar fakultas',          'Seminar tamu',        -4,TIME '08:00', -1,TIME '20:00','Dipinjam',     -6,'ketua_hmti',     NULL),
 (9,'2310009','Latihan konser musik',      'Persiapan konser',     3,TIME '09:00',  4,TIME '21:00','Menunggu',      0,NULL,NULL),
 (10,'2310006','Dokumentasi turnamen',     'Dokumentasi acara',    5,TIME '08:00',  5,TIME '17:00','Menunggu',      0,NULL,NULL)
) AS v(id, nim, judul, perlu, d_pinjam, j_pinjam, d_kembali, j_kembali, status, d_ajuan, adm, tolak);

INSERT INTO detail_pengajuan (id_detail, id_pengajuan, id_barang, jumlah)
OVERRIDING SYSTEM VALUE
SELECT v.id, v.pj, (SELECT id_barang FROM barang WHERE kode_barang = v.kode), v.jml
FROM (VALUES
 (1,1,'BRG-001',1),(2,1,'BRG-003',1),
 (3,2,'BRG-007',2),(4,2,'BRG-011',1),
 (5,3,'BRG-012',1),(6,3,'BRG-004',1),
 (7,4,'BRG-002',1),
 (8,5,'BRG-003',1),
 (9,6,'BRG-002',1),(10,6,'BRG-006',1),
 (11,7,'BRG-004',2),(12,7,'BRG-005',1),
 (13,8,'BRG-008',2),
 (14,9,'BRG-001',2),
 (15,10,'BRG-003',1),(16,10,'BRG-011',1)
) AS v(id, pj, kode, jml);

-- Pengembalian untuk pengajuan 1-3 (baik semua, ada yang rusak, ada yang hilang)
INSERT INTO pengembalian (id_pengembalian, id_pengajuan, id_admin, tanggal_kembali_aktual, catatan)
OVERRIDING SYSTEM VALUE
SELECT v.id, v.pj, (SELECT id_admin FROM admin WHERE username = 'inventaris_hmti'),
       p.tanggal_kembali - v.selisih, v.cat
FROM (VALUES
 (1,1, INTERVAL '30 minutes','Dikembalikan tepat waktu'),
 (2,2, INTERVAL '15 minutes','Satu kabel HDMI rusak'),
 (3,3, INTERVAL '-10 hours', 'Terlambat; satu terminal kabel hilang')
) AS v(id, pj, selisih, cat) JOIN pengajuan p ON p.id_pengajuan = v.pj;

INSERT INTO detail_pengembalian (id_pengembalian, id_detail, kondisi, catatan, foto_bukti) VALUES
 (1,1,'Baik',NULL,NULL),(1,2,'Baik',NULL,NULL),
 (2,3,'Rusak','Konektor patah',NULL),(2,4,'Baik',NULL,NULL),
 (3,5,'Hilang','Tidak ditemukan saat pengecekan',NULL),(3,6,'Baik',NULL,NULL);

-- Riwayat status (dibuat dari data pengajuan di atas)
INSERT INTO riwayat_status (id_pengajuan, status_lama, status_baru, pelaku_role, id_pelaku, waktu, alasan)
SELECT id_pengajuan, NULL, 'Menunggu', 'peminjam', id_peminjam, tanggal_diajukan, NULL FROM pengajuan;

INSERT INTO riwayat_status (id_pengajuan, status_lama, status_baru, pelaku_role, id_pelaku, waktu, alasan)
SELECT id_pengajuan, 'Menunggu', 'Disetujui', 'admin', id_admin, tanggal_verifikasi, NULL
FROM pengajuan WHERE status IN ('Disetujui','Dipinjam','Dikembalikan');

INSERT INTO riwayat_status (id_pengajuan, status_lama, status_baru, pelaku_role, id_pelaku, waktu, alasan)
SELECT id_pengajuan, 'Menunggu', 'Ditolak', 'admin', id_admin, tanggal_verifikasi, alasan_penolakan
FROM pengajuan WHERE status = 'Ditolak';

INSERT INTO riwayat_status (id_pengajuan, status_lama, status_baru, pelaku_role, id_pelaku, waktu, alasan)
SELECT id_pengajuan, 'Menunggu', 'Dibatalkan', 'peminjam', id_peminjam, tanggal_diajukan + INTERVAL '1 hour', 'Dibatalkan oleh peminjam'
FROM pengajuan WHERE status = 'Dibatalkan';

INSERT INTO riwayat_status (id_pengajuan, status_lama, status_baru, pelaku_role, id_pelaku, waktu)
SELECT id_pengajuan, 'Disetujui', 'Dipinjam', 'admin', id_admin_serah, tanggal_serah_terima
FROM pengajuan WHERE status IN ('Dipinjam','Dikembalikan');

INSERT INTO riwayat_status (id_pengajuan, status_lama, status_baru, pelaku_role, id_pelaku, waktu)
SELECT p.id_pengajuan, 'Dipinjam', 'Dikembalikan', 'admin', g.id_admin, g.tanggal_kembali_aktual
FROM pengajuan p JOIN pengembalian g ON g.id_pengajuan = p.id_pengajuan;

-- Karena id diisi manual, geser penghitung identity supaya INSERT berikutnya tidak bentrok
SELECT setval(pg_get_serial_sequence('pengajuan','id_pengajuan'),               (SELECT MAX(id_pengajuan) FROM pengajuan));
SELECT setval(pg_get_serial_sequence('detail_pengajuan','id_detail'),           (SELECT MAX(id_detail) FROM detail_pengajuan));
SELECT setval(pg_get_serial_sequence('pengembalian','id_pengembalian'),         (SELECT MAX(id_pengembalian) FROM pengembalian));


-- =====================================================================
-- SIMPARA - Menampilkan tabel untuk presentasi schema dan seed
-- Jalankan SETELAH schema.sql dan seed.sql. Tiap baris SELECT dijalankan
-- sendiri-sendiri (urutan sama dengan schema.sql).
-- =====================================================================

-- 0. Daftar semua tabel dan view
SELECT table_name AS nama, table_type AS jenis
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_type, table_name;

-- 1. Struktur kolom satu tabel (ganti nama tabel di bawah sesuai kebutuhan)
SELECT column_name AS kolom, data_type AS tipe, is_nullable AS boleh_kosong
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'pengajuan'
ORDER BY ordinal_position;

-- =====================================================================
-- ISI TIAP TABEL (urutan sesuai schema.sql)
-- =====================================================================
SELECT * FROM oki;
SELECT * FROM admin;
SELECT * FROM peminjam;
SELECT * FROM kategori_barang;
SELECT * FROM barang;
SELECT * FROM agenda_hmti;
SELECT * FROM pengajuan;
SELECT * FROM detail_pengajuan;
SELECT * FROM pengembalian;
SELECT * FROM detail_pengembalian;
SELECT * FROM riwayat_status;

-- =====================================================================
-- VIEW (hasil perhitungan, bukan tabel asli)
-- =====================================================================
SELECT * FROM v_barang_hari_ini;
SELECT * FROM v_pengajuan_status;
SELECT * FROM v_kalender;

-- =====================================================================
-- RINGKASAN: jumlah baris semua tabel dalam satu tampilan
-- =====================================================================
SELECT 'oki' AS tabel, COUNT(*) AS jumlah_baris FROM oki
UNION ALL SELECT 'admin',               COUNT(*) FROM admin
UNION ALL SELECT 'peminjam',            COUNT(*) FROM peminjam
UNION ALL SELECT 'kategori_barang',     COUNT(*) FROM kategori_barang
UNION ALL SELECT 'barang',              COUNT(*) FROM barang
UNION ALL SELECT 'agenda_hmti',         COUNT(*) FROM agenda_hmti
UNION ALL SELECT 'pengajuan',           COUNT(*) FROM pengajuan
UNION ALL SELECT 'detail_pengajuan',    COUNT(*) FROM detail_pengajuan
UNION ALL SELECT 'pengembalian',        COUNT(*) FROM pengembalian
UNION ALL SELECT 'detail_pengembalian', COUNT(*) FROM detail_pengembalian
UNION ALL SELECT 'riwayat_status',      COUNT(*) FROM riwayat_status;

