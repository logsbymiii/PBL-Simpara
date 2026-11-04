SET search_path TO public;
-- Catatan: file ini untuk database KOSONG. Tidak ada DROP SCHEMA supaya aman dijalankan di Neon.

-- Fungsi waktu WIB
CREATE OR REPLACE FUNCTION now_wib()
RETURNS TIMESTAMP
LANGUAGE sql
STABLE
AS $$
    SELECT now() AT TIME ZONE 'Asia/Jakarta';
$$;

-- 1. Oki
CREATE TABLE oki (
    id_oki      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nama_oki    VARCHAR(100) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    status_akun VARCHAR(20) NOT NULL DEFAULT 'Aktif'
                CHECK (status_akun IN ('Aktif', 'Nonaktif'))
);

-- 2. Admin
CREATE TABLE admin (
    id_admin    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username    VARCHAR(50) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    nama_admin  VARCHAR(100) NOT NULL,
    jabatan     VARCHAR(50),
    email       VARCHAR(100),
    no_hp       VARCHAR(20),
    foto_profil VARCHAR(255),
    role        VARCHAR(20) NOT NULL DEFAULT 'admin'
                CHECK (role IN ('admin', 'super_admin')),
    status_akun VARCHAR(20) NOT NULL DEFAULT 'Aktif'
                CHECK (status_akun IN ('Aktif', 'Nonaktif'))
);

-- 3. Kategori barang
CREATE TABLE kategori_barang (
    id_kategori   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nama_kategori VARCHAR(50) NOT NULL UNIQUE
);

-- 4. Barang
CREATE TABLE barang (
    id_barang   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kode_barang VARCHAR(20) NOT NULL UNIQUE,
    nama_barang VARCHAR(100) NOT NULL,
    id_kategori INT NOT NULL REFERENCES kategori_barang(id_kategori),
    stok_total  INT NOT NULL CHECK (stok_total >= 0),
    kondisi     VARCHAR(20) NOT NULL CHECK (kondisi IN ('Baik', 'Rusak')),
    foto_barang VARCHAR(255)
);

-- 5. Agenda HMTI
CREATE TABLE agenda_hmti (
    id_agenda       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nama_acara     VARCHAR(150) NOT NULL,
    tgl_mulai   DATE NOT NULL,
    tgl_selesai DATE NOT NULL,
    keterangan      VARCHAR(255),
    id_admin        INT NOT NULL REFERENCES admin(id_admin),
    CONSTRAINT chk_rentang_agenda CHECK (tgl_selesai >= tgl_mulai)
);

CREATE INDEX idx_agenda_tanggal
    ON agenda_hmti (tgl_mulai, tgl_selesai);

-- 6. Pengajuan
-- Data peminjam disimpan langsung pada pengajuan sesuai ERD;
-- tidak dibuat tabel peminjam terpisah.
CREATE TABLE pengajuan (
    id_pengajuan     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_oki           INT NOT NULL REFERENCES oki(id_oki),
    nama_peminjam    VARCHAR(100) NOT NULL,
    nim_peminjam     VARCHAR(20) NOT NULL,
    no_hp_peminjam   VARCHAR(20),
    nama_kegiatan    VARCHAR(100) NOT NULL,
    keperluan        TEXT,
    tgl_pinjam   TIMESTAMP NOT NULL,
    tgl_kembali  TIMESTAMP NOT NULL,
    tgl_diajukan TIMESTAMP NOT NULL DEFAULT now_wib(),
    status           VARCHAR(20) NOT NULL DEFAULT 'Menunggu'
                     CHECK (status IN (
                         'Menunggu', 'Disetujui', 'Dipinjam',
                         'Dikembalikan', 'Ditolak', 'Dibatalkan'
                     )),
    alasan_penolakan VARCHAR(255),
    CONSTRAINT chk_rentang_pengajuan
        CHECK (tgl_kembali >= tgl_pinjam),
    CONSTRAINT chk_alasan_penolakan
        CHECK (status <> 'Ditolak' OR alasan_penolakan IS NOT NULL)
);

