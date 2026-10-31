<?php
declare(strict_types=1);

class LaporanController
{
    // GET /api/laporan/peminjaman?dari=2026-09-01&sampai=2026-09-30  (admin)
    // Semua peminjaman, satu baris per barang. dari/sampai boleh dikosongkan.
    public static function peminjaman(array $params = []): void
    {
        requireAdmin();

        $dari   = self::tanggalOpsional('dari');
        $sampai = self::tanggalOpsional('sampai');
        if ($dari !== null && $sampai !== null && $dari > $sampai) {
            json_error('Tanggal dari tidak boleh setelah tanggal sampai', 422);
        }

        $where = [];
        $bind  = [];

        // Ambil yang rentang pinjamnya beririsan dengan dari-sampai
        if ($dari !== null) {
            $where[]      = 'p.tanggal_kembali >= CAST(:dari AS TIMESTAMP)';
            $bind['dari'] = $dari . ' 00:00:00';
        }
        if ($sampai !== null) {
            $where[]        = 'p.tanggal_pinjam <= CAST(:sampai AS TIMESTAMP)';
            $bind['sampai'] = $sampai . ' 23:59:59';
        }

        $sql = 'SELECT p.id_pengajuan, m.nim, m.nama_peminjam, o.nama_oki, b.nama_barang,
                       d.jumlah, p.tanggal_pinjam, p.tanggal_kembali, v.status_tampil
                FROM pengajuan p
                JOIN v_pengajuan_status v ON v.id_pengajuan = p.id_pengajuan
                JOIN peminjam m           ON m.id_peminjam  = p.id_peminjam
                LEFT JOIN oki o           ON o.id_oki       = m.id_oki
                JOIN detail_pengajuan d   ON d.id_pengajuan = p.id_pengajuan
                JOIN barang b             ON b.id_barang    = d.id_barang'
             . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
             . ' ORDER BY p.tanggal_pinjam, p.id_pengajuan, b.nama_barang';

        $stmt = db()->prepare($sql);
        $stmt->execute($bind);
        json_success($stmt->fetchAll());
    }

    // GET /api/laporan/mingguan  (admin)
    // Rekap per minggu (Senin-Minggu): peminjaman dan pengembalian
    public static function mingguan(array $params = []): void
    {
        requireAdmin();

        $peminjaman = self::ambil(
            "SELECT date_trunc('week', p.tanggal_pinjam)::DATE          AS awal_minggu,
                    date_trunc('week', p.tanggal_pinjam)::DATE + 6      AS akhir_minggu,
                    COUNT(DISTINCT p.id_pengajuan)                      AS jumlah_peminjaman,
                    SUM(d.jumlah)                                       AS total_unit,
                    COUNT(DISTINCT p.id_pengajuan)
                          FILTER (WHERE p.status = 'Selesai')           AS sudah_dikembalikan
             FROM pengajuan p
             JOIN detail_pengajuan d ON d.id_pengajuan = p.id_pengajuan
             WHERE p.status IN ('Disetujui', 'Selesai')
             GROUP BY 1, 2
             ORDER BY 1"
        );

        // Jumlah pengembalian & terlambat dihitung per pengajuan, kondisi per BARANG
        $pengembalian = self::ambil(
            "SELECT date_trunc('week', r.tanggal_kembali_aktual)::DATE  AS awal_minggu,
                    COUNT(DISTINCT r.id_pengembalian)                   AS jumlah_pengembalian,
                    COUNT(DISTINCT r.id_pengembalian)
                          FILTER (WHERE r.tanggal_kembali_aktual > p.tanggal_kembali) AS terlambat,
                    COUNT(*) FILTER (WHERE dk.kondisi_kembali = 'Baik')   AS barang_baik,
                    COUNT(*) FILTER (WHERE dk.kondisi_kembali = 'Rusak')  AS barang_rusak,
                    COUNT(*) FILTER (WHERE dk.kondisi_kembali = 'Hilang') AS barang_hilang
             FROM pengembalian r
             JOIN pengajuan p            ON p.id_pengajuan = r.id_pengajuan
             JOIN detail_pengembalian dk ON dk.id_pengembalian = r.id_pengembalian
             GROUP BY 1
             ORDER BY 1"
        );

        json_success(['peminjaman' => $peminjaman, 'pengembalian' => $pengembalian]);
    }

