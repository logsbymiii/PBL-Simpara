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

// ---------- Batas percobaan gagal (login, PIN batal) ----------
// Dihitung per session: maksimal 5 gagal dalam 10 menit, setelah itu ditolak sementara.
const BATAS_GAGAL   = 5;
const JENDELA_GAGAL = 600; // detik

// Tolak (429) kalau percobaan gagal $jenis sudah mencapai batas
function cek_batas_percobaan(string $jenis): void
{
    start_session();
    $batasWaktu = time() - JENDELA_GAGAL;
    $daftar     = array_values(array_filter(
        $_SESSION['gagal'][$jenis] ?? [],
        fn($waktu) => $waktu > $batasWaktu
    ));
    $_SESSION['gagal'][$jenis] = $daftar;

    if (count($daftar) >= BATAS_GAGAL) {
        $menit = max(1, (int)ceil(($daftar[0] + JENDELA_GAGAL - time()) / 60));
        json_error("Terlalu banyak percobaan gagal. Coba lagi dalam {$menit} menit.", 429);
    }
}

function catat_percobaan_gagal(string $jenis): void
{
    start_session();
    $_SESSION['gagal'][$jenis][] = time();
}

// Dipanggil setelah berhasil, supaya hitungan mulai dari nol lagi
function hapus_percobaan_gagal(string $jenis): void
{
    start_session();
    unset($_SESSION['gagal'][$jenis]);
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