CREATE INDEX idx_pengajuan_oki
    ON pengajuan (id_oki);
CREATE INDEX idx_pengajuan_status_waktu
    ON pengajuan (status, tgl_pinjam, tgl_kembali);
CREATE INDEX idx_pengajuan_nim
    ON pengajuan (nim_peminjam);

-- 7. Detail pengajuan
CREATE TABLE detail_pengajuan (
    id_detail_pengajuan    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_pengajuan INT NOT NULL REFERENCES pengajuan(id_pengajuan) ON DELETE CASCADE,
    id_barang    INT NOT NULL REFERENCES barang(id_barang),
    jumlah       INT NOT NULL CHECK (jumlah > 0),
    CONSTRAINT uq_detail_pengajuan_barang UNIQUE (id_pengajuan, id_barang)
);

CREATE INDEX idx_detail_pengajuan_barang
    ON detail_pengajuan (id_barang);

-- 8. Pengembalian (maksimal satu data pengembalian untuk satu pengajuan)
CREATE TABLE pengembalian (
    id_pengembalian        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_pengajuan           INT NOT NULL UNIQUE
                           REFERENCES pengajuan(id_pengajuan),
    id_admin               INT NOT NULL REFERENCES admin(id_admin),
    tgl_kembali_aktual TIMESTAMP NOT NULL DEFAULT now_wib(),
    catatan                VARCHAR(255)
);

-- 9. Detail pengembalian
CREATE TABLE detail_pengembalian (
    id_detail_pengembalian INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_pengembalian        INT NOT NULL
                           REFERENCES pengembalian(id_pengembalian) ON DELETE CASCADE,
    id_detail_pengajuan              INT NOT NULL
                           REFERENCES detail_pengajuan(id_detail_pengajuan),
    kondisi_brg_kembali    VARCHAR(20) NOT NULL
                           CHECK (kondisi_brg_kembali IN ('Baik', 'Rusak', 'Hilang')),
    catatan                VARCHAR(255),
    foto_bukti             VARCHAR(255),
    jumlah                 INT NOT NULL CHECK (jumlah > 0),
    CONSTRAINT uq_detail_pengembalian UNIQUE (id_pengembalian, id_detail_pengajuan)
);

-- 10. Riwayat status
CREATE TABLE riwayat_status (
    id_riwayat_status   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_pengajuan INT NOT NULL REFERENCES pengajuan(id_pengajuan) ON DELETE CASCADE,
    id_admin     INT REFERENCES admin(id_admin),
    id_oki       INT REFERENCES oki(id_oki),
    status_lama  VARCHAR(20),
    status_baru  VARCHAR(20) NOT NULL
                 CHECK (status_baru IN (
                     'Menunggu', 'Disetujui', 'Dipinjam',
                     'Dikembalikan', 'Ditolak', 'Dibatalkan'
                 )),
    waktu        TIMESTAMP NOT NULL DEFAULT now_wib(),
    alasan       VARCHAR(255),
    CONSTRAINT chk_riwayat_pelaku
        CHECK (id_admin IS NOT NULL OR id_oki IS NOT NULL)
);

CREATE INDEX idx_riwayat_oki
    ON riwayat_status (id_oki);
CREATE INDEX idx_riwayat_admin
    ON riwayat_status (id_admin);
CREATE INDEX idx_riwayat_pengajuan
    ON riwayat_status (id_pengajuan, waktu);

-- =========================================================
-- FUNGSI DAN VIEW PENDUKUNG
-- =========================================================

-- Sisa stok pada rentang waktu tertentu.
CREATE OR REPLACE FUNCTION fn_stok_tersedia(
    p_id_barang INT,
    p_mulai TIMESTAMP,
    p_selesai TIMESTAMP
)
RETURNS INT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_total INT;
    v_terpakai INT;