    // GET /api/laporan/mingguan/detail?tanggal=2026-09-16  (admin)
    // Detail satu minggu (Senin-Minggu) yang memuat tanggal itu. Kosong = minggu ini.
    public static function mingguanDetail(array $params = []): void
    {
        requireAdmin();

        $tanggal = self::tanggalOpsional('tanggal') ?? date('Y-m-d');
        $dt      = DateTime::createFromFormat('!Y-m-d', $tanggal);
        $senin   = (clone $dt)->modify('monday this week');
        $minggu  = (clone $senin)->modify('+6 days');
        $awal    = $senin->format('Y-m-d');
        $akhir   = $minggu->format('Y-m-d');

        $stmt = db()->prepare(
            'SELECT p.id_pengajuan, m.nama_peminjam, b.nama_barang, d.jumlah,
                    p.tanggal_pinjam, p.tanggal_kembali, v.status_tampil,
                    r.tanggal_kembali_aktual, dk.kondisi_kembali
             FROM pengajuan p
             JOIN v_pengajuan_status v        ON v.id_pengajuan = p.id_pengajuan
             JOIN peminjam m                  ON m.id_peminjam  = p.id_peminjam
             JOIN detail_pengajuan d          ON d.id_pengajuan = p.id_pengajuan
             JOIN barang b                    ON b.id_barang    = d.id_barang
             LEFT JOIN pengembalian r         ON r.id_pengajuan = p.id_pengajuan
             LEFT JOIN detail_pengembalian dk ON dk.id_detail   = d.id_detail
             WHERE p.status IN (\'Disetujui\', \'Selesai\')
               AND p.tanggal_pinjam  <= CAST(:akhir AS TIMESTAMP)
               AND p.tanggal_kembali >= CAST(:awal AS TIMESTAMP)
             ORDER BY p.tanggal_pinjam, p.id_pengajuan, b.nama_barang'
        );
        $stmt->execute(['awal' => $awal . ' 00:00:00', 'akhir' => $akhir . ' 23:59:59']);

        json_success([
            'awal_minggu'  => $awal,
            'akhir_minggu' => $akhir,
            'data'         => $stmt->fetchAll(),
        ]);
    }

    // GET /api/laporan/ringkasan  (admin)
    public static function ringkasan(array $params = []): void
    {
        requireAdmin();

        json_success([
            'per_bulan' => self::ambil(
                "SELECT EXTRACT(YEAR FROM tanggal_pinjam)::INT  AS tahun,
                        EXTRACT(MONTH FROM tanggal_pinjam)::INT AS bulan,
                        COUNT(*) AS jumlah_peminjaman
                 FROM pengajuan
                 WHERE status IN ('Disetujui', 'Selesai')
                 GROUP BY 1, 2
                 ORDER BY 1, 2"
            ),
            'barang_terpopuler' => self::ambil(
                "SELECT b.nama_barang, COUNT(*) AS kali_dipinjam, SUM(d.jumlah) AS total_unit
                 FROM pengajuan p
                 JOIN detail_pengajuan d ON d.id_pengajuan = p.id_pengajuan
                 JOIN barang b           ON b.id_barang = d.id_barang
                 WHERE p.status IN ('Disetujui', 'Selesai')
                 GROUP BY b.id_barang, b.nama_barang
                 ORDER BY kali_dipinjam DESC, total_unit DESC, b.nama_barang"
            ),
            'per_oki' => self::ambil(
                "SELECT o.nama_oki, COUNT(*) AS jumlah_pengajuan
                 FROM pengajuan p
                 JOIN peminjam m ON m.id_peminjam = p.id_peminjam
                 JOIN oki o      ON o.id_oki = m.id_oki
                 GROUP BY o.id_oki, o.nama_oki
                 ORDER BY jumlah_pengajuan DESC, o.nama_oki"
            ),
            'peminjam_aktif' => self::ambil(
                "SELECT m.nama_peminjam, COUNT(*) AS jumlah_pengajuan
                 FROM pengajuan p
                 JOIN peminjam m ON m.id_peminjam = p.id_peminjam
                 GROUP BY m.id_peminjam, m.nama_peminjam
                 ORDER BY jumlah_pengajuan DESC, m.nama_peminjam
                 LIMIT 5"
            ),
            'peminjam_belum_pernah' => self::ambil(
                "SELECT m.nim, m.nama_peminjam
                 FROM peminjam m
                 LEFT JOIN pengajuan p ON p.id_peminjam = m.id_peminjam
                 WHERE p.id_pengajuan IS NULL
                 ORDER BY m.nama_peminjam"
            ),
            'rekap_status' => self::ambil(
                "SELECT status_tampil, COUNT(*) AS jumlah
                 FROM v_pengajuan_status
                 GROUP BY status_tampil
                 ORDER BY status_tampil"
            ),
        ]);
    }

    // ---------- fungsi bantu ----------

    // Jalankan query tanpa parameter, kembalikan semua baris
    private static function ambil(string $sql): array
    {
        return db()->query($sql)->fetchAll();
    }

    // Baca parameter tanggal YYYY-MM-DD dari URL. Kosong = null. Salah format = 422.
    private static function tanggalOpsional(string $kunci): ?string
    {
        $nilai = trim((string)($_GET[$kunci] ?? ''));
        if ($nilai === '') {
            return null;
        }

        $dt = DateTime::createFromFormat('!Y-m-d', $nilai);
        if ($dt === false || $dt->format('Y-m-d') !== $nilai) {
            json_error("Parameter {$kunci} harus berformat YYYY-MM-DD", 422);
        }
        return $nilai;
    }
}