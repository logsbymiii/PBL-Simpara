<?php
declare(strict_types=1);

// Unggah foto bawaan (frontend/assets/images/barang/*) ke R2 dengan key "barang/<nama file>".
// Dijalankan SEKALI dari laptop (bukan dari server): php backend/tools/r2_unggah_bawaan.php
// Kredensial dibaca dari backend/.env atau environment (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
// R2_SECRET_ACCESS_KEY, R2_BUCKET). File statis di repo tetap ada sebagai cadangan.

require __DIR__ . '/../src/env.php';
require __DIR__ . '/../src/R2.php';
load_env(__DIR__ . '/../.env');

if (!r2Aktif()) {
    fwrite(STDERR, "R2 belum aktif: isi R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET dulu.\n");
    exit(1);
}

$mime  = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'];
$file  = glob(__DIR__ . '/../../frontend/assets/images/barang/*.{jpg,jpeg,png,webp}', GLOB_BRACE) ?: [];
$gagal = 0;

foreach ($file as $path) {
    $nama = basename($path);
    $ext  = strtolower(pathinfo($nama, PATHINFO_EXTENSION));
    $ok   = r2Put('barang/' . $nama, (string)file_get_contents($path), $mime[$ext]);
    echo ($ok ? 'OK    ' : 'GAGAL ') . "barang/{$nama}\n";
    if (!$ok) {
        $gagal++;
    }
}

echo count($file) . " file diproses, {$gagal} gagal\n";
exit($gagal === 0 ? 0 : 1);