BEGIN
    SELECT stok_total
      INTO v_total
      FROM barang
     WHERE id_barang = p_id_barang
       AND kondisi <> 'Rusak';

    SELECT COALESCE(SUM(d.jumlah), 0)
      INTO v_terpakai
      FROM detail_pengajuan d
      JOIN pengajuan p ON p.id_pengajuan = d.id_pengajuan
     WHERE d.id_barang = p_id_barang
       AND p.status IN ('Disetujui', 'Dipinjam')
       AND p.tgl_pinjam <= p_selesai
       AND (CASE WHEN p.status = 'Dipinjam'
                 THEN GREATEST(p.tgl_kembali, now_wib())
                 ELSE p.tgl_kembali
            END) >= p_mulai;

    RETURN GREATEST(COALESCE(v_total, 0) - v_terpakai, 0);
END;
$$;

-- Menghitung agenda HMTI yang bertabrakan dengan rentang tanggal.
CREATE OR REPLACE FUNCTION fn_tanggal_terkunci(
    p_mulai TIMESTAMP,
    p_selesai TIMESTAMP
)
RETURNS INT
LANGUAGE sql
STABLE
AS $$
    SELECT COUNT(*)::INT
      FROM agenda_hmti
     WHERE tgl_mulai <= p_selesai::DATE
       AND tgl_selesai >= p_mulai::DATE;
$$;

-- View status stok barang hari ini.
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
       END AS status
  FROM barang b
 CROSS JOIN LATERAL (
     SELECT fn_stok_tersedia(
         b.id_barang,
         now_wib()::DATE::TIMESTAMP,
         now_wib()::DATE::TIMESTAMP + INTERVAL '1 day' - INTERVAL '1 second'
     ) AS stok_tersedia
 ) s;

-- View status pengajuan untuk kebutuhan tampilan aplikasi.
CREATE OR REPLACE VIEW v_pengajuan_status AS
SELECT p.*,
       CASE
           WHEN p.status = 'Menunggu' THEN 'Menunggu Verifikasi'
           WHEN p.status = 'Dipinjam' AND now_wib() > p.tgl_kembali
               THEN 'Terlambat'
           ELSE p.status
       END AS status_tampil,
       CASE
           WHEN p.status = 'Menunggu'
               THEN FLOOR(EXTRACT(EPOCH FROM (now_wib() - p.tgl_diajukan)) / 3600)::INT
       END AS jam_menunggu,
       CASE
           WHEN p.status = 'Menunggu'
            AND now_wib() - p.tgl_diajukan > INTERVAL '5 hours'
               THEN 1
           ELSE 0
       END AS peringatan_5_jam
  FROM pengajuan p;

-- View kalender gabungan peminjaman dan agenda HMTI.
CREATE OR REPLACE VIEW v_kalender AS
SELECT 'Peminjaman'::TEXT AS jenis,
       p.id_pengajuan AS id_ref,
       p.nama_peminjam || ' - ' || p.nama_kegiatan AS judul,
       p.tgl_pinjam AS tgl_mulai,
       p.tgl_kembali AS tgl_selesai,
       v.status_tampil
  FROM v_pengajuan_status v
  JOIN pengajuan p ON p.id_pengajuan = v.id_pengajuan
 WHERE p.status IN ('Disetujui', 'Dipinjam', 'Dikembalikan')
UNION ALL
SELECT 'Agenda HMTI'::TEXT,
       a.id_agenda,
       a.nama_acara::TEXT,
       a.tgl_mulai + TIME '00:00:00',
       a.tgl_selesai + TIME '23:59:59',
       'Agenda'::TEXT
  FROM agenda_hmti a;

