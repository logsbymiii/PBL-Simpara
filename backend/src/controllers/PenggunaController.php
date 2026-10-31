<?php
declare(strict_types=1);

class PenggunaController
{
    // GET /api/pengguna?q=luna&status=Aktif  (admin)
    public static function index(array $params = []): void
    {
        requireAdmin();

        $where = [];
        $bind  = [];

        // Cari nama atau NIM. Nama parameter harus BEDA kalau dipakai dua kali.
        $q = trim((string)($_GET['q'] ?? ''));
        if ($q !== '') {
            $like           = '%' . addcslashes($q, '%_\\') . '%';
            $where[]        = '(m.nama_peminjam ILIKE :q_nama OR m.nim ILIKE :q_nim)';
            $bind['q_nama'] = $like;
            $bind['q_nim']  = $like;
        }

        $status = trim((string)($_GET['status'] ?? ''));
        if ($status !== '') {
            if (!in_array($status, ['Aktif', 'Nonaktif'], true)) {
                json_error('Nilai status harus Aktif atau Nonaktif', 422);
            }
            $where[]        = 'm.status_akun = :status';
            $bind['status'] = $status;
        }

        $sql = 'SELECT m.id_peminjam, m.nim, m.nama_peminjam, m.email, m.no_hp,
                       o.nama_oki, m.status_akun, m.tanggal_daftar
                FROM peminjam m
                LEFT JOIN oki o ON o.id_oki = m.id_oki'
             . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
             . ' ORDER BY m.nama_peminjam';

        $stmt = db()->prepare($sql);
        $stmt->execute($bind);
        json_success($stmt->fetchAll());
    }

    // GET /api/pengguna/{id}  (admin)
    public static function show(array $params): void
    {
        requireAdmin();

        $pengguna = self::cariPengguna(self::parseId($params['id'] ?? ''));
        if ($pengguna === false) {
            json_error('Pengguna tidak ditemukan', 404);
        }
        json_success($pengguna);
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

    private static function ubahStatus(array $params, string $status): void
    {
        requireAdmin();
        $id = self::parseId($params['id'] ?? '');

        $stmt = db()->prepare(
            'UPDATE peminjam SET status_akun = :status WHERE id_peminjam = :id'
        );
        $stmt->execute(['status' => $status, 'id' => $id]);

        if ($stmt->rowCount() === 0) {
            json_error('Pengguna tidak ditemukan', 404);
        }

        json_success(
            self::cariPengguna($id),
            $status === 'Aktif' ? 'Akun diaktifkan' : 'Akun dinonaktifkan'
        );
    }

    // Satu pengguna (false kalau tidak ada). Kolom password sengaja TIDAK diambil.
    private static function cariPengguna(int $id): array|false
    {
        $stmt = db()->prepare(
            'SELECT m.id_peminjam, m.nim, m.nama_peminjam, m.email, m.no_hp,
                    o.nama_oki, m.status_akun, m.tanggal_daftar
             FROM peminjam m
             LEFT JOIN oki o ON o.id_oki = m.id_oki
             WHERE m.id_peminjam = :id'
        );
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }

    // ID dari URL harus angka positif
    private static function parseId(mixed $nilai): int
    {
        $nilai = (string)$nilai;
        if (!ctype_digit($nilai) || (int)$nilai < 1) {
            json_error('ID pengguna tidak valid', 422);
        }
        return (int)$nilai;
    }
}