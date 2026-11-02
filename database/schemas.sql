
CREATE FUNCTION now_wib() RETURNS TIMESTAMP
LANGUAGE sql STABLE
AS $$ SELECT now() AT TIME ZONE 'Asia/Jakarta' $$;

-- 1. oki (organisasi asal peminjam)
CREATE TABLE oki (
    id_oki    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nama_oki  VARCHAR(100) NOT NULL UNIQUE
);

-- 2. admin (admin biasa dan super admin)
CREATE TABLE admin (
    id_admin     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username     VARCHAR(50)  NOT NULL UNIQUE,
    password     VARCHAR(255) NOT NULL,                 -- hash dari password_hash(), bukan teks asli
    nama_admin   VARCHAR(100) NOT NULL,
    jabatan      VARCHAR(50),
    email        VARCHAR(100),
    no_hp        VARCHAR(20),
    foto_profil  VARCHAR(255),
    role         VARCHAR(20)  NOT NULL DEFAULT 'admin'
                 CHECK (role IN ('admin', 'super_admin')),
    status_akun  VARCHAR(20)  NOT NULL DEFAULT 'Aktif'
                 CHECK (status_akun IN ('Aktif', 'Nonaktif'))
);

-- 3. peminjam
CREATE TABLE peminjam (
    id_peminjam    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nim            VARCHAR(20)  NOT NULL UNIQUE,
    nama_peminjam  VARCHAR(100) NOT NULL,
    email          VARCHAR(100) NOT NULL,
    no_hp          VARCHAR(20),
    id_oki         INT REFERENCES oki(id_oki),
    password       VARCHAR(255) NOT NULL,               -- hash dari password_hash()
    foto_profil    VARCHAR(255),
    tanggal_daftar DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jakarta')::date,
    status_akun    VARCHAR(20)  NOT NULL DEFAULT 'Aktif'
                   CHECK (status_akun IN ('Aktif', 'Nonaktif'))
);
-- email unik tanpa membedakan huruf besar/kecil (kode PHP memakai LOWER(email))
CREATE UNIQUE INDEX ux_peminjam_email ON peminjam (LOWER(email));

-- 4. kategori_barang
CREATE TABLE kategori_barang (
    id_kategori    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nama_kategori  VARCHAR(50) NOT NULL UNIQUE
);

-- 5. barang
--    Stok "tersedia" TIDAK disimpan. Yang disimpan hanya stok_total (jumlah fisik).
--    Ketersediaan dihitung per rentang waktu lewat fn_stok_tersedia().
--    Kalau ada unit yang hilang, kurangi stok_total.
CREATE TABLE barang (
    id_barang    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kode_barang  VARCHAR(20)  NOT NULL UNIQUE,
    nama_barang  VARCHAR(100) NOT NULL,
    id_kategori  INT REFERENCES kategori_barang(id_kategori),
    stok_total   INT NOT NULL CHECK (stok_total >= 0),
    kondisi      VARCHAR(20) NOT NULL CHECK (kondisi IN ('Baik', 'Rusak')),
    foto_barang  VARCHAR(255)
);

-- 5b. agenda_hmti: tanggal (seharian penuh) yang dikunci untuk kegiatan internal HMTI.
--     Selama rentang agenda, SEMUA pengajuan peminjaman ditolak sistem.
CREATE TABLE agenda_hmti (
    id_agenda        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nama_agenda      VARCHAR(150) NOT NULL,
    tanggal_mulai    DATE NOT NULL,
    tanggal_selesai  DATE NOT NULL,
    keterangan       VARCHAR(255),
    id_admin         INT REFERENCES admin(id_admin),    -- admin yang mengunci tanggal
    CONSTRAINT chk_rentang_agenda CHECK (tanggal_selesai >= tanggal_mulai)
);
CREATE INDEX idx_agenda_tanggal ON agenda_hmti (tanggal_mulai, tanggal_selesai);

