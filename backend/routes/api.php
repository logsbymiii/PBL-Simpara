<?php
declare(strict_types=1);

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