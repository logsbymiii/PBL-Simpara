<?php
declare(strict_types=1);

class BarangController
{
    // Kolom yang dikirim ke front-end. stok_tersedia & status sudah dihitung oleh view.
    private const SELECT_BARANG =
        'SELECT v.id_barang, v.kode_barang, v.nama_barang, v.id_kategori, k.nama_kategori,
                v.stok_total, v.stok_tersedia, v.status, v.kondisi, v.foto_barang
         FROM v_barang_hari_ini v
         LEFT JOIN kategori_barang k ON k.id_kategori = v.id_kategori';

    // GET /api/barang?q=mik&kategori=2
    public static function index(array $params = []): void
    {
        requireLogin();

        $where = [];
        $bind  = [];

        // Cari nama barang (ILIKE = huruf besar/kecil tidak dibedakan)
        $q = trim((string)($_GET['q'] ?? ''));
        if ($q !== '') {
            $where[]   = 'v.nama_barang ILIKE :q';
            $bind['q'] = '%' . addcslashes($q, '%_\\') . '%';
        }

        // Filter kategori
        $kategori = trim((string)($_GET['kategori'] ?? ''));
        if ($kategori !== '') {
            if (!ctype_digit($kategori)) {
                json_error('Parameter kategori harus berupa angka', 422);
            }
            $where[]          = 'v.id_kategori = :kategori';
            $bind['kategori'] = (int)$kategori;
        }

        $sql = self::SELECT_BARANG
             . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
             . ' ORDER BY v.kode_barang';

        $stmt = db()->prepare($sql);
        $stmt->execute($bind);
        json_success($stmt->fetchAll());
    }

    // GET /api/barang/statistik  -> kartu Total / Tersedia / Dipinjam / Rusak
    public static function statistik(array $params = []): void
    {
        requireLogin();

        $row = db()->query(
            "SELECT COUNT(*)                                    AS total_barang,
                    COUNT(*) FILTER (WHERE status = 'Tersedia') AS tersedia,
                    COUNT(*) FILTER (WHERE status = 'Dipinjam') AS dipinjam,
                    COUNT(*) FILTER (WHERE kondisi = 'Rusak')   AS rusak
             FROM v_barang_hari_ini"
        )->fetch();

        json_success(array_map('intval', $row));
    }

