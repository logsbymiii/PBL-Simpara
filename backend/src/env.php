<?php
declare(strict_types=1);

// Baca file .env lalu simpan ke $_ENV
function load_env(string $path): void
{
    if (!is_file($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);

        // lewati komentar dan baris tanpa tanda "="
        if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = explode('=', $line, 2);
        $_ENV[trim($key)] = trim(trim($value), "\"'");
    }
}

// Ambil satu nilai dari .env, atau $default kalau tidak ada
function env(string $key, ?string $default = null): ?string
{
    return $_ENV[$key] ?? $default;
}