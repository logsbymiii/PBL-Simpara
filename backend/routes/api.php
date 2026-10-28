<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/controllers/PengajuanController.php';
require_once __DIR__ . '/../src/controllers/AuthController.php';
require_once __DIR__ . '/../src/controllers/BarangController.php';

// GET /api/ping  -> cek server hidup + cek koneksi database
$router->get('/api/ping', function (): void {
    $database = 'terhubung';
    $detail   = null;

    try {
        db()->query('SELECT 1');
    } catch (Throwable $e) {
        $database = 'gagal terhubung';
        // alasan gagal hanya ditampilkan saat development
        if (env('APP_ENV') === 'development') {
            $detail = $e->getMessage();
        }
    }

    json_success([
        'server'   => 'SIMPARA API',
        'waktu'    => date('Y-m-d H:i:s'),
        'database' => $database,
    ], 'pong');
});

// Autentikasi
$router->post('/api/auth/register', [AuthController::class, 'register']);
$router->post('/api/auth/login',    [AuthController::class, 'login']);
$router->post('/api/auth/logout',   [AuthController::class, 'logout']);
$router->get('/api/auth/me',        [AuthController::class, 'me']);

// Barang.
// PENTING: rute yang spesifik (statistik, tersedia) harus DI ATAS rute {id},
// kalau tidak, "statistik" akan dibaca sebagai id barang.
$router->get('/api/kategori',         [BarangController::class, 'kategori']);
$router->get('/api/barang/statistik', [BarangController::class, 'statistik']);
$router->get('/api/barang/tersedia',  [BarangController::class, 'tersedia']);
$router->get('/api/barang',           [BarangController::class, 'index']);
$router->post('/api/barang',          [BarangController::class, 'store']);
$router->get('/api/barang/{id}',      [BarangController::class, 'show']);
$router->put('/api/barang/{id}',      [BarangController::class, 'update']);
$router->delete('/api/barang/{id}',   [BarangController::class, 'destroy']);

// Pengajuan
$router->post('/api/pengajuan',     [PengajuanController::class, 'store']);
$router->get('/api/pengajuan',      [PengajuanController::class, 'index']);
$router->get('/api/pengajuan/{id}', [PengajuanController::class, 'show']);