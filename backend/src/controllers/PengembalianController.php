<?php
declare(strict_types=1);

class PengembalianController
{
    // GET /api/pengembalian/dipinjam  (admin)
    // Pengajuan yang masih dipinjam (status_tampil Dipinjam atau Terlambat)
    public static function dipinjam(array $params = []): void
    {
        requireAdmin();

        $stmt = db()->query(
            "SELECT p.id_pengajuan, m.nama_peminjam,
                    STRING_AGG(CONCAT(b.nama_barang, ' x', d.jumlah), ', ' ORDER BY b.nama_barang) AS barang,
                    p.tanggal_pinjam, p.tanggal_kembali, v.status_tampil,
                    GREATEST(CURRENT_DATE - p.tanggal_kembali::DATE, 0) AS hari_terlambat
             FROM pengajuan p
             JOIN v_pengajuan_status v ON v.id_pengajuan = p.id_pengajuan
             JOIN peminjam m           ON m.id_peminjam  = p.id_peminjam
             JOIN detail_pengajuan d   ON d.id_pengajuan = p.id_pengajuan
             JOIN barang b             ON b.id_barang    = d.id_barang
             WHERE v.status_tampil IN ('Dipinjam', 'Terlambat')
             GROUP BY p.id_pengajuan, m.nama_peminjam, p.tanggal_pinjam,
                      p.tanggal_kembali, v.status_tampil
             ORDER BY p.tanggal_kembali"
        );
        json_success($stmt->fetchAll());
    }

    // GET /api/pengajuan/{id}/pengembalian
    // Isi form pengembalian: barang yang harus dikembalikan + kondisinya (null kalau belum dicatat)
    public static function show(array $params): void
    {
        $user = requireLogin();
        $id   = self::parseId($params['id'] ?? '');
        $data = self::ambilPengembalian($id);

        // Peminjam hanya boleh melihat pengajuan miliknya
        if ($data === null
            || ($user['role'] === 'peminjam' && (int)$data['id_peminjam'] !== (int)$user['id'])) {
            json_error('Pengajuan tidak ditemukan', 404);
        }

        json_success($data);
    }

    // POST /api/pengajuan/{id}/pengembalian  (admin)
    // Body JSON: { "tanggal_kembali_aktual": "2026-11-04 16:00",   <- boleh dikosongkan (pakai waktu sekarang)
    //              "catatan": "...",                                <- boleh dikosongkan
    //              "barang": [ { "id_barang": 1, "kondisi": "Baik", "catatan": null }, ... ] }
    public static function store(array $params): void
    {
        $admin = requireAdmin();
        $id    = self::parseId($params['id'] ?? '');
        $data  = self::validasi(get_json_body());

        $cek = db()->prepare('SELECT 1 FROM pengajuan WHERE id_pengajuan = :id');
        $cek->execute(['id' => $id]);
        if ($cek->fetchColumn() === false) {
            json_error('Pengajuan tidak ditemukan', 404);
        }

        try {
            // Prosedur ini mengecek status, kelengkapan kondisi tiap barang, menyimpan,
            // dan mengubah status pengajuan jadi Selesai. Kalau gagal, tidak ada yang berubah.
            $stmt = db()->prepare(
                'CALL sp_catat_pengembalian(
                     CAST(:id AS INT), CAST(:admin AS INT), CAST(:waktu AS TIMESTAMP),
                     CAST(:detail AS JSONB), CAST(:catatan AS VARCHAR))'
            );
            $stmt->execute([
                'id'      => $id,
                'admin'   => $admin['id'],
                'waktu'   => $data['waktu'],
                'detail'  => json_encode($data['barang'], JSON_UNESCAPED_UNICODE),
                'catatan' => $data['catatan'],
            ]);
        } catch (PDOException $e) {
            $pesan = self::pesanRaise($e);
            if ($pesan !== null) {
                json_error($pesan, 409);
            }
            throw $e;
        }