-- Prosedur persetujuan: memeriksa stok semua barang sebelum menyetujui.
CREATE OR REPLACE PROCEDURE sp_setujui_pengajuan(
    p_id_pengajuan INT,
    p_id_admin INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status VARCHAR(20);
    v_mulai TIMESTAMP;
    v_selesai TIMESTAMP;
    r RECORD;
BEGIN
    SELECT status, tgl_pinjam, tgl_kembali
      INTO v_status, v_mulai, v_selesai
      FROM pengajuan
     WHERE id_pengajuan = p_id_pengajuan
     FOR UPDATE;

    IF NOT FOUND OR v_status <> 'Menunggu' THEN
        RAISE EXCEPTION 'Pengajuan tidak ditemukan atau sudah diproses';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM detail_pengajuan
         WHERE id_pengajuan = p_id_pengajuan
    ) THEN
        RAISE EXCEPTION 'Pengajuan tidak berisi barang';
    END IF;

    IF fn_tanggal_terkunci(v_mulai, v_selesai) > 0 THEN
        RAISE EXCEPTION 'Tanggal tersebut dipakai kegiatan internal HMTI';
    END IF;

    PERFORM 1
      FROM barang
     WHERE id_barang IN (
         SELECT id_barang
           FROM detail_pengajuan
          WHERE id_pengajuan = p_id_pengajuan
     )
     ORDER BY id_barang
     FOR UPDATE;

    FOR r IN
        SELECT d.id_barang, d.jumlah, b.nama_barang
          FROM detail_pengajuan d
          JOIN barang b ON b.id_barang = d.id_barang
         WHERE d.id_pengajuan = p_id_pengajuan
    LOOP
        IF fn_stok_tersedia(r.id_barang, v_mulai, v_selesai) < r.jumlah THEN
            RAISE EXCEPTION 'Stok % tidak mencukupi pada rentang waktu tersebut',
                r.nama_barang;
        END IF;
    END LOOP;

    UPDATE pengajuan
       SET status = 'Disetujui'
     WHERE id_pengajuan = p_id_pengajuan;

    INSERT INTO riwayat_status (
        id_pengajuan, id_admin, status_lama, status_baru, alasan
    )
    VALUES (
        p_id_pengajuan, p_id_admin, 'Menunggu', 'Disetujui',
        'Pengajuan disetujui oleh admin'
    );
END;
$$;