    // GET /api/barang/tersedia?mulai=2026-11-10 08:00&selesai=2026-11-11 17:00
    // Hanya barang yang sisa stoknya > 0 pada rentang waktu itu (untuk dropdown "Pilih Barang")
    public static function tersedia(array $params = []): void
    {
        requireLogin();

        $mulai   = self::parseWaktu($_GET['mulai'] ?? '');
        $selesai = self::parseWaktu($_GET['selesai'] ?? '');

        if ($mulai === null || $selesai === null) {
            json_error('Parameter mulai dan selesai wajib, format YYYY-MM-DD HH:MM', 422);
        }
        if ($selesai < $mulai) {
            json_error('Waktu selesai tidak boleh sebelum waktu mulai', 422);
        }

        $stmt = db()->prepare(
            'SELECT * FROM (
                 SELECT b.id_barang, b.kode_barang, b.nama_barang, b.id_kategori,
                        k.nama_kategori, b.stok_total,
                        fn_stok_tersedia(b.id_barang,
                                         CAST(:mulai AS TIMESTAMP),
                                         CAST(:selesai AS TIMESTAMP)) AS stok_tersedia
                 FROM barang b
                 LEFT JOIN kategori_barang k ON k.id_kategori = b.id_kategori
                 WHERE b.kondisi <> \'Rusak\'
             ) t
             WHERE t.stok_tersedia > 0
             ORDER BY t.nama_barang'
        );
        $stmt->execute(['mulai' => $mulai, 'selesai' => $selesai]);
        json_success($stmt->fetchAll());
    }

    // GET /api/barang/{id}
    public static function show(array $params): void
    {
        requireLogin();

        $barang = self::cariBarang(self::parseId($params['id'] ?? ''));
        if ($barang === false) {
            json_error('Barang tidak ditemukan', 404);
        }
        json_success($barang);
    }

    // GET /api/kategori  -> isi dropdown kategori di form admin
    public static function kategori(array $params = []): void
    {
        requireLogin();

        $stmt = db()->query(
            'SELECT id_kategori, nama_kategori FROM kategori_barang ORDER BY nama_kategori'
        );
        json_success($stmt->fetchAll());
    }

    // POST /api/barang  (admin)
    // Body JSON: { "kode_barang", "nama_barang", "id_kategori", "stok_total", "kondisi" }
    public static function store(array $params = []): void
    {
        requireAdmin();
        $data = self::validasi(get_json_body());

        try {
            $stmt = db()->prepare(
                'INSERT INTO barang (kode_barang, nama_barang, id_kategori, stok_total, kondisi)
                 VALUES (:kode, :nama, :kategori, :stok, :kondisi)
                 RETURNING id_barang'
            );
            $stmt->execute($data);
            $id = (int)$stmt->fetchColumn();
        } catch (PDOException $e) {
            if ($e->getCode() === '23505') { // kode_barang sudah ada (UNIQUE)
                json_error('Kode barang sudah dipakai', 409);
            }
            if ($e->getCode() === '23503') { // id_kategori tidak ada (FOREIGN KEY)
                json_error('Data tidak valid', 422, ['id_kategori' => 'Kategori tidak ditemukan']);
            }
            throw $e;
        }

        json_success(self::cariBarang($id), 'Barang berhasil ditambahkan', 201);
    }

    // PUT /api/barang/{id}  (admin) -> body sama seperti POST
    public static function update(array $params): void
    {
        requireAdmin();
        $id   = self::parseId($params['id'] ?? '');
        $data = self::validasi(get_json_body());

        try {
            $stmt = db()->prepare(
                'UPDATE barang
                 SET kode_barang = :kode, nama_barang = :nama, id_kategori = :kategori,
                     stok_total = :stok, kondisi = :kondisi
                 WHERE id_barang = :id'
            );
            $stmt->execute($data + ['id' => $id]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23505') {
                json_error('Kode barang sudah dipakai', 409);
            }
            if ($e->getCode() === '23503') {
                json_error('Data tidak valid', 422, ['id_kategori' => 'Kategori tidak ditemukan']);
            }
            throw $e;
        }

        if ($stmt->rowCount() === 0) {
            json_error('Barang tidak ditemukan', 404);
        }
        json_success(self::cariBarang($id), 'Barang berhasil diperbarui');
    }

    // DELETE /api/barang/{id}  (admin) -> ditolak kalau barang pernah dipinjam
    public static function destroy(array $params): void
    {
        requireAdmin();
        $id = self::parseId($params['id'] ?? '');

        try {
            $stmt = db()->prepare('DELETE FROM barang WHERE id_barang = :id');
            $stmt->execute(['id' => $id]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23503') { // masih dipakai di detail_pengajuan
                json_error('Barang sudah pernah dipinjam, tidak dapat dihapus', 409);
            }
            throw $e;
        }

        if ($stmt->rowCount() === 0) {
            json_error('Barang tidak ditemukan', 404);
        }
        json_success(null, 'Barang berhasil dihapus');
    }

    // ---------- fungsi bantu ----------

    // Ambil satu barang dari view (false kalau tidak ada)
    private static function cariBarang(int $id): array|false
    {
        $stmt = db()->prepare(self::SELECT_BARANG . ' WHERE v.id_barang = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }

    // ID dari URL harus angka positif
    private static function parseId(mixed $nilai): int
    {
        $nilai = (string)$nilai;
        if (!ctype_digit($nilai) || (int)$nilai < 1) {
            json_error('ID barang tidak valid', 422);
        }
        return (int)$nilai;
    }

    // Terima "2026-11-10 08:00" atau "2026-11-10T08:00"; kembalikan null kalau salah
    private static function parseWaktu(mixed $nilai): ?string
    {
        $nilai = trim(str_replace('T', ' ', (string)$nilai));
        $dt    = DateTime::createFromFormat('Y-m-d H:i', $nilai);

        // cek ketat: tanggal ngawur seperti 2026-02-31 ditolak
        if ($dt === false || $dt->format('Y-m-d H:i') !== $nilai) {
            return null;
        }
        return $nilai;
    }

    // Validasi body untuk tambah/edit; hasilnya siap dipakai sebagai parameter query
    private static function validasi(array $body): array
    {
        $kode     = trim((string)($body['kode_barang'] ?? ''));
        $nama     = trim((string)($body['nama_barang'] ?? ''));
        $kategori = filter_var($body['id_kategori'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $stok     = filter_var($body['stok_total'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
        $kondisi  = (string)($body['kondisi'] ?? '');

        $errors = [];
        if ($kode === '' || strlen($kode) > 20)   $errors['kode_barang'] = 'Kode barang wajib diisi (maks. 20 karakter)';
        if ($nama === '' || strlen($nama) > 100)  $errors['nama_barang'] = 'Nama barang wajib diisi (maks. 100 karakter)';
        if ($kategori === false)                  $errors['id_kategori'] = 'Kategori wajib dipilih';
        if ($stok === false)                      $errors['stok_total']  = 'Stok harus berupa angka 0 atau lebih';
        if (!in_array($kondisi, ['Baik', 'Rusak'], true)) {
            $errors['kondisi'] = 'Kondisi harus Baik atau Rusak';
        }

        if ($errors) {
            json_error('Data tidak valid', 422, $errors);
        }

        return [
            'kode'     => $kode,
            'nama'     => $nama,
            'kategori' => $kategori,
            'stok'     => $stok,
            'kondisi'  => $kondisi,
        ];
    }
}