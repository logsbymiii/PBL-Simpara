<?php
declare(strict_types=1);

function load_env(string $path): void
{
    if (!is_file($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);

        if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = explode('=', $line, 2);
        $_ENV[trim($key)] = trim(trim($value), "\"'");
    }
}

function env(string $key, ?string $default = null): ?string
{
    if (isset($_ENV[$key])) {
        return $_ENV[$key];
    }
    $nilai = getenv($key);
    return $nilai !== false ? $nilai : $default;
}