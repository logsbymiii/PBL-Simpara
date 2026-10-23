<?php
declare(strict_types=1);

require_once __DIR__ . '/env.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/database.php';
require_once __DIR__ . '/Router.php';
require_once __DIR__ . '/session.php';

load_env(__DIR__ . '/../.env');

date_default_timezone_set('Asia/Jakarta');

// Jangan tampilkan error PHP mentah ke browser
ini_set('display_errors', '0');

// Error tak terduga -> JSON 500 (detail hanya muncul saat development)
set_exception_handler(function (Throwable $e): void {
    error_log($e->getMessage());
    $detail = env('APP_ENV') === 'development' ? ['detail' => $e->getMessage()] : null;
    json_error('Terjadi kesalahan pada server', 500, $detail);
});

// CORS: izinkan front-end memanggil API ini
header('Access-Control-Allow-Origin: ' . env('CORS_ORIGIN', 'http://127.0.0.1:5500'));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

// Browser kirim request OPTIONS dulu (preflight); cukup dijawab kosong
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$router = new Router();