<?php
declare(strict_types=1);

// Klien kecil Cloudflare R2 (S3 API) tanpa SDK: AWS Signature V4 dengan curl + hash_hmac.
// Endpoint: https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com, region "auto", path-style /<bucket>/<key>.
// Kredensial hanya dari environment (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET);
// kalau salah satu kosong, R2 dianggap tidak aktif dan semua fungsi mengembalikan null/false.
// Pesan error tidak pernah memuat kredensial atau URL lengkap.

const R2_TIMEOUT = 8;   // detik, total satu permintaan

// Konfigurasi R2, atau null kalau belum diisi lengkap
function r2_konfig(): ?array
{
    $k = [
        'account' => (string)env('R2_ACCOUNT_ID', ''),
        'key'     => (string)env('R2_ACCESS_KEY_ID', ''),
        'secret'  => (string)env('R2_SECRET_ACCESS_KEY', ''),
        'bucket'  => (string)env('R2_BUCKET', ''),
    ];
    foreach ($k as $nilai) {
        if (trim($nilai) === '') {
            return null;
        }
    }
    return $k;
}

function r2Aktif(): bool
{
    return r2_konfig() !== null && function_exists('curl_init');
}

// Key objek hanya boleh huruf/angka/titik/strip/garis bawah dengan folder '/', tanpa '..'
function r2_key_valid(string $key): bool
{
    return $key !== ''
        && strlen($key) <= 200
        && !str_contains($key, '..')
        && preg_match('#^[A-Za-z0-9._-]+(/[A-Za-z0-9._-]+)*$#', $key) === 1;
}

// Header Authorization AWS Signature V4. $headers = [nama => nilai] yang ikut ditandatangani
// (wajib berisi host dan x-amz-date). Fungsi murni, diuji dengan vektor uji resmi AWS
// di backend/tests/sigv4_test.php.
function sigv4_otorisasi(
    string $method, string $path, string $query, array $headers, string $hashBody,
    string $region, string $service, string $accessKey, string $secretKey
): string {
    $kanonis = [];
    foreach ($headers as $nama => $nilai) {
        $kanonis[strtolower(trim((string)$nama))] = preg_replace('/\s+/', ' ', trim((string)$nilai));
    }
    ksort($kanonis, SORT_STRING);
    $daftarHeader = '';
    foreach ($kanonis as $nama => $nilai) {
        $daftarHeader .= $nama . ':' . $nilai . "\n";
    }
    $signedHeaders = implode(';', array_keys($kanonis));

    $amzDate = $kanonis['x-amz-date'];
    $tanggal = substr($amzDate, 0, 8);
    $scope   = "{$tanggal}/{$region}/{$service}/aws4_request";

    $permintaanKanonis = implode("\n", [
        strtoupper($method), $path, $query, $daftarHeader, $signedHeaders, $hashBody,
    ]);
    $teksDitandatangani = implode("\n", [
        'AWS4-HMAC-SHA256', $amzDate, $scope, hash('sha256', $permintaanKanonis),
    ]);

    $kunci = hash_hmac('sha256', $tanggal, 'AWS4' . $secretKey, true);
    $kunci = hash_hmac('sha256', $region, $kunci, true);
    $kunci = hash_hmac('sha256', $service, $kunci, true);
    $kunci = hash_hmac('sha256', 'aws4_request', $kunci, true);
    $tanda = hash_hmac('sha256', $teksDitandatangani, $kunci);

    return "AWS4-HMAC-SHA256 Credential={$accessKey}/{$scope}, SignedHeaders={$signedHeaders}, Signature={$tanda}";
}

// Satu permintaan ke R2. Hasil: ['status' => int, 'body' => string, 'headers' => [nama => nilai]],
// atau null kalau R2 tidak aktif / key tidak valid / gagal konek.
function r2_permintaan(string $method, string $key, string $body = '', ?string $contentType = null): ?array
{
    $k = r2_konfig();
    if ($k === null || !function_exists('curl_init') || !r2_key_valid($key)) {
        return null;
    }

    $host = $k['account'] . '.r2.cloudflarestorage.com';
    // Path-style; setiap bagian di-encode (karakter yang lolos validasi sebenarnya tidak berubah)
    $path = '/' . rawurlencode($k['bucket']) . '/' . implode('/', array_map('rawurlencode', explode('/', $key)));
    $hashBody = hash('sha256', $body);

    $headers = [
        'host'                 => $host,
        'x-amz-content-sha256' => $hashBody,
        'x-amz-date'           => gmdate('Ymd\THis\Z'),
    ];
    if ($contentType !== null) {
        $headers['content-type'] = $contentType;
    }
    $headers['authorization'] = sigv4_otorisasi(
        $method, $path, '', $headers, $hashBody, 'auto', 's3', $k['key'], $k['secret']
    );

    $daftar = ['Expect:'];   // matikan "Expect: 100-continue" dari curl
    foreach ($headers as $nama => $nilai) {
        if ($nama !== 'host') {
            $daftar[] = $nama . ': ' . $nilai;
        }
    }

    $headerBalasan = [];
    $ch = curl_init('https://' . $host . $path);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_TIMEOUT        => R2_TIMEOUT,
        CURLOPT_HTTPHEADER     => $daftar,
        CURLOPT_HEADERFUNCTION => function ($ch, string $baris) use (&$headerBalasan): int {
            $bagian = explode(':', $baris, 2);
            if (count($bagian) === 2) {
                $headerBalasan[strtolower(trim($bagian[0]))] = trim($bagian[1]);
            }
            return strlen($baris);
        },
    ]);
    if ($method === 'PUT') {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    if ($method === 'HEAD') {
        curl_setopt($ch, CURLOPT_NOBODY, true);
    }

    $hasil  = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $galat  = curl_errno($ch);
    curl_close($ch);

    if ($hasil === false || $galat !== 0) {
        // Hanya kode error curl yang dicatat: tanpa URL, key akses, atau isi header
        error_log("R2 {$method} gagal (curl errno {$galat})");
        return null;
    }
    return ['status' => $status, 'body' => (string)$hasil, 'headers' => $headerBalasan];
}

// Ambil objek. Hasil: ['body', 'content_type', 'etag'] atau null (tidak ada / R2 gagal / tidak aktif)
function r2Get(string $key): ?array
{
    $r = r2_permintaan('GET', $key);
    if ($r === null || $r['status'] !== 200) {
        if ($r !== null && $r['status'] !== 404) {
            error_log("R2 GET status {$r['status']}");
        }
        return null;
    }
    return [
        'body'         => $r['body'],
        'content_type' => $r['headers']['content-type'] ?? '',
        'etag'         => $r['headers']['etag'] ?? '',
    ];
}

// Simpan objek. true kalau berhasil.
function r2Put(string $key, string $body, string $contentType): bool
{
    $r = r2_permintaan('PUT', $key, $body, $contentType);
    if ($r === null || $r['status'] !== 200) {
        if ($r !== null) {
            error_log("R2 PUT status {$r['status']}");
        }
        return false;
    }
    return true;
}

// Hapus objek. Objek yang memang tidak ada dianggap berhasil.
function r2Delete(string $key): bool
{
    $r = r2_permintaan('DELETE', $key);
    if ($r === null || !in_array($r['status'], [200, 204, 404], true)) {
        if ($r !== null) {
            error_log("R2 DELETE status {$r['status']}");
        }
        return false;
    }
    return true;
}
