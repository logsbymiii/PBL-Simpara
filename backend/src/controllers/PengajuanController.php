<?php
declare(strict_types=1);

class PengajuanController
{
    // Nilai status_tampil (dari view v_pengajuan_status) yang boleh dipakai sebagai filter
    private const STATUS_TAMPIL = [
        'Menunggu Verifikasi', 'Disetujui', 'Dipinjam', 'Terlambat',
        'Dikembalikan', 'Ditolak', 'Dibatalkan',
    ];

    // POST /api/pengajuan  (peminjam)
    // Body JSON: { "tanggal_pinjam": "2026-11-20 08:00", "tanggal_kembali": "2026-11-21 17:00",
    //              "keperluan": "...", "barang": [ { "id_barang": 1, "jumlah": 1 }, ... ] }
    public static function store(array $params = []): void
    {
        $user = requireLogin();
        if ($user['role'] !== 'peminjam') {
            json_error('Hanya peminjam yang dapat mengajukan peminjaman', 403);
        }

        $data = self::validasi(get_json_body());
        $pdo  = db();

        // Pastikan semua barang ada. Kalau tidak, pesan "stok tidak mencukupi" akan menyesatkan.
        $cek = $pdo->prepare('SELECT 1 FROM barang WHERE id_barang = :id');
        foreach ($data['barang'] as $item) {
            $cek->execute(['id' => $item['id_barang']]);
            if ($cek->fetchColumn() === false) {
                json_error('Data tidak valid', 422, [
                    'barang' => 'Barang dengan id ' . $item['id_barang'] . ' tidak ditemukan',
                ]);
            }
        }

        $barangSaatIni = null; // untuk memberi tahu barang mana yang bermasalah

        try {
            $pdo->beginTransaction();

            // 1. Simpan header pengajuan (status 'Menunggu' dan jam diajukan diisi otomatis oleh database)
            $stmt = $pdo->prepare(
                'INSERT INTO pengajuan (id_peminjam, tanggal_pinjam, tanggal_kembali, keperluan)
                 VALUES (:peminjam, CAST(:mulai AS TIMESTAMP), CAST(:selesai AS TIMESTAMP), :keperluan)
                 RETURNING id_pengajuan'
            );
            $stmt->execute([
                'peminjam'  => $user['id'],
                'mulai'     => $data['tanggal_pinjam'],
                'selesai'   => $data['tanggal_kembali'],
                'keperluan' => $data['keperluan'],
            ]);
            $id = (int)$stmt->fetchColumn();

            // 2. Tambah barang satu per satu. Prosedur ini mengecek agenda HMTI dan stok.
            $tambah = $pdo->prepare(
                'CALL sp_tambah_barang_pengajuan(CAST(:id AS INT), CAST(:barang AS INT), CAST(:jumlah AS INT))'
            );
            foreach ($data['barang'] as $item) {
                $barangSaatIni = $item['id_barang'];
                $tambah->execute([
                    'id'     => $id,
                    'barang' => $item['id_barang'],
                    'jumlah' => $item['jumlah'],
                ]);
            }

            $pdo->commit(); // semua berhasil -> simpan permanen
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack(); // ada yang gagal -> batalkan SEMUA
            }

            // Pesan dari RAISE EXCEPTION di database (stok kurang / tanggal agenda HMTI)
            $pesan = self::pesanRaise($e);
            if ($pesan !== null) {
                json_error($pesan, 409, $barangSaatIni !== null ? ['id_barang' => $barangSaatIni] : null);
            }
            throw $e;
        }

        json_success(self::ambilDetail($id), 'Pengajuan berhasil dikirim', 201);
    }

    // GET /api/pengajuan?status=Dipinjam&q=luna
    // Peminjam: hanya pengajuan miliknya. Admin: semua (yang kena peringatan 5 jam di atas).
    public static function index(array $params = []): void
    {
        $user  = requireLogin();
        $admin = $user['role'] === 'admin';

        $where = [];
        $bind  = [];

        if (!$admin) {
            $where[]         = 'p.id_peminjam = :peminjam';
            $bind['peminjam'] = $user['id'];
        }

        $status = trim((string)($_GET['status'] ?? ''));
        if ($status !== '') {
            if (!in_array($status, self::STATUS_TAMPIL, true)) {
                json_error('Nilai status tidak dikenal', 422);
            }
            $where[]        = 'v.status_tampil = :status';
            $bind['status'] = $status;
        }

        // Cari nama peminjam (hanya untuk admin)
        $q = trim((string)($_GET['q'] ?? ''));
        if ($admin && $q !== '') {
            $where[]   = 'm.nama_peminjam ILIKE :q';
            $bind['q'] = '%' . addcslashes($q, '%_\\') . '%';
        }

        $urutan = $admin
            ? 'v.peringatan_5_jam DESC, p.tanggal_diajukan DESC'
            : 'p.tanggal_pinjam DESC';

        $sql = 'SELECT p.id_pengajuan, p.id_peminjam, m.nim, m.nama_peminjam,
                       STRING_AGG(b.nama_barang, \', \' ORDER BY b.nama_barang) AS barang,
                       p.tanggal_pinjam, p.tanggal_kembali, p.tanggal_diajukan,
                       v.status, v.status_tampil, v.jam_menunggu, v.peringatan_5_jam
                FROM pengajuan p
                JOIN v_pengajuan_status v ON v.id_pengajuan = p.id_pengajuan
                JOIN peminjam m           ON m.id_peminjam  = p.id_peminjam
                JOIN detail_pengajuan d   ON d.id_pengajuan = p.id_pengajuan
                JOIN barang b             ON b.id_barang    = d.id_barang'
             . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
             . ' GROUP BY p.id_pengajuan, p.id_peminjam, m.nim, m.nama_peminjam,
                          p.tanggal_pinjam, p.tanggal_kembali, p.tanggal_diajukan,
                          v.status, v.status_tampil, v.jam_menunggu, v.peringatan_5_jam
                 ORDER BY ' . $urutan;

        $stmt = db()->prepare($sql);
        $stmt->execute($bind);
        json_success($stmt->fetchAll());
    }

    // GET /api/pengajuan/{id}
    public static function show(array $params): void
    {
        $user   = requireLogin();
        $id     = self::parseId($params['id'] ?? '');
        $detail = self::ambilDetail($id);

        // Peminjam yang membuka pengajuan orang lain dianggap "tidak ditemukan"
        if ($detail === null
            || ($user['role'] === 'peminjam' && (int)$detail['id_peminjam'] !== (int)$user['id'])) {
            json_error('Pengajuan tidak ditemukan', 404);
        }

        json_success($detail);
    }

    // ---------- fungsi bantu ----------

    // Header pengajuan + daftar barangnya (null kalau tidak ada)
    private static function ambilDetail(int $id): ?array
    {
        $stmt = db()->prepare(
            'SELECT p.id_pengajuan, p.id_peminjam, m.nim, m.nama_peminjam, o.nama_oki,
                    p.tanggal_pinjam, p.tanggal_kembali, p.tanggal_diajukan, p.keperluan,
                    v.status, v.status_tampil, v.jam_menunggu, v.peringatan_5_jam,
                    p.tanggal_verifikasi, a.nama_admin AS diverifikasi_oleh, p.alasan_penolakan
             FROM pengajuan p
             JOIN v_pengajuan_status v ON v.id_pengajuan = p.id_pengajuan
             JOIN peminjam m           ON m.id_peminjam  = p.id_peminjam
             LEFT JOIN oki o           ON o.id_oki       = m.id_oki
             LEFT JOIN admin a         ON a.id_admin     = p.id_admin
             WHERE p.id_pengajuan = :id'
        );
        $stmt->execute(['id' => $id]);
        $header = $stmt->fetch();
        if ($header === false) {
            return null;
        }

        $stmt = db()->prepare(
            'SELECT d.id_barang, b.kode_barang, b.nama_barang, d.jumlah
             FROM detail_pengajuan d
             JOIN barang b ON b.id_barang = d.id_barang
             WHERE d.id_pengajuan = :id
             ORDER BY b.nama_barang'
        );
        $stmt->execute(['id' => $id]);
        $header['barang'] = $stmt->fetchAll();

        return $header;
    }

    // Ambil pesan bersih dari RAISE EXCEPTION (SQLSTATE P0001); null kalau error jenis lain
    private static function pesanRaise(PDOException $e): ?string
    {
        if (($e->errorInfo[0] ?? '') !== 'P0001') {
            return null;
        }
        $pesan = (string)($e->errorInfo[2] ?? '');
        $pesan = preg_replace('/^\s*(?:\d+\s+)?ERROR:\s*/', '', $pesan) ?? $pesan;
        $pesan = explode("\n", $pesan)[0];
        return trim($pesan);
    }

    // ID dari URL harus angka positif
    private static function parseId(mixed $nilai): int
    {
        $nilai = (string)$nilai;
        if (!ctype_digit($nilai) || (int)$nilai < 1) {
            json_error('ID pengajuan tidak valid', 422);
        }
        return (int)$nilai;
    }

    // Terima "2026-11-10 08:00" atau "2026-11-10T08:00"; null kalau salah
    private static function parseWaktu(mixed $nilai): ?string
    {
        $nilai = trim(str_replace('T', ' ', (string)$nilai));
        $dt    = DateTime::createFromFormat('Y-m-d H:i', $nilai);

        if ($dt === false || $dt->format('Y-m-d H:i') !== $nilai) {
            return null;
        }
        return $nilai;
    }

    // Validasi body pembuatan pengajuan
    private static function validasi(array $body): array
    {
        $mulai     = self::parseWaktu($body['tanggal_pinjam'] ?? '');
        $selesai   = self::parseWaktu($body['tanggal_kembali'] ?? '');
        $keperluan = trim((string)($body['keperluan'] ?? ''));
        $mentah    = $body['barang'] ?? null;

        $errors = [];
        if ($mulai === null) {
            $errors['tanggal_pinjam'] = 'Tanggal dan jam pinjam wajib diisi, format YYYY-MM-DD HH:MM';
        }
        if ($selesai === null) {
            $errors['tanggal_kembali'] = 'Tanggal dan jam kembali wajib diisi, format YYYY-MM-DD HH:MM';
        }
        if ($mulai !== null && $selesai !== null && $selesai < $mulai) {
            $errors['tanggal_kembali'] = 'Waktu kembali tidak boleh sebelum waktu pinjam';
        }
        if ($keperluan === '') {
            $errors['keperluan'] = 'Keperluan wajib diisi';
        } elseif (mb_strlen($keperluan) > 1000) {
            $errors['keperluan'] = 'Keperluan maksimal 1000 karakter';
        }

        // Daftar barang: minimal satu, tiap barang punya id_barang & jumlah, tidak boleh ganda
        $barang = [];
        if (!is_array($mentah) || $mentah === []) {
            $errors['barang'] = 'Pilih minimal satu barang';
        } else {
            $sudah = [];
            foreach ($mentah as $item) {
                $idBarang = is_array($item)
                    ? filter_var($item['id_barang'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]])
                    : false;
                $jumlah = is_array($item)
                    ? filter_var($item['jumlah'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]])
                    : false;

                if ($idBarang === false || $jumlah === false) {
                    $errors['barang'] = 'Setiap barang harus punya id_barang dan jumlah (angka minimal 1)';
                    break;
                }
                if (isset($sudah[$idBarang])) {
                    $errors['barang'] = 'Satu barang tidak boleh dipilih dua kali';
                    break;
                }
                $sudah[$idBarang] = true;
                $barang[] = ['id_barang' => $idBarang, 'jumlah' => $jumlah];
            }
        }

        if ($errors) {
            json_error('Data tidak valid', 422, $errors);
        }

        return [
            'tanggal_pinjam'  => $mulai,
            'tanggal_kembali' => $selesai,
            'keperluan'       => $keperluan,
            'barang'          => $barang,
        ];
    }
}