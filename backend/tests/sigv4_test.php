<?php
declare(strict_types=1);

// Uji fungsi tanda tangan AWS Signature V4 (backend/src/R2.php) dengan vektor uji PUBLIK dari AWS.
// Kredensial di bawah adalah contoh resmi dokumentasi AWS (AKIDEXAMPLE / AKIAIOSFODNN7EXAMPLE),
// BUKAN kredensial R2 asli. Tidak ada koneksi jaringan.
// Jalankan: php backend/tests/sigv4_test.php

require __DIR__ . '/../src/env.php';
require __DIR__ . '/../src/R2.php';

$lulus = 0;
$gagal = 0;

function cek(string $nama, string $hasil, string $harapan): void
{
    global $lulus, $gagal;
    if ($hasil === $harapan) {
        $lulus++;
        echo "LULUS  {$nama}\n";
    } else {
        $gagal++;
        echo "GAGAL  {$nama}\n  hasil  : {$hasil}\n  harapan: {$harapan}\n";
    }
}

// 1. AWS SigV4 test suite: "get-vanilla"
cek('get-vanilla (aws-sig-v4-test-suite)',
    sigv4_otorisasi(
        'GET', '/', '',
        ['Host' => 'example.amazonaws.com', 'X-Amz-Date' => '20150830T123600Z'],
        hash('sha256', ''),
        'us-east-1', 'service',
        'AKIDEXAMPLE', 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY'
    ),
    'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, '
    . 'SignedHeaders=host;x-amz-date, '
    . 'Signature=5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31'
);

// 2. Dokumentasi Amazon S3 "Signature Calculations for the Authorization Header", contoh GET Object
cek('S3 GET Object (dokumentasi Amazon S3)',
    sigv4_otorisasi(
        'GET', '/test.txt', '',
        [
            'Host'                 => 'examplebucket.s3.amazonaws.com',
            'Range'                => 'bytes=0-9',
            'x-amz-content-sha256' => hash('sha256', ''),
            'x-amz-date'           => '20130524T000000Z',
        ],
        hash('sha256', ''),
        'us-east-1', 's3',
        'AKIAIOSFODNN7EXAMPLE', 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
    ),
    'AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, '
    . 'SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, '
    . 'Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41'
);

// 3. Validasi key (pencegahan path traversal)
cek('key valid', var_export(r2_key_valid('barang/kamera.jpg'), true), 'true');
cek('tolak ../', var_export(r2_key_valid('barang/../rahasia.txt'), true), 'false');
cek('tolak spasi', var_export(r2_key_valid('barang/a b.jpg'), true), 'false');
cek('tolak path absolut', var_export(r2_key_valid('/etc/passwd'), true), 'false');

// 4. Tanpa env R2, klien tidak aktif dan tidak crash
foreach (['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'] as $v) {
    unset($_ENV[$v]);
    putenv($v);
}
cek('R2 tidak aktif tanpa env', var_export(r2Aktif(), true), 'false');
cek('r2Get tanpa env -> null', var_export(r2Get('barang/kamera.jpg'), true), 'NULL');

echo "\n{$lulus} lulus, {$gagal} gagal\n";
exit($gagal === 0 ? 0 : 1);
