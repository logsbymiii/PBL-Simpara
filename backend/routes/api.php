<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/controllers/AuthController.php';

// GET /api/ping  -> cek server hidup + cek koneksi database
$router->get('/api/ping', function (): void {
    try {
        db()->query('SELECT 1');
        $database = 'terhubung';
    } catch (Throwable $e) {
        $database = 'gagal terhubung';
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