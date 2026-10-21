<?php
declare(strict_types=1);

class Router
{
    private array $routes = [];

    public function get(string $path, callable $handler): void    { $this->add('GET', $path, $handler); }
    public function post(string $path, callable $handler): void   { $this->add('POST', $path, $handler); }
    public function put(string $path, callable $handler): void    { $this->add('PUT', $path, $handler); }
    public function delete(string $path, callable $handler): void { $this->add('DELETE', $path, $handler); }

    private function add(string $method, string $path, callable $handler): void
    {
        // ubah "/api/barang/{id}" menjadi regex dengan parameter bernama
        $regex = '#^' . preg_replace('#\{(\w+)\}#', '(?P<$1>[^/]+)', $path) . '$#';
        $this->routes[] = [$method, $regex, $handler];
    }

    public function dispatch(): void
    {
        $method = $_SERVER['REQUEST_METHOD'];
        $uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/';

        // buang folder dasar kalau dijalankan lewat Apache Laragon (subfolder)
        $base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
        if ($base !== '' && str_starts_with($uri, $base)) {
            $uri = substr($uri, strlen($base));
        }
        $uri = '/' . trim($uri, '/');

        $pathFound = false;
        foreach ($this->routes as [$routeMethod, $regex, $handler]) {
            if (preg_match($regex, $uri, $matches)) {
                if ($routeMethod !== $method) {
                    $pathFound = true; // URL cocok tapi method beda
                    continue;
                }
                // ambil hanya parameter bernama, mis. ['id' => '5']
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
                $handler($params);
                return;
            }
        }

        if ($pathFound) {
            json_error('Method tidak diizinkan', 405);
        }
        json_error('Endpoint tidak ditemukan', 404);
    }
}