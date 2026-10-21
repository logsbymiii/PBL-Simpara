<?php
declare(strict_types=1);

function db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $dsn = sprintf(
        'pgsql:host=%s;port=%s;dbname=%s',
        env('DB_HOST', '127.0.0.1'),
        env('DB_PORT', '5432'),
        env('DB_NAME', '')
    );

    $pdo = new PDO($dsn, env('DB_USER', ''), env('DB_PASS', ''), [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,   // error SQL jadi exception
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,         // hasil berupa array asosiatif
        PDO::ATTR_EMULATE_PREPARES   => false,                    // prepared statement asli
    ]);

    return $pdo;
}