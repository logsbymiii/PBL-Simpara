<?php
declare(strict_types=1);

// Akun peminjam adalah akun OKI (organisasi). Siapa orang yang meminjam diisi
// di form pengajuan (nama, NIM, no HP), bukan lewat akun.
class AuthController
{
    // GET /api/oki  (publik)
    // Daftar OKI aktif untuk dropdown login. Password tidak pernah ikut.
    public static function daftarOki(array $params = []): void
    {
        $stmt = db()->query(
            "SELECT id_oki, nama_oki FROM oki WHERE status_akun = 'Aktif' ORDER BY nama_oki"
        );
        json_success($stmt->fetchAll());
    }

    // POST /api/auth/register
    // Body JSON: { "oki": "UKM Catur", "password": "minimal6" }
    // Membuat akun OKI baru. Nama OKI tidak boleh sama (huruf besar/kecil tidak dibedakan).
    public static function register(array $params = []): void
    {
        $body     = get_json_body();
        $nama     = trim((string)($body['oki'] ?? $body['nama_oki'] ?? ''));
        $email    = trim((string)($body['email'] ?? ''));
        $password = (string)($body['password'] ?? '');

        $errors = [];
        if ($email === '') {
            $errors['email'] = 'Email wajib diisi';
        } elseif (mb_strlen($email) > 100) {
            $errors['email'] = 'Email maksimal 100 karakter';
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Format email tidak valid';
        }
        if ($nama === '') {
            $errors['oki'] = 'Nama OKI wajib diisi';
        } elseif (mb_strlen($nama) > 100) {
            $errors['oki'] = 'Nama OKI maksimal 100 karakter';
        }
        if (mb_strlen($password) < 6) {
            $errors['password'] = 'Password minimal 6 karakter';
        }
        if ($errors) {
            json_error('Data tidak valid', 422, $errors);
        }

        $pdo  = db();
        $stmt = $pdo->prepare('SELECT 1 FROM oki WHERE LOWER(nama_oki) = LOWER(:nama)');
        $stmt->execute(['nama' => $nama]);
        if ($stmt->fetchColumn() !== false) {
            json_error('OKI sudah terdaftar', 409);
        }
        $stmt = $pdo->prepare('SELECT 1 FROM oki WHERE LOWER(email) = LOWER(:email)');
        $stmt->execute(['email' => $email]);
        if ($stmt->fetchColumn() !== false) {
            json_error('Email sudah terdaftar', 409);
        }

        try {
            // Password di-hash, TIDAK PERNAH disimpan apa adanya
            $stmt = $pdo->prepare(
                'INSERT INTO oki (nama_oki, email, password) VALUES (:nama, :email, :password) RETURNING id_oki'
            );
            $stmt->execute([
                'nama'     => $nama,
                'email'    => $email,
                'password' => password_hash($password, PASSWORD_DEFAULT),
            ]);
            $id = (int)$stmt->fetchColumn();
        } catch (PDOException $e) {
            if ($e->getCode() === '23505') { // dua orang mendaftar bersamaan
                json_error(
                    str_contains($e->getMessage(), 'oki_email_unik') ? 'Email sudah terdaftar' : 'OKI sudah terdaftar',
                    409
                );
            }
            throw $e;
        }

        json_success(['id' => $id, 'nama_oki' => $nama, 'email' => $email], 'Pendaftaran berhasil', 201);
    }

    // POST /api/auth/login
    // Peminjam (OKI): { "role": "peminjam", "id_oki": 1, "password" }   atau "oki": "HMTI" sebagai ganti id_oki
    // Admin:          { "role": "admin", "username", "password" }
    public static function login(array $params = []): void
    {
        $body = get_json_body();
        $role = (string)($body['role'] ?? 'peminjam');

        if ($role === 'admin') {
            self::loginAdmin($body);
        } elseif ($role === 'peminjam') {
            self::loginOki($body);
        } else {
            json_error('Role tidak dikenal', 422);
        }
    }

