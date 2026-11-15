<?php
declare(strict_types=1);

// Fungsi bantu yang dipakai beberapa controller

// ID dari URL harus angka positif. $nama dipakai di pesan error, mis. "ID barang tidak valid"
function parse_id(mixed $nilai, string $nama): int
{
    $nilai = (string)$nilai;
    if (!ctype_digit($nilai) || (int)$nilai < 1) {
        json_error("ID {$nama} tidak valid", 422);
    }
    return (int)$nilai;
}

// Terima "2026-11-10 08:00" atau "2026-11-10T08:00"; null kalau salah
function parse_waktu(mixed $nilai): ?string
{
    $nilai = trim(str_replace('T', ' ', (string)$nilai));
    $dt    = DateTime::createFromFormat('Y-m-d H:i', $nilai);

    // cek ketat: tanggal ngawur seperti 2026-02-31 ditolak
    if ($dt === false || $dt->format('Y-m-d H:i') !== $nilai) {
        return null;
    }
    return $nilai;
}

// Ambil pesan bersih dari RAISE EXCEPTION (SQLSTATE P0001); null kalau error jenis lain
function pesan_raise(PDOException $e): ?string
{
    if (($e->errorInfo[0] ?? '') !== 'P0001') {
        return null;
    }
    $pesan = (string)($e->errorInfo[2] ?? '');
    $pesan = preg_replace('/^\s*(?:\d+\s+)?ERROR:\s*/', '', $pesan) ?? $pesan;
    $pesan = explode("\n", $pesan)[0];
    return trim($pesan);
}