-- 6. pengajuan (satu baris = satu pengajuan, isi barangnya ada di detail_pengajuan)
CREATE TABLE pengajuan (
    id_pengajuan          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_peminjam           INT NOT NULL REFERENCES peminjam(id_peminjam),
    nama_peminjaman       VARCHAR(100) NOT NULL,        -- judul kegiatan
    keperluan             TEXT,
    tanggal_pinjam        TIMESTAMP NOT NULL,
    tanggal_kembali       TIMESTAMP NOT NULL,           -- rencana kembali
    status                VARCHAR(20) NOT NULL DEFAULT 'Menunggu'
                          CHECK (status IN ('Menunggu', 'Disetujui', 'Dipinjam',
                                            'Dikembalikan', 'Ditolak', 'Dibatalkan')),
    tanggal_diajukan      TIMESTAMP NOT NULL DEFAULT now_wib(),
    id_admin              INT REFERENCES admin(id_admin),   -- yang memverifikasi
    tanggal_verifikasi    TIMESTAMP,
    alasan_penolakan      VARCHAR(255),
    id_admin_serah        INT REFERENCES admin(id_admin),   -- yang menyerahkan barang
    tanggal_serah_terima  TIMESTAMP,
    CONSTRAINT chk_rentang CHECK (tanggal_kembali >= tanggal_pinjam),
    CONSTRAINT chk_alasan_tolak CHECK (status <> 'Ditolak' OR alasan_penolakan IS NOT NULL)
);

-- 7. detail_pengajuan (barang apa saja dalam satu pengajuan)
CREATE TABLE detail_pengajuan (
    id_detail     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_pengajuan  INT NOT NULL REFERENCES pengajuan(id_pengajuan) ON DELETE CASCADE,
    id_barang     INT NOT NULL REFERENCES barang(id_barang),
    jumlah        INT NOT NULL CHECK (jumlah > 0),
    UNIQUE (id_pengajuan, id_barang)
);

-- Index untuk mempercepat pengecekan jadwal yang tumpang tindih
CREATE INDEX idx_pengajuan_status_waktu ON pengajuan (status, tanggal_pinjam, tanggal_kembali);
CREATE INDEX idx_detail_barang ON detail_pengajuan (id_barang);
CREATE INDEX idx_pengajuan_peminjam ON pengajuan (id_peminjam);

-- 8. pengembalian (satu pengajuan dikembalikan satu kali)
CREATE TABLE pengembalian (
    id_pengembalian         INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_pengajuan            INT NOT NULL UNIQUE REFERENCES pengajuan(id_pengajuan),
    id_admin                INT REFERENCES admin(id_admin),
    tanggal_kembali_aktual  TIMESTAMP NOT NULL DEFAULT now_wib(),
    catatan                 VARCHAR(255)
);

-- 9. detail_pengembalian (kondisi tiap barang saat dikembalikan)
CREATE TABLE detail_pengembalian (
    id_detail_pengembalian  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_pengembalian         INT NOT NULL REFERENCES pengembalian(id_pengembalian) ON DELETE CASCADE,
    id_detail               INT NOT NULL REFERENCES detail_pengajuan(id_detail),
    kondisi                 VARCHAR(20) NOT NULL CHECK (kondisi IN ('Baik', 'Rusak', 'Hilang')),
    catatan                 VARCHAR(255),
    foto_bukti              VARCHAR(255),               -- lokasi/URL foto bukti
    UNIQUE (id_pengembalian, id_detail)
);

-- 10. riwayat_status (log setiap perubahan status: untuk tracking dan koreksi)
CREATE TABLE riwayat_status (
    id_riwayat    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_pengajuan  INT NOT NULL REFERENCES pengajuan(id_pengajuan) ON DELETE CASCADE,
    status_lama   VARCHAR(20),                          -- NULL untuk pengajuan baru
    status_baru   VARCHAR(20) NOT NULL,
    pelaku_role   VARCHAR(20) NOT NULL
                  CHECK (pelaku_role IN ('peminjam', 'admin', 'super_admin', 'sistem')),
    id_pelaku     INT,                                  -- id_peminjam atau id_admin, sesuai pelaku_role
    waktu         TIMESTAMP NOT NULL DEFAULT now_wib(),
    alasan        VARCHAR(255)
);
CREATE INDEX idx_riwayat_pengajuan ON riwayat_status (id_pengajuan, waktu);