-- Tambah satu barang ke pengajuan yang baru dibuat (dipanggil per barang, dalam satu transaksi).
-- Menolak jika bentrok agenda HMTI, barang rusak, atau stok tidak cukup.
-- Catatan awal riwayat ("Menunggu", pelaku = OKI) dibuat sekali, saat barang pertama masuk.
CREATE OR REPLACE PROCEDURE sp_tambah_barang_pengajuan(
    p_id_pengajuan INT,
    p_id_barang INT,
    p_jumlah INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status VARCHAR(20);
    v_mulai TIMESTAMP;
    v_selesai TIMESTAMP;
    v_oki INT;
    v_nama VARCHAR(100);
    v_kondisi VARCHAR(20);
BEGIN
    SELECT status, tgl_pinjam, tgl_kembali, id_oki
      INTO v_status, v_mulai, v_selesai, v_oki
      FROM pengajuan
     WHERE id_pengajuan = p_id_pengajuan
     FOR UPDATE;

    IF NOT FOUND OR v_status <> 'Menunggu' THEN
        RAISE EXCEPTION 'Pengajuan tidak ditemukan atau sudah diproses';
    END IF;

    IF fn_tanggal_terkunci(v_mulai, v_selesai) > 0 THEN
        RAISE EXCEPTION 'Tanggal tersebut dipakai kegiatan internal HMTI, pengajuan tidak dapat dibuat';
    END IF;

    -- kunci baris barang supaya dua pengajuan tidak berebut stok yang sama
    SELECT nama_barang, kondisi
      INTO v_nama, v_kondisi
      FROM barang
     WHERE id_barang = p_id_barang
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Barang tidak ditemukan';
    END IF;
    IF v_kondisi = 'Rusak' THEN
        RAISE EXCEPTION 'Barang % sedang rusak dan tidak dapat dipinjam', v_nama;
    END IF;
    IF fn_stok_tersedia(p_id_barang, v_mulai, v_selesai) < p_jumlah THEN
        RAISE EXCEPTION 'Stok % tidak mencukupi pada rentang waktu tersebut', v_nama;
    END IF;

    INSERT INTO detail_pengajuan (id_pengajuan, id_barang, jumlah)
    VALUES (p_id_pengajuan, p_id_barang, p_jumlah);

    IF NOT EXISTS (SELECT 1 FROM riwayat_status WHERE id_pengajuan = p_id_pengajuan) THEN
        INSERT INTO riwayat_status (id_pengajuan, id_oki, status_lama, status_baru, alasan)
        VALUES (p_id_pengajuan, v_oki, NULL, 'Menunggu', 'Pengajuan dibuat');
    END IF;
END;
$$;

-- Tolak pengajuan (alasan wajib, sesuai constraint chk_alasan_penolakan).
CREATE OR REPLACE PROCEDURE sp_tolak_pengajuan(
    p_id_pengajuan INT,
    p_id_admin INT,
    p_alasan VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status VARCHAR(20);
BEGIN
    SELECT status INTO v_status
      FROM pengajuan
     WHERE id_pengajuan = p_id_pengajuan
     FOR UPDATE;

    IF NOT FOUND OR v_status <> 'Menunggu' THEN
        RAISE EXCEPTION 'Pengajuan tidak ditemukan atau sudah diproses';
    END IF;
    IF p_alasan IS NULL OR btrim(p_alasan) = '' THEN
        RAISE EXCEPTION 'Alasan penolakan wajib diisi';
    END IF;

    UPDATE pengajuan
       SET status = 'Ditolak', alasan_penolakan = p_alasan
     WHERE id_pengajuan = p_id_pengajuan;

    INSERT INTO riwayat_status (id_pengajuan, id_admin, status_lama, status_baru, alasan)
    VALUES (p_id_pengajuan, p_id_admin, 'Menunggu', 'Ditolak', p_alasan);
END;
$$;

-- Batalkan pengajuan oleh OKI pemiliknya (hanya saat masih Menunggu).
CREATE OR REPLACE PROCEDURE sp_batal_pengajuan(
    p_id_pengajuan INT,
    p_id_oki INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status VARCHAR(20);
BEGIN
    SELECT status INTO v_status
      FROM pengajuan
     WHERE id_pengajuan = p_id_pengajuan AND id_oki = p_id_oki
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pengajuan tidak ditemukan';
    END IF;
    IF v_status <> 'Menunggu' THEN
        RAISE EXCEPTION 'Pengajuan sudah diproses dan tidak dapat dibatalkan';
    END IF;

    UPDATE pengajuan SET status = 'Dibatalkan' WHERE id_pengajuan = p_id_pengajuan;

    INSERT INTO riwayat_status (id_pengajuan, id_oki, status_lama, status_baru, alasan)
    VALUES (p_id_pengajuan, p_id_oki, 'Menunggu', 'Dibatalkan', 'Dibatalkan oleh peminjam');
END;
$$;

-- Serah terima barang di tempat (Disetujui -> Dipinjam), dicatat admin yang menyerahkan.
CREATE OR REPLACE PROCEDURE sp_serah_terima_pengajuan(
    p_id_pengajuan INT,
    p_id_admin INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status VARCHAR(20);
BEGIN
    SELECT status INTO v_status
      FROM pengajuan
     WHERE id_pengajuan = p_id_pengajuan
     FOR UPDATE;

    IF NOT FOUND OR v_status <> 'Disetujui' THEN
        RAISE EXCEPTION 'Pengajuan tidak ditemukan atau belum berstatus Disetujui';
    END IF;

    UPDATE pengajuan SET status = 'Dipinjam' WHERE id_pengajuan = p_id_pengajuan;

    INSERT INTO riwayat_status (id_pengajuan, id_admin, status_lama, status_baru, alasan)
    VALUES (p_id_pengajuan, p_id_admin, 'Disetujui', 'Dipinjam', 'Barang diserahkan');
END;
$$;

-- Catat pengembalian.
-- p_detail = JSON [{"id_barang":1,"kondisi":"Baik","catatan":null,"jumlah":1}, ...]
--   "jumlah" boleh dikosongkan (dianggap semua unit yang dipinjam).
-- Setiap barang di pengajuan wajib punya kondisi. Unit 'Hilang' mengurangi stok_total.
CREATE OR REPLACE PROCEDURE sp_catat_pengembalian(
    p_id_pengajuan INT,
    p_id_admin INT,
    p_waktu TIMESTAMP,
    p_detail JSONB,
    p_catatan VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status VARCHAR(20);
    v_id_kembali INT;
    v_jumlah_barang INT;
    v_cocok INT;
BEGIN
    SELECT status INTO v_status
      FROM pengajuan
     WHERE id_pengajuan = p_id_pengajuan
     FOR UPDATE;

    IF NOT FOUND OR v_status <> 'Dipinjam' THEN
        RAISE EXCEPTION 'Pengajuan tidak ditemukan atau belum berstatus Dipinjam';
    END IF;

    SELECT COUNT(*) INTO v_jumlah_barang
      FROM detail_pengajuan WHERE id_pengajuan = p_id_pengajuan;

    SELECT COUNT(*) INTO v_cocok
      FROM detail_pengajuan d
      JOIN jsonb_to_recordset(p_detail) AS x(id_barang INT, kondisi TEXT, catatan TEXT, jumlah INT)
        ON x.id_barang = d.id_barang
     WHERE d.id_pengajuan = p_id_pengajuan;

    IF v_cocok <> v_jumlah_barang OR jsonb_array_length(p_detail) <> v_jumlah_barang THEN
        RAISE EXCEPTION 'Kondisi setiap barang dalam pengajuan wajib diisi dan tidak boleh ada barang di luar pengajuan';
    END IF;

    IF EXISTS (
        SELECT 1
          FROM detail_pengajuan d
          JOIN jsonb_to_recordset(p_detail) AS x(id_barang INT, kondisi TEXT, catatan TEXT, jumlah INT)
            ON x.id_barang = d.id_barang
         WHERE d.id_pengajuan = p_id_pengajuan
           AND COALESCE(x.jumlah, d.jumlah) NOT BETWEEN 1 AND d.jumlah
    ) THEN
        RAISE EXCEPTION 'Jumlah barang yang dikembalikan tidak boleh melebihi jumlah yang dipinjam';
    END IF;

    INSERT INTO pengembalian (id_pengajuan, id_admin, tgl_kembali_aktual, catatan)
    VALUES (p_id_pengajuan, p_id_admin, p_waktu, NULLIF(btrim(p_catatan), ''))
    RETURNING id_pengembalian INTO v_id_kembali;

    INSERT INTO detail_pengembalian (id_pengembalian, id_detail_pengajuan, kondisi_brg_kembali, catatan, jumlah)
    SELECT v_id_kembali, d.id_detail_pengajuan, x.kondisi, NULLIF(btrim(x.catatan), ''),
           COALESCE(x.jumlah, d.jumlah)
      FROM detail_pengajuan d
      JOIN jsonb_to_recordset(p_detail) AS x(id_barang INT, kondisi TEXT, catatan TEXT, jumlah INT)
        ON x.id_barang = d.id_barang
     WHERE d.id_pengajuan = p_id_pengajuan;

    UPDATE barang b
       SET stok_total = GREATEST(b.stok_total - COALESCE(x.jumlah, d.jumlah), 0)
      FROM detail_pengajuan d
      JOIN jsonb_to_recordset(p_detail) AS x(id_barang INT, kondisi TEXT, catatan TEXT, jumlah INT)
        ON x.id_barang = d.id_barang
     WHERE d.id_pengajuan = p_id_pengajuan
       AND b.id_barang = d.id_barang
       AND x.kondisi = 'Hilang';

    UPDATE pengajuan SET status = 'Dikembalikan' WHERE id_pengajuan = p_id_pengajuan;

    INSERT INTO riwayat_status (id_pengajuan, id_admin, status_lama, status_baru, waktu, alasan)
    VALUES (p_id_pengajuan, p_id_admin, 'Dipinjam', 'Dikembalikan', p_waktu, 'Barang dikembalikan');
END;
$$;
