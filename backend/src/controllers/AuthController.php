<?php
declare(strict_types=1);

class AuthController
{
    // POST /api/auth/register
    // Body JSON: { "nama", "nim", "email", "oki", "password" }
    public static function register(array $params = []): void
    {
        $body     = get_json_body();
        $nama     = trim((string)($body['nama'] ?? ''));
        $nim      = trim((string)($body['nim'] ?? ''));
        $email    = strtolower(trim((string)($body['email'] ?? '')));
        $oki      = trim((string)($body['oki'] ?? ''));
        $password = (string)($body['password'] ?? '');

        // 1. Validasi input (aturan password sama dengan front-end: min. 6 karakter)
        $errors = [];
        if ($nama === '')                                $errors['nama']     = 'Nama wajib diisi';
        if ($nim === '')                                 $errors['nim']      = 'NIM wajib diisi';
        if (!filter_var($email, FILTER_VALIDATE_EMAIL))  $errors['email']    = 'Email tidak valid';
        if ($oki === '')                                 $errors['oki']      = 'OKI wajib diisi';
        if (strlen($password) < 6)                       $errors['password'] = 'Password minimal 6 karakter';

        if ($errors) {
            json_error('Data tidak valid', 422, $errors);
        }

        $pdo = db();

        // 2. Cari id_oki dari nama OKI (huruf besar/kecil tidak dibedakan)
        $stmt = $pdo->prepare('SELECT id_oki FROM oki WHERE LOWER(nama_oki) = LOWER(:nama)');
        $stmt->execute(['nama' => $oki]);
        $idOki = $stmt->fetchColumn();

        if ($idOki === false) {
            json_error('Data tidak valid', 422, ['oki' => 'OKI tidak ditemukan']);
        }

        // 3. Cek NIM / email belum dipakai
        $stmt = $pdo->prepare(
            'SELECT 1 FROM peminjam WHERE nim = :nim OR LOWER(email) = LOWER(:email) LIMIT 1'
        );
        $stmt->execute(['nim' => $nim, 'email' => $email]);
        if ($stmt->fetchColumn() !== false) {
            json_error('NIM atau email sudah terdaftar', 409);
        }

        // 4. Simpan. Password di-hash, TIDAK PERNAH disimpan apa adanya
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO peminjam (nim, nama_peminjam, email, id_oki, password, tanggal_daftar)
                 VALUES (:nim, :nama, :email, :id_oki, :password, CURRENT_DATE)
                 RETURNING id_peminjam'
            );
            $stmt->execute([
                'nim'      => $nim,
                'nama'     => $nama,
                'email'    => $email,
                'id_oki'   => $idOki,
                'password' => password_hash($password, PASSWORD_DEFAULT),
            ]);
            $id = (int)$stmt->fetchColumn();
        } catch (PDOException $e) {
            // 23505 = pelanggaran UNIQUE (kalau dua orang daftar bersamaan)
            if ($e->getCode() === '23505') {
                json_error('NIM atau email sudah terdaftar', 409);
            }
            throw $e;
        }

        json_success(
            ['id' => $id, 'nim' => $nim, 'nama' => $nama, 'email' => $email],
            'Pendaftaran berhasil',
            201
        );
    }

    // POST /api/auth/login
    // Peminjam: { "role": "peminjam", "nim", "email", "password" }
    // Admin:    { "role": "admin", "username", "password" }
    public static function login(array $params = []): void
    {
        $body = get_json_body();
        $role = (string)($body['role'] ?? 'peminjam');

        if ($role === 'admin') {
            self::loginAdmin($body);
        } elseif ($role === 'peminjam') {
            self::loginPeminjam($body);
        } else {
            json_error('Role tidak dikenal', 422);
        }
    }

    private static function loginPeminjam(array $body): void
    {
        $nim      = trim((string)($body['nim'] ?? ''));
        $email    = trim((string)($body['email'] ?? ''));
        $password = (string)($body['password'] ?? '');

        if ($nim === '' || $email === '' || $password === '') {
            json_error('NIM, email, dan password wajib diisi', 422);
        }

        $stmt = db()->prepare(
            'SELECT id_peminjam, nim, nama_peminjam, email, password, status_akun
             FROM peminjam
             WHERE nim = :nim AND LOWER(email) = LOWER(:email)'
        );
        $stmt->execute(['nim' => $nim, 'email' => $email]);
        $row = $stmt->fetch();

        // Pesan sengaja disamakan: jangan beri tahu mana yang salah
        if ($row === false || !password_verify($password, $row['password'])) {
            json_error('NIM, email, atau password salah', 401);
        }

        // Password benar, tapi akun dinonaktifkan admin
        if ($row['status_akun'] !== 'Aktif') {
            json_error('Akun Anda dinonaktifkan. Hubungi admin.', 403);
        }

        $user = [
            'id'    => (int)$row['id_peminjam'],
            'role'  => 'peminjam',
            'nim'   => $row['nim'],
            'nama'  => $row['nama_peminjam'],
            'email' => $row['email'],
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
            'SELECT id_admin, username, password, nama_admin, jabatan
             FROM admin
             WHERE username = :username'
        );
        $stmt->execute(['username' => $username]);
        $row = $stmt->fetch();

        if ($row === false || !password_verify($password, $row['password'])) {
            json_error('Username atau password salah', 401);
        }

        $user = [
            'id'       => (int)$row['id_admin'],
            'role'     => 'admin',
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
        json_success(requireLogin(), 'OK');
    }
}