-- =====================================================
-- LOGIKA STOK PER RENTANG WAKTU
-- Sisa stok pada rentang [mulai, selesai] =
--   stok_total - SUM(jumlah pada pengajuan yang menahan stok dan tumpang tindih)
-- Pengajuan yang menahan stok:
--   - Disetujui : menahan sampai tanggal_kembali (belum diambil)
--   - Dipinjam  : menahan sampai tanggal_kembali, atau sampai sekarang kalau terlambat
-- Dua rentang tumpang tindih jika: mulai_A <= selesai_B  DAN  selesai_A >= mulai_B
-- Barang berkondisi 'Rusak' dianggap tidak bisa dipinjam (sisa = 0).
-- =====================================================

-- 11. Fungsi: sisa stok satu barang pada rentang waktu tertentu
CREATE FUNCTION fn_stok_tersedia(p_id_barang INT, p_mulai TIMESTAMP, p_selesai TIMESTAMP)
RETURNS INT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_total    INT;
    v_terpakai INT;
BEGIN
    SELECT stok_total INTO v_total
    FROM barang
    WHERE id_barang = p_id_barang AND kondisi <> 'Rusak';

    SELECT COALESCE(SUM(d.jumlah), 0) INTO v_terpakai
    FROM detail_pengajuan d
    JOIN pengajuan p ON p.id_pengajuan = d.id_pengajuan
    WHERE d.id_barang = p_id_barang
      AND p.status IN ('Disetujui', 'Dipinjam')
      AND p.tanggal_pinjam <= p_selesai
      AND (CASE WHEN p.status = 'Dipinjam'
                THEN GREATEST(p.tanggal_kembali, now_wib())
                ELSE p.tanggal_kembali
           END) >= p_mulai;

    RETURN GREATEST(COALESCE(v_total, 0) - v_terpakai, 0);
END;
$$;

-- 11b. Fungsi: jumlah agenda HMTI yang bertepatan dengan rentang waktu (> 0 = terkunci).
--      Agenda berlaku seharian, jadi yang dibandingkan hanya bagian tanggalnya.
CREATE FUNCTION fn_tanggal_terkunci(p_mulai TIMESTAMP, p_selesai TIMESTAMP)
RETURNS INT
LANGUAGE sql STABLE
AS $$
    SELECT COUNT(*)::INT
    FROM agenda_hmti
    WHERE tanggal_mulai <= p_selesai::DATE AND tanggal_selesai >= p_mulai::DATE;
$$;

-- 12. View: stok dan status barang "hari ini" (dipakai kartu statistik dan Data Barang admin)
CREATE VIEW v_barang_hari_ini AS
SELECT b.id_barang, b.kode_barang, b.nama_barang, b.id_kategori,
       b.stok_total, b.kondisi, b.foto_barang,
       s.stok_tersedia,
       CASE
         WHEN b.kondisi = 'Rusak'  THEN 'Tidak Tersedia'
         WHEN s.stok_tersedia = 0  THEN 'Dipinjam'
         ELSE 'Tersedia'
       END AS status
FROM barang b
CROSS JOIN LATERAL (
    SELECT fn_stok_tersedia(
               b.id_barang,
               now_wib()::date::timestamp,
               now_wib()::date::timestamp + INTERVAL '1 day' - INTERVAL '1 second'
           ) AS stok_tersedia
) s;

-- 12b. View: status pengajuan untuk front-end.
--   status           = nilai asli di database
--   status_tampil    = Menunggu Verifikasi / Disetujui / Dipinjam / Terlambat /
--                      Dikembalikan / Ditolak / Dibatalkan
--                      ("Terlambat" = Dipinjam yang sudah melewati tanggal_kembali)
--   peringatan_5_jam = 1 bila masih Menunggu dan sudah > 5 jam sejak diajukan
CREATE VIEW v_pengajuan_status AS
SELECT p.id_pengajuan, p.id_peminjam, p.nama_peminjaman, p.keperluan,
       p.tanggal_pinjam, p.tanggal_kembali, p.status, p.tanggal_diajukan,
       p.id_admin, p.tanggal_verifikasi, p.alasan_penolakan,
       p.id_admin_serah, p.tanggal_serah_terima,
       CASE
         WHEN p.status = 'Menunggu'                                     THEN 'Menunggu Verifikasi'
         WHEN p.status = 'Dipinjam' AND now_wib() > p.tanggal_kembali   THEN 'Terlambat'
         ELSE p.status
       END AS status_tampil,
       CASE WHEN p.status = 'Menunggu'
            THEN FLOOR(EXTRACT(EPOCH FROM (now_wib() - p.tanggal_diajukan)) / 3600)::INT
       END AS jam_menunggu,
       CASE WHEN p.status = 'Menunggu'
             AND now_wib() - p.tanggal_diajukan > INTERVAL '5 hours'
            THEN 1 ELSE 0
       END AS peringatan_5_jam
