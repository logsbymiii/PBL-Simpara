<?php
declare(strict_types=1);

class BarangController
{
    // Foto unggahan admin: maksimal 300 KB, hanya JPEG/PNG/WebP (frontend sudah mengecilkan dulu)
    private const FOTO_MAKS = 300 * 1024;
    private const FOTO_MIME = ['image/jpeg', 'image/png', 'image/webp'];

    // Kolom yang dikirim ke front-end. stok_tersedia & status sudah dihitung oleh view.
    private const SELECT_BARANG =
        'SELECT v.id_barang, v.kode_barang, v.nama_barang, v.id_kategori, k.nama_kategori,
                v.stok_total, v.stok_tersedia, v.status, v.kondisi, v.foto_barang, v.foto_upload,
                (v.foto_upload IS NOT NULL
                 OR v.foto_barang ~ (\'-\' || v.id_barang || \'-[0-9]{10}[.](jpg|png|webp)$\')) AS foto_unggahan
         FROM v_barang_hari_ini v
         LEFT JOIN kategori_barang k ON k.id_kategori = v.id_kategori';

    // GET /api/barang?q=mik&kategori=2
    public static function index(array $params = []): void
    {
        // Publik: tamu (belum login) boleh melihat katalog.
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

        $mulai   = parse_waktu($_GET['mulai'] ?? '');
        $selesai = parse_waktu($_GET['selesai'] ?? '');

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
        // Publik: tamu (belum login) boleh melihat katalog.
        $barang = self::cariBarang(parse_id($params['id'] ?? '', 'barang'));
        if ($barang === false) {
            json_error('Barang tidak ditemukan', 404);
        }
        json_success($barang);
    }

        // GET /api/barang/{id}/riwayat  (admin)
    // Riwayat peminjaman satu barang, terbaru di atas
    public static function riwayat(array $params): void
    {
        requireAdmin();

        $id = parse_id($params['id'] ?? '', 'barang');
        if (self::cariBarang($id) === false) {
            json_error('Barang tidak ditemukan', 404);
        }

        $stmt = db()->prepare(
            'SELECT p.id_pengajuan, p.nama_peminjam, p.nama_kegiatan,
                    p.tgl_pinjam, p.tgl_kembali, p.status_tampil,
                    d.jumlah
             FROM detail_pengajuan d
             JOIN v_pengajuan_status p ON p.id_pengajuan = d.id_pengajuan
             WHERE d.id_barang = :id
             ORDER BY p.tgl_pinjam DESC
             LIMIT 50'
        );
        $stmt->execute(['id' => $id]);
        json_success($stmt->fetchAll());
    }

    // GET /api/barang/{id}/peminjaman  (peminjam & admin)
    // Peminjaman yang sedang/akan memakai barang ini, terdekat di atas. Status yang dianggap
    // aktif sama dengan fn_stok_tersedia: Disetujui (sampai tgl_kembali) dan Dipinjam (sampai
    // benar-benar dikembalikan, termasuk yang terlambat). Menunggu belum menahan stok.
    // Sengaja TIDAK mengirim nama peminjam, NIM, no HP, maupun PIN; cukup nama OKI.
    public static function peminjaman(array $params): void
    {
        requireLogin();
        $id = parse_id($params['id'] ?? '', 'barang');
        self::pastikanBarangAda($id);

        $stmt = db()->prepare(
            "SELECT o.nama_oki, p.tgl_pinjam AS tanggal_pinjam, p.tgl_kembali AS tanggal_kembali,
                    d.jumlah, p.status_tampil
             FROM detail_pengajuan d
             JOIN v_pengajuan_status p ON p.id_pengajuan = d.id_pengajuan
             JOIN oki o                ON o.id_oki       = p.id_oki
             WHERE d.id_barang = :id
               AND (p.status = 'Dipinjam'
                    OR (p.status = 'Disetujui' AND p.tgl_kembali >= now_wib()))
             ORDER BY p.tgl_pinjam, p.id_pengajuan"
        );
        $stmt->execute(['id' => $id]);
        json_success($stmt->fetchAll());
    }

    // POST /api/barang/{id}/foto  (admin)
    // Body = isi file gambar apa adanya (bukan JSON/multipart), mis. Content-Type: image/jpeg.
    // Disimpan ke R2 dengan key "barang/<slug-nama>-<id>-<timestamp>.<ext>", lalu foto_barang diisi
    // nama file itu. Kalau R2 tidak aktif/gagal, jatuh kembali ke kolom BYTEA (foto_data/foto_mime).
    public static function fotoUnggah(array $params): void
    {
        requireAdmin();
        $id = parse_id($params['id'] ?? '', 'barang');

        // Tolak lebih awal kalau ukuran yang dikirim browser sudah melebihi batas
        if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > self::FOTO_MAKS) {
            json_error('Ukuran foto maksimal 300 KB', 413);
        }
        // Baca paling banyak batas + 1 byte, supaya ketahuan kalau ternyata lebih besar
        $isi = file_get_contents('php://input', false, null, 0, self::FOTO_MAKS + 1);
        if ($isi === false || $isi === '') {
            json_error('File foto kosong', 422);
        }
        if (strlen($isi) > self::FOTO_MAKS) {
            json_error('Ukuran foto maksimal 300 KB', 413);
        }

        // Jenis file dicek dari ISI file (header gambar), bukan dari nama file atau Content-Type
        $info = @getimagesizefromstring($isi);
        $mime = is_array($info) ? (string)($info['mime'] ?? '') : '';
        if (!in_array($mime, self::FOTO_MIME, true)) {
            json_error('File harus berupa gambar JPEG, PNG, atau WebP', 415);
        }

        $stmt = db()->prepare('SELECT nama_barang, foto_barang FROM barang WHERE id_barang = :id');
        $stmt->execute(['id' => $id]);
        $lama = $stmt->fetch();
        if ($lama === false) {
            json_error('Barang tidak ditemukan', 404);
        }

        $ext  = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'][$mime];
        $nama = self::slug($lama['nama_barang']) . '-' . $id . '-' . time() . '.' . $ext;

        if (r2Put('barang/' . $nama, $isi, $mime)) {
            $stmt = db()->prepare(
                'UPDATE barang SET foto_barang = :nama, foto_data = NULL, foto_mime = NULL WHERE id_barang = :id'
            );
            $stmt->execute(['nama' => $nama, 'id' => $id]);

            // Unggahan lama di R2 tidak dipakai lagi (foto bawaan tidak pernah dihapus)
            if (self::fotoUnggahanR2($lama['foto_barang'], $id)) {
                r2Delete('barang/' . $lama['foto_barang']);
            }
            json_success(self::cariBarang($id) + ['penyimpanan' => 'r2'], 'Foto barang berhasil diunggah');
        }

        // Cadangan: R2 tidak aktif atau gagal -> simpan di database seperti sebelumnya
        $stmt = db()->prepare('UPDATE barang SET foto_data = :data, foto_mime = :mime WHERE id_barang = :id');
        $stmt->bindValue(':data', $isi, PDO::PARAM_LOB);
        $stmt->bindValue(':mime', $mime);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        json_success(
            self::cariBarang($id) + ['penyimpanan' => 'database'],
            r2Aktif()
                ? 'Foto disimpan di database karena penyimpanan R2 sedang gagal'
                : 'Foto disimpan di database (penyimpanan R2 belum diaktifkan)'
        );
    }

    // GET /api/barang/{id}/foto  (publik, dipakai <img>; proxy supaya browser tidak perlu akses r2.dev)
    // Urutan sumber: (a) foto_data BYTEA lama, (b) objek R2 "barang/<foto_barang>", (c) 404.
    // Header: Content-Type asli, Cache-Control 1 hari, ETag + 304 untuk If-None-Match.
    public static function fotoTampil(array $params): void
    {
        $id = parse_id($params['id'] ?? '', 'barang');

        // Metadata saja dulu (tanpa isi bytea), supaya 304 tidak perlu memuat foto
        $stmt = db()->prepare(
            'SELECT foto_barang, foto_mime, md5(foto_data) AS md5_data FROM barang WHERE id_barang = :id'
        );
        $stmt->execute(['id' => $id]);
        $meta = $stmt->fetch();
        if ($meta === false) {
            json_error('Barang tidak ditemukan', 404);
        }

        // (a) Foto BYTEA dari migrasi 2026-11-21
        if ($meta['md5_data'] !== null) {
            self::kirimFotoJikaBerubah('"' . $meta['md5_data'] . '"');
            $stmt = db()->prepare('SELECT foto_data FROM barang WHERE id_barang = :id');
            $stmt->execute(['id' => $id]);
            $stmt->bindColumn(1, $data, PDO::PARAM_LOB);
            $stmt->fetch(PDO::FETCH_BOUND);
            // pdo_pgsql mengembalikan bytea sebagai stream
            $isi = is_resource($data) ? (string)stream_get_contents($data) : (string)$data;
            self::kirimFoto($isi, $meta['foto_mime']);
        }

        // (b) Objek R2. Nama file divalidasi supaya tidak bisa keluar dari folder barang/
        $nama = (string)($meta['foto_barang'] ?? '');
        if (!self::namaFotoValid($nama)) {
            json_error('Foto tidak ditemukan', 404);
        }
        // Nama file unggahan selalu baru (ada timestamp), jadi ETag cukup dari namanya;
        // browser yang sudah punya foto mendapat 304 tanpa backend menghubungi R2.
        self::kirimFotoJikaBerubah('"r2-' . md5($nama) . '"');
        $objek = r2Get('barang/' . $nama);
        if ($objek === null) {
            // (c) Tidak ada / R2 gagal -> 404; frontend jatuh ke file statis bawaan
            header_remove('ETag');
            header_remove('Cache-Control');
            json_error('Foto tidak ditemukan', 404);
        }
        $mime = in_array($objek['content_type'], self::FOTO_MIME, true)
            ? $objek['content_type']
            : self::mimeDariNama($nama);
        self::kirimFoto($objek['body'], $mime);
    }

    // DELETE /api/barang/{id}/foto  (admin) -> hapus foto unggahan, kembali ke foto bawaan.
    // Foto bawaan (mis. kamera.jpg) tidak pernah dihapus dari R2.
    public static function fotoHapus(array $params): void
    {
        requireAdmin();
        $id = parse_id($params['id'] ?? '', 'barang');

        $stmt = db()->prepare(
            'SELECT nama_barang, foto_barang, foto_data IS NOT NULL AS ada_bytea FROM barang WHERE id_barang = :id'
        );
        $stmt->execute(['id' => $id]);
        $b = $stmt->fetch();
        if ($b === false) {
            json_error('Barang tidak ditemukan', 404);
        }

        $unggahanR2 = self::fotoUnggahanR2($b['foto_barang'], $id);
        if (!$b['ada_bytea'] && !$unggahanR2) {
            json_error('Barang ini tidak punya foto unggahan', 409);
        }

        $fotoBarang = $b['foto_barang'];
        if ($unggahanR2) {
            if (!r2Delete('barang/' . $b['foto_barang'])) {
                error_log("Objek foto unggahan barang {$id} gagal dihapus dari R2");   // tetap lanjut
            }
            // Foto bawaan mengikuti nama barang: huruf kecil, spasi jadi '-' (mis. kabel-hdmi.jpg)
            $fotoBarang = self::slug($b['nama_barang']) . '.jpg';
        }

        $stmt = db()->prepare(
            'UPDATE barang SET foto_barang = :nama, foto_data = NULL, foto_mime = NULL WHERE id_barang = :id'
        );
        $stmt->execute(['nama' => $fotoBarang, 'id' => $id]);
        json_success(self::cariBarang($id), 'Foto unggahan dihapus, kembali ke foto bawaan');
    }

    // GET /api/kategori  -> isi dropdown kategori di form admin
    public static function kategori(array $params = []): void
    {
        // Publik: tamu (belum login) boleh melihat katalog.
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
        $id   = parse_id($params['id'] ?? '', 'barang');
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
        $id = parse_id($params['id'] ?? '', 'barang');

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

    // Nama file foto aman: huruf/angka/titik/strip/garis bawah + ekstensi gambar, tanpa '..' atau '/'
    private static function namaFotoValid(string $nama): bool
    {
        return !str_contains($nama, '..')
            && preg_match('/^[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp)$/', $nama) === 1;
    }

    // Unggahan admin di R2 berpola "<slug>-<id>-<timestamp 10 digit>.<ext>"; selain itu foto bawaan
    private static function fotoUnggahanR2(?string $nama, int $id): bool
    {
        return $nama !== null && self::namaFotoValid($nama)
            && preg_match('/-' . $id . '-\d{10}\.(jpg|png|webp)$/', $nama) === 1;
    }

    // "Kabel HDMI" -> "kabel-hdmi" (sama dengan aturan nama file foto bawaan)
    private static function slug(string $teks): string
    {
        $slug = trim((string)preg_replace('/[^a-z0-9]+/', '-', strtolower($teks)), '-');
        return substr($slug !== '' ? $slug : 'barang', 0, 60);
    }

    private static function mimeDariNama(string $nama): string
    {
        $ext = strtolower(pathinfo($nama, PATHINFO_EXTENSION));
        return ['png' => 'image/png', 'webp' => 'image/webp'][$ext] ?? 'image/jpeg';
    }

    // Pasang header cache; kalau browser sudah punya versi yang sama -> 304 dan selesai
    private static function kirimFotoJikaBerubah(string $etag): void
    {
        header('Cache-Control: public, max-age=86400');   // URL frontend memakai ?v=versi
        header('ETag: ' . $etag);
        if (str_contains((string)($_SERVER['HTTP_IF_NONE_MATCH'] ?? ''), $etag)) {
            http_response_code(304);
            exit;
        }
    }

    private static function kirimFoto(string $isi, string $mime): never
    {
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . strlen($isi));
        header('X-Content-Type-Options: nosniff');
        echo $isi;
        exit;
    }

    // 404 kalau barang tidak ada (cek ringan, tanpa menghitung stok di view)
    private static function pastikanBarangAda(int $id): void
    {
        $stmt = db()->prepare('SELECT 1 FROM barang WHERE id_barang = :id');
        $stmt->execute(['id' => $id]);
        if ($stmt->fetchColumn() === false) {
            json_error('Barang tidak ditemukan', 404);
        }
    }

    // Ambil satu barang dari view (false kalau tidak ada)
    private static function cariBarang(int $id): array|false
    {
        $stmt = db()->prepare(self::SELECT_BARANG . ' WHERE v.id_barang = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
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