<?php
declare(strict_types=1);

// Nyalakan session (cookie disimpan di browser, datanya di server)
function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    session_name('simpara_session');
     $produksi = env('APP_ENV') === 'production';
    session_set_cookie_params([
        'lifetime' => 0,        // hilang saat browser ditutup
        'path'     => '/',
        'httponly' => true,     // cookie tidak bisa dibaca JavaScript (lebih aman)
        'secure'   => $produksi,
        'samesite' => $produksi ? 'None' : 'Lax',
    ]);
    session_start();
}

// Ambil data user yang sedang login, atau null kalau belum login
function current_user(): ?array
{
    start_session();
    return $_SESSION['user'] ?? null;
}

// Penjaga: endpoint ini hanya untuk yang sudah login
function requireLogin(): array
{
    $user = current_user();
    if ($user === null) {
        json_error('Silakan login terlebih dahulu', 401);
    }

    // Akun yang dinonaktifkan admin langsung kehilangan akses, tanpa menunggu logout
    $tabel = $user['role'] === 'admin' ? 'admin' : 'oki';
    $kolom = $user['role'] === 'admin' ? 'id_admin' : 'id_oki';
    $stmt  = db()->prepare("SELECT status_akun FROM {$tabel} WHERE {$kolom} = :id");
    $stmt->execute(['id' => $user['id']]);
    if ($stmt->fetchColumn() !== 'Aktif') {
        $_SESSION = [];
        session_destroy();
        json_error('Akun tidak aktif. Silakan login kembali atau hubungi admin.', 401);
    }
    return $user;
}

// Penjaga: endpoint ini hanya untuk admin
function requireAdmin(): array
{
    $user = requireLogin();
    if ($user['role'] !== 'admin') {
        json_error('Akses ini hanya untuk admin', 403);
    }
    return $user;
}