FROM pengajuan p;

-- 12c. View: kalender = peminjaman (Disetujui / Dipinjam / Dikembalikan) + agenda HMTI
--      (agenda seharian penuh: 00:00 - 23:59:59). status_tampil dibawa supaya UI bisa
--      memberi warna (mis. Terlambat merah).
CREATE VIEW v_kalender AS
SELECT 'Peminjaman'::text AS jenis, v.id_pengajuan AS id_ref,
       m.nama_peminjam || ' - ' || v.nama_peminjaman AS judul,
       v.tanggal_pinjam AS tanggal_mulai, v.tanggal_kembali AS tanggal_selesai,
       v.status_tampil
FROM v_pengajuan_status v
JOIN peminjam m ON m.id_peminjam = v.id_peminjam
WHERE v.status IN ('Disetujui', 'Dipinjam', 'Dikembalikan')
UNION ALL
SELECT 'Agenda HMTI'::text, id_agenda, nama_agenda::text,
       tanggal_mulai + TIME '00:00:00', tanggal_selesai + TIME '23:59:59',
       'Agenda'::text
FROM agenda_hmti;

-- 13. Prosedur persetujuan: cek stok SEMUA barang dalam pengajuan, lalu setujui,
--     dalam satu transaksi. Jika ada RAISE EXCEPTION, semua perubahan dibatalkan.
--     Baris dikunci (FOR UPDATE, urut id_barang agar tidak saling kunci) supaya dua
--     admin tidak bisa menyetujui dua pengajuan yang berebut sisa stok terakhir.
CREATE PROCEDURE sp_setujui_pengajuan(p_id_pengajuan INT, p_id_admin INT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status  VARCHAR(20);
    v_mulai   TIMESTAMP;
    v_selesai TIMESTAMP;
    r         RECORD;
BEGIN
    SELECT status, tanggal_pinjam, tanggal_kembali
      INTO v_status, v_mulai, v_selesai
    FROM pengajuan
    WHERE id_pengajuan = p_id_pengajuan
    FOR UPDATE;

    IF NOT FOUND OR v_status <> 'Menunggu' THEN
        RAISE EXCEPTION 'Pengajuan tidak ditemukan atau sudah diproses';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM detail_pengajuan WHERE id_pengajuan = p_id_pengajuan) THEN
        RAISE EXCEPTION 'Pengajuan tidak berisi barang';
    END IF;

    PERFORM 1
    FROM barang
    WHERE id_barang IN (SELECT id_barang FROM detail_pengajuan WHERE id_pengajuan = p_id_pengajuan)
    ORDER BY id_barang
    FOR UPDATE;

    FOR r IN
        SELECT d.id_barang, d.jumlah, b.nama_barang
        FROM detail_pengajuan d
        JOIN barang b ON b.id_barang = d.id_barang
        WHERE d.id_pengajuan = p_id_pengajuan
    LOOP
        IF fn_stok_tersedia(r.id_barang, v_mulai, v_selesai) < r.jumlah THEN
            RAISE EXCEPTION 'Stok % tidak mencukupi pada rentang waktu tersebut', r.nama_barang;
        END IF;
    END LOOP;

    UPDATE pengajuan
    SET status = 'Disetujui', id_admin = p_id_admin, tanggal_verifikasi = now_wib()
    WHERE id_pengajuan = p_id_pengajuan;

    INSERT INTO riwayat_status (id_pengajuan, status_lama, status_baru, pelaku_role, id_pelaku)
    VALUES (p_id_pengajuan, 'Menunggu', 'Disetujui', 'admin', p_id_admin);
END;
$$;