    private static function loginOki(array $body): void
    {
        $idOki    = filter_var($body['id_oki'] ?? null, FILTER_VALIDATE_INT);
        $nama     = trim((string)($body['oki'] ?? ''));
        $password = (string)($body['password'] ?? '');

        if (($idOki === false && $nama === '') || $password === '') {
            json_error('OKI dan password wajib diisi', 422);
        }

        if ($idOki !== false) {
            $stmt = db()->prepare('SELECT id_oki, nama_oki, password, status_akun FROM oki WHERE id_oki = :id');
            $stmt->execute(['id' => $idOki]);
        } else {
            $stmt = db()->prepare(
                'SELECT id_oki, nama_oki, password, status_akun FROM oki WHERE LOWER(nama_oki) = LOWER(:nama)'
            );
            $stmt->execute(['nama' => $nama]);
        }
        $row = $stmt->fetch();

        // Pesan sengaja disamakan: jangan beri tahu mana yang salah
        if ($row === false || !password_verify($password, $row['password'])) {
            json_error('OKI atau password salah', 401);
        }
        if ($row['status_akun'] !== 'Aktif') {
            json_error('Akun OKI Anda dinonaktifkan. Hubungi admin.', 403);
        }

        $user = [
            'id'       => (int)$row['id_oki'],
            'role'     => 'peminjam',
            'nama'     => $row['nama_oki'],
            'nama_oki' => $row['nama_oki'],
        ];
        self::startLoginSession($user);
        json_success($user, 'Login berhasil');
    }

    private static function loginAdmin(array $body): void
    {
        $username = trim((string)($body['username'] ?? ''));
        $password = (string)($body['password'] ?? '');

        if ($username === '' || $password === '') {
            json_error('Username dan password wajib diisi', 422);
        }

        $stmt = db()->prepare(
            'SELECT id_admin, username, password, nama_admin, jabatan, role, status_akun
             FROM admin
             WHERE username = :username'
        );
        $stmt->execute(['username' => $username]);
        $row = $stmt->fetch();

        if ($row === false || !password_verify($password, $row['password'])) {
            json_error('Username atau password salah', 401);
        }
        if ($row['status_akun'] !== 'Aktif') {
            json_error('Akun admin dinonaktifkan.', 403);
        }

        // role tetap 'admin' supaya pengecekan lama jalan; 'level' membedakan admin / super_admin
        $user = [
            'id'       => (int)$row['id_admin'],
            'role'     => 'admin',
            'level'    => $row['role'],
            'username' => $row['username'],
            'nama'     => $row['nama_admin'],
            'jabatan'  => $row['jabatan'],
        ];
        self::startLoginSession($user);
        json_success($user, 'Login berhasil');
    }

    // Simpan identitas ke session
    private static function startLoginSession(array $user): void
    {
        start_session();
        session_regenerate_id(true); // ganti ID session setelah login (anti session fixation)
        $_SESSION['user'] = $user;
    }

    // POST /api/auth/logout
    public static function logout(array $params = []): void
    {
        start_session();
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $c = session_get_cookie_params();
            setcookie(session_name(), '', time() - 3600, $c['path'], $c['domain'], $c['secure'], $c['httponly']);
        }
        session_destroy();
        json_success(null, 'Logout berhasil');
    }

    // GET /api/auth/me
    public static function me(array $params = []): void
    {
        $user = requireLogin();

        // Email OKI tidak ada di sesi; ambil terbaru dari database
        if ($user['role'] === 'peminjam') {
            $stmt = db()->prepare('SELECT email FROM oki WHERE id_oki = :id');
            $stmt->execute(['id' => $user['id']]);
            $user['email'] = $stmt->fetchColumn() ?: null;
        }

        json_success($user, 'OK');
    }

    // POST /api/auth/ubah-password   { "password_lama": "...", "password_baru": "..." }
    // Untuk peminjam (OKI) maupun admin yang sedang login.
    public static function ubahPassword(array $params = []): void
    {
        $user = requireLogin();
        $body = get_json_body();
        $lama = (string)($body['password_lama'] ?? '');
        $baru = (string)($body['password_baru'] ?? '');

        $errors = [];
        if ($lama === '') {
            $errors['password_lama'] = 'Password lama wajib diisi';
        }
        if (mb_strlen($baru) < 6) {
            $errors['password_baru'] = 'Password baru minimal 6 karakter';
        } elseif ($baru === $lama) {
            $errors['password_baru'] = 'Password baru harus berbeda dari password lama';
        }
        if ($errors) {
            json_error('Data tidak valid', 422, $errors);
        }

        $admin = $user['role'] === 'admin';
        $tabel = $admin ? 'admin' : 'oki';
        $kolom = $admin ? 'id_admin' : 'id_oki';

        $pdo  = db();
        $stmt = $pdo->prepare("SELECT password FROM {$tabel} WHERE {$kolom} = :id");
        $stmt->execute(['id' => $user['id']]);
        $hash = $stmt->fetchColumn();

        if ($hash === false || !password_verify($lama, $hash)) {
            json_error('Password lama salah', 403);
        }

        // Password di-hash, TIDAK PERNAH disimpan apa adanya
        $stmt = $pdo->prepare("UPDATE {$tabel} SET password = :password WHERE {$kolom} = :id");
        $stmt->execute(['password' => password_hash($baru, PASSWORD_DEFAULT), 'id' => $user['id']]);

        json_success(null, 'Password berhasil diubah');
    }
}