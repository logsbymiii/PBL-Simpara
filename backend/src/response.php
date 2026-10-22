<?php
declare(strict_types=1);

// Kirim JSON lalu hentikan script
function json_response(mixed $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Respons sukses
function json_success(mixed $data = null, string $message = 'OK', int $status = 200): never
{
    json_response(['success' => true, 'message' => $message, 'data' => $data], $status);
}

// Respons gagal (400 salah input, 401 belum login, 404 tidak ada, dst.)
function json_error(string $message, int $status = 400, ?array $errors = null): never
{
    json_response(['success' => false, 'message' => $message, 'errors' => $errors], $status);
}

// Baca body request yang berupa JSON (dipakai untuk POST/PUT)
function get_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        json_error('Body request harus berupa JSON yang valid', 400);
    }
    return $data;
}