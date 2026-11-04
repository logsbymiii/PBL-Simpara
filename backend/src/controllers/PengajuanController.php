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
    // Akun yang login adalah OKI; orang yang meminjam diisi di body.
    // Body JSON: { "nama_peminjam": "Luna", "nim_peminjam": "2310003", "no_hp_peminjam": "0812...",
    //              "nama_kegiatan": "Gladi bersih", "keperluan": "...",
    //              "tanggal_pinjam": "2026-11-20 08:00", "tanggal_kembali": "2026-11-21 17:00",
    //              "barang": [ { "id_barang": 1, "jumlah": 1 }, ... ] }
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
                'INSERT INTO pengajuan (id_oki, nama_peminjam, nim_peminjam, no_hp_peminjam,
                                        nama_kegiatan, keperluan, tgl_pinjam, tgl_kembali)
                 VALUES (:oki, :nama, :nim, :hp, :kegiatan, :keperluan,
                         CAST(:mulai AS TIMESTAMP), CAST(:selesai AS TIMESTAMP))
                 RETURNING id_pengajuan'
            );
            $stmt->execute([
                'oki'       => $user['id'],
                'nama'      => $data['nama_peminjam'],
                'nim'       => $data['nim_peminjam'],
                'hp'        => $data['no_hp_peminjam'],
                'kegiatan'  => $data['nama_kegiatan'],
                'keperluan' => $data['keperluan'],
                'mulai'     => $data['tanggal_pinjam'],
                'selesai'   => $data['tanggal_kembali'],
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
            $where[]     = 'v.id_oki = :oki';
            $bind['oki'] = $user['id'];
        }

        $status = trim((string)($_GET['status'] ?? ''));
        if ($status !== '') {
            if (!in_array($status, self::STATUS_TAMPIL, true)) {
                json_error('Nilai status tidak dikenal', 422);
            }
            $where[]        = 'v.status_tampil = :status';
            $bind['status'] = $status;
        }

        // Cari nama peminjam, NIM, atau nama OKI (hanya untuk admin)
        $q = trim((string)($_GET['q'] ?? ''));
        if ($admin && $q !== '') {
            $like           = '%' . addcslashes($q, '%_\\') . '%';
            $where[]        = '(v.nama_peminjam ILIKE :q_nama OR v.nim_peminjam ILIKE :q_nim OR o.nama_oki ILIKE :q_oki)';
            $bind['q_nama'] = $like;
            $bind['q_nim']  = $like;
            $bind['q_oki']  = $like;
        }

        $urutan = $admin
            ? 'v.peringatan_5_jam DESC, v.tgl_diajukan DESC'
            : 'v.tgl_pinjam DESC';

        $sql = 'SELECT v.id_pengajuan, v.id_oki, o.nama_oki,
                       v.nim_peminjam AS nim, v.nama_peminjam, v.no_hp_peminjam, v.nama_kegiatan,
                       STRING_AGG(b.nama_barang, \', \' ORDER BY b.nama_barang) AS barang,
                       v.tgl_pinjam AS tanggal_pinjam, v.tgl_kembali AS tanggal_kembali,
                       v.tgl_diajukan AS tanggal_diajukan,
                       v.status, v.status_tampil, v.jam_menunggu, v.peringatan_5_jam
                FROM v_pengajuan_status v
                JOIN oki o              ON o.id_oki       = v.id_oki
                JOIN detail_pengajuan d ON d.id_pengajuan = v.id_pengajuan
                JOIN barang b           ON b.id_barang    = d.id_barang'
             . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
             . ' GROUP BY v.id_pengajuan, v.id_oki, o.nama_oki, v.nim_peminjam, v.nama_peminjam,
                          v.no_hp_peminjam, v.nama_kegiatan, v.tgl_pinjam, v.tgl_kembali,
                          v.tgl_diajukan, v.status, v.status_tampil, v.jam_menunggu, v.peringatan_5_jam
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
            || ($user['role'] === 'peminjam' && (int)$detail['id_oki'] !== (int)$user['id'])) {
            json_error('Pengajuan tidak ditemukan', 404);
        }

        json_success($detail);
    }

        // POST /api/pengajuan/{id}/setujui  (admin)
    // Prosedur database mengecek agenda HMTI dan stok SEMUA barang lagi,
    // lalu mengubah status jadi Disetujui. Kalau gagal, status tidak berubah.
    public static function setujui(array $params): void
    {
        $admin = requireAdmin();
        $id    = self::parseId($params['id'] ?? '');
        self::pastikanAda($id);

        try {
            $stmt = db()->prepare(
                'CALL sp_setujui_pengajuan(CAST(:id AS INT), CAST(:admin AS INT))'
            );
            $stmt->execute(['id' => $id, 'admin' => $admin['id']]);
        } catch (PDOException $e) {
            // pesan dari RAISE EXCEPTION: stok kurang / agenda HMTI / sudah diproses
            $pesan = self::pesanRaise($e);
            if ($pesan !== null) {
                json_error($pesan, 409);
            }
            throw $e;
        }

        json_success(self::ambilDetail($id), 'Pengajuan disetujui');
    }

    // POST /api/pengajuan/{id}/tolak  (admin)
    // Body JSON: { "alasan": "Barang sedang dipakai kegiatan lain" }
    public static function tolak(array $params): void
    {
        $admin  = requireAdmin();
        $id     = self::parseId($params['id'] ?? '');
        $alasan = trim((string)(get_json_body()['alasan'] ?? ''));

        if ($alasan === '') {
            json_error('Data tidak valid', 422, ['alasan' => 'Alasan penolakan wajib diisi']);
        }
        if (mb_strlen($alasan) > 255) {
            json_error('Data tidak valid', 422, ['alasan' => 'Alasan penolakan maksimal 255 karakter']);
        }
        self::pastikanAda($id);

        try {
            $stmt = db()->prepare(
                'CALL sp_tolak_pengajuan(CAST(:id AS INT), CAST(:admin AS INT), CAST(:alasan AS VARCHAR))'
            );
            $stmt->execute(['id' => $id, 'admin' => $admin['id'], 'alasan' => $alasan]);
        } catch (PDOException $e) {
            $pesan = self::pesanRaise($e);
            if ($pesan !== null) {
                json_error($pesan, 409);
            }
            throw $e;
        }

        json_success(self::ambilDetail($id), 'Pengajuan ditolak');
    }

    // POST /api/pengajuan/{id}/serah-terima  (admin)
    // Barang diserahkan di tempat: Disetujui -> Dipinjam
    public static function serahTerima(array $params): void
    {
        $admin = requireAdmin();
        $id    = self::parseId($params['id'] ?? '');
        self::pastikanAda($id);

        try {
            $stmt = db()->prepare('CALL sp_serah_terima_pengajuan(CAST(:id AS INT), CAST(:admin AS INT))');
            $stmt->execute(['id' => $id, 'admin' => $admin['id']]);
        } catch (PDOException $e) {
            $pesan = self::pesanRaise($e);
            if ($pesan !== null) {
                json_error($pesan, 409);
            }
            throw $e;
        }

        json_success(self::ambilDetail($id), 'Serah terima dicatat');
    }

    // POST /api/pengajuan/{id}/batal  (peminjam)
    // Hanya pengajuan milik OKI sendiri yang masih Menunggu.
    public static function batal(array $params): void
    {
        $user = requireLogin();
        if ($user['role'] !== 'peminjam') {
            json_error('Hanya peminjam yang dapat membatalkan pengajuannya', 403);
        }
        $id = self::parseId($params['id'] ?? '');

        // Prosedur memeriksa pemilik (OKI yang sama) dan status, lalu mencatat riwayat
        try {
            $stmt = db()->prepare('CALL sp_batal_pengajuan(CAST(:id AS INT), CAST(:oki AS INT))');
            $stmt->execute(['id' => $id, 'oki' => $user['id']]);
        } catch (PDOException $e) {
            $pesan = self::pesanRaise($e);
            if ($pesan !== null) {
                // pengajuan bukan milik OKI ini / tidak ada -> 404; sudah diproses -> 409
                json_error($pesan, str_contains($pesan, 'tidak ditemukan') ? 404 : 409);
            }
            throw $e;
        }

        json_success(self::ambilDetail($id), 'Pengajuan dibatalkan');
    }

    // ---------- fungsi bantu ----------

    // Pastikan pengajuan ada, supaya "tidak ditemukan" jadi 404 (bukan 409 dari prosedur)
    private static function pastikanAda(int $id): void
    {
        $stmt = db()->prepare('SELECT 1 FROM pengajuan WHERE id_pengajuan = :id');
        $stmt->execute(['id' => $id]);
        if ($stmt->fetchColumn() === false) {
            json_error('Pengajuan tidak ditemukan', 404);
        }
    }

    // Header pengajuan + daftar barangnya (null kalau tidak ada)
    private static function ambilDetail(int $id): ?array
    {
        // Siapa yang memverifikasi dan menyerahkan barang dibaca dari riwayat_status
        $stmt = db()->prepare(
            'SELECT v.id_pengajuan, v.id_oki, o.nama_oki,
                    v.nim_peminjam AS nim, v.nama_peminjam, v.no_hp_peminjam, v.nama_kegiatan,
                    v.tgl_pinjam AS tanggal_pinjam, v.tgl_kembali AS tanggal_kembali,
                    v.tgl_diajukan AS tanggal_diajukan, v.keperluan,
                    v.status, v.status_tampil, v.jam_menunggu, v.peringatan_5_jam,
                    ver.waktu AS tanggal_verifikasi, ver.nama_admin AS diverifikasi_oleh,
                    v.alasan_penolakan,
                    srh.waktu AS tanggal_serah_terima, srh.nama_admin AS diserahkan_oleh
             FROM v_pengajuan_status v
             JOIN oki o ON o.id_oki = v.id_oki
             LEFT JOIN LATERAL (
                 SELECT r.waktu, a.nama_admin
                   FROM riwayat_status r JOIN admin a ON a.id_admin = r.id_admin
                  WHERE r.id_pengajuan = v.id_pengajuan AND r.status_baru IN (\'Disetujui\', \'Ditolak\')
                  ORDER BY r.waktu DESC, r.id_riwayat_status DESC LIMIT 1
             ) ver ON TRUE
             LEFT JOIN LATERAL (
                 SELECT r.waktu, a.nama_admin
                   FROM riwayat_status r JOIN admin a ON a.id_admin = r.id_admin
                  WHERE r.id_pengajuan = v.id_pengajuan AND r.status_baru = \'Dipinjam\'
                  ORDER BY r.waktu DESC, r.id_riwayat_status DESC LIMIT 1
             ) srh ON TRUE
             WHERE v.id_pengajuan = :id'
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
        $nama      = trim((string)($body['nama_peminjam'] ?? ''));
        $nim       = trim((string)($body['nim_peminjam'] ?? $body['nim'] ?? ''));
        $hp        = trim((string)($body['no_hp_peminjam'] ?? ''));
        $kegiatan  = trim((string)($body['nama_kegiatan'] ?? ''));

        $errors = [];
        if ($nama === '') {
            $errors['nama_peminjam'] = 'Nama peminjam wajib diisi';
        } elseif (mb_strlen($nama) > 100) {
            $errors['nama_peminjam'] = 'Nama peminjam maksimal 100 karakter';
        }
        if ($nim === '') {
            $errors['nim_peminjam'] = 'NIM peminjam wajib diisi';
        } elseif (mb_strlen($nim) > 20) {
            $errors['nim_peminjam'] = 'NIM maksimal 20 karakter';
        }
        if (mb_strlen($hp) > 20) {
            $errors['no_hp_peminjam'] = 'No HP maksimal 20 karakter';
        }
        if ($kegiatan === '') {
            $errors['nama_kegiatan'] = 'Nama kegiatan wajib diisi';
        } elseif (mb_strlen($kegiatan) > 100) {
            $errors['nama_kegiatan'] = 'Nama kegiatan maksimal 100 karakter';
        }
        if ($mulai === null) {
            $errors['tanggal_pinjam'] = 'Tanggal dan jam pinjam wajib diisi, format YYYY-MM-DD HH:MM';
        }
        if ($selesai === null) {
            $errors['tanggal_kembali'] = 'Tanggal dan jam kembali wajib diisi, format YYYY-MM-DD HH:MM';
        }
        if ($mulai !== null && substr($mulai, 0, 10) < date('Y-m-d')) {
            $errors['tanggal_pinjam'] = 'Tanggal pinjam tidak boleh di masa lalu';
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
            'nama_peminjam'   => $nama,
            'nim_peminjam'    => $nim,
            'no_hp_peminjam'  => $hp === '' ? null : $hp,
            'nama_kegiatan'   => $kegiatan,
            'tanggal_pinjam'  => $mulai,
            'tanggal_kembali' => $selesai,
            'keperluan'       => $keperluan,
            'barang'          => $barang,
        ];
    }
}