        json_success(self::ambilPengembalian($id), 'Pengembalian berhasil dicatat', 201);
    }

    // ---------- fungsi bantu ----------

    // Data pengembalian satu pengajuan (null kalau pengajuannya tidak ada)
    private static function ambilPengembalian(int $id): ?array
    {
        $stmt = db()->prepare(
            'SELECT p.id_pengajuan, p.id_peminjam, v.status, v.status_tampil,
                    p.tanggal_pinjam, p.tanggal_kembali
             FROM pengajuan p
             JOIN v_pengajuan_status v ON v.id_pengajuan = p.id_pengajuan
             WHERE p.id_pengajuan = :id'
        );
        $stmt->execute(['id' => $id]);
        $pengajuan = $stmt->fetch();
        if ($pengajuan === false) {
            return null;
        }

        // Barang + kondisi per barang (kondisi_kembali masih NULL sebelum dicatat)
        $stmt = db()->prepare(
            'SELECT b.id_barang, b.kode_barang, b.nama_barang, d.jumlah,
                    dk.kondisi_kembali, dk.catatan
             FROM detail_pengajuan d
             JOIN barang b                    ON b.id_barang = d.id_barang
             LEFT JOIN detail_pengembalian dk ON dk.id_detail = d.id_detail
             WHERE d.id_pengajuan = :id
             ORDER BY b.nama_barang'
        );
        $stmt->execute(['id' => $id]);
        $pengajuan['barang'] = $stmt->fetchAll();

        // Catatan pengembalian (null kalau belum dikembalikan)
        $stmt = db()->prepare(
            'SELECT r.tanggal_kembali_aktual, r.catatan, a.nama_admin AS dicatat_oleh,
                    GREATEST(r.tanggal_kembali_aktual::DATE - p.tanggal_kembali::DATE, 0) AS hari_terlambat
             FROM pengembalian r
             JOIN pengajuan p   ON p.id_pengajuan = r.id_pengajuan
             LEFT JOIN admin a  ON a.id_admin = r.id_admin
             WHERE r.id_pengajuan = :id'
        );
        $stmt->execute(['id' => $id]);
        $pengembalian = $stmt->fetch();
        $pengajuan['pengembalian'] = $pengembalian === false ? null : $pengembalian;

        return $pengajuan;
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

    // Terima "2026-11-04 16:00" atau "2026-11-04T16:00"; null kalau salah
    private static function parseWaktu(mixed $nilai): ?string
    {
        $nilai = trim(str_replace('T', ' ', (string)$nilai));
        $dt    = DateTime::createFromFormat('Y-m-d H:i', $nilai);

        if ($dt === false || $dt->format('Y-m-d H:i') !== $nilai) {
            return null;
        }
        return $nilai;
    }

    // Validasi body pencatatan pengembalian
    private static function validasi(array $body): array
    {
        $waktuMentah = $body['tanggal_kembali_aktual'] ?? null;
        // Kosong -> pakai waktu sekarang
        $waktu   = ($waktuMentah === null || $waktuMentah === '')
            ? date('Y-m-d H:i')
            : self::parseWaktu($waktuMentah);
        $catatan = trim((string)($body['catatan'] ?? ''));
        $mentah  = $body['barang'] ?? null;

        $errors = [];
        if ($waktu === null) {
            $errors['tanggal_kembali_aktual'] = 'Format harus YYYY-MM-DD HH:MM (kosongkan untuk waktu sekarang)';
        }
        if (mb_strlen($catatan) > 255) {
            $errors['catatan'] = 'Catatan maksimal 255 karakter';
        }

        // Kondisi tiap barang: id_barang + kondisi (Baik/Rusak/Hilang), tidak boleh ganda
        $barang = [];
        if (!is_array($mentah) || $mentah === []) {
            $errors['barang'] = 'Kondisi setiap barang wajib diisi';
        } else {
            $sudah = [];
            foreach ($mentah as $item) {
                $idBarang = is_array($item)
                    ? filter_var($item['id_barang'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]])
                    : false;
                $kondisi = is_array($item) ? (string)($item['kondisi'] ?? '') : '';
                $catBrg  = is_array($item) ? trim((string)($item['catatan'] ?? '')) : '';

                if ($idBarang === false || !in_array($kondisi, ['Baik', 'Rusak', 'Hilang'], true)) {
                    $errors['barang'] = 'Setiap barang harus punya id_barang dan kondisi (Baik, Rusak, atau Hilang)';
                    break;
                }
                if (mb_strlen($catBrg) > 255) {
                    $errors['barang'] = 'Catatan barang maksimal 255 karakter';
                    break;
                }
                if (isset($sudah[$idBarang])) {
                    $errors['barang'] = 'Satu barang tidak boleh dicatat dua kali';
                    break;
                }
                $sudah[$idBarang] = true;
                $barang[] = [
                    'id_barang' => $idBarang,
                    'kondisi'   => $kondisi,
                    'catatan'   => $catBrg !== '' ? $catBrg : null,
                ];
            }
        }

        if ($errors) {
            json_error('Data tidak valid', 422, $errors);
        }

        return [
            'waktu'   => $waktu,
            'catatan' => $catatan !== '' ? $catatan : null,
            'barang'  => $barang,
        ];
    }
}