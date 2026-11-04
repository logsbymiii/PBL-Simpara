<?php
declare(strict_types=1);

// Kelola akun OKI (akun peminjam). Dipakai admin.
class PenggunaController
{
    // GET /api/pengguna?q=musik&status=Aktif  (admin)
    public static function index(array $params = []): void
    {
        requireAdmin();

        $where = [];
        $bind  = [];

        $q = trim((string)($_GET['q'] ?? ''));
        if ($q !== '') {
            $where[]    = 'o.nama_oki ILIKE :q';
            $bind['q']  = '%' . addcslashes($q, '%_\\') . '%';
        }

        $status = trim((string)($_GET['status'] ?? ''));
        if ($status !== '') {
            if (!in_array($status, ['Aktif', 'Nonaktif'], true)) {
                json_error('Nilai status harus Aktif atau Nonaktif', 422);
            }
            $where[]        = 'o.status_akun = :status';
            $bind['status'] = $status;
        }

        $sql = self::SELECT . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
             . ' GROUP BY o.id_oki ORDER BY o.nama_oki';

        $stmt = db()->prepare($sql);
        $stmt->execute($bind);
        json_success($stmt->fetchAll());
    }

    // GET /api/pengguna/{id}  (admin)
    public static function show(array $params): void
    {
        requireAdmin();

        $oki = self::cariOki(self::parseId($params['id'] ?? ''));
        if ($oki === false) {
            json_error('Akun OKI tidak ditemukan', 404);
        }
        json_success($oki);
    }

    // POST /api/pengguna/{id}/nonaktifkan  (admin)
    public static function nonaktifkan(array $params): void
    {
        self::ubahStatus($params, 'Nonaktif');
    }

    // POST /api/pengguna/{id}/aktifkan  (admin)
    public static function aktifkan(array $params): void
    {
        self::ubahStatus($params, 'Aktif');
    }

    // ---------- fungsi bantu ----------

    // Kolom password sengaja TIDAK diambil
    private const SELECT = 'SELECT o.id_oki, o.nama_oki, o.status_akun,
                                   COUNT(p.id_pengajuan) AS jumlah_pengajuan
                            FROM oki o
                            LEFT JOIN pengajuan p ON p.id_oki = o.id_oki';

    private static function ubahStatus(array $params, string $status): void
    {
        requireAdmin();
        $id = self::parseId($params['id'] ?? '');

        $stmt = db()->prepare('UPDATE oki SET status_akun = :status WHERE id_oki = :id');
        $stmt->execute(['status' => $status, 'id' => $id]);

        if ($stmt->rowCount() === 0) {
            json_error('Akun OKI tidak ditemukan', 404);
        }

        json_success(
            self::cariOki($id),
            $status === 'Aktif' ? 'Akun diaktifkan' : 'Akun dinonaktifkan'
        );
    }

    private static function cariOki(int $id): array|false
    {
        $stmt = db()->prepare(self::SELECT . ' WHERE o.id_oki = :id GROUP BY o.id_oki');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }

    // ID dari URL harus angka positif
    private static function parseId(mixed $nilai): int
    {
        $nilai = (string)$nilai;
        if (!ctype_digit($nilai) || (int)$nilai < 1) {
            json_error('ID akun tidak valid', 422);
        }
        return (int)$nilai;
    }
}
