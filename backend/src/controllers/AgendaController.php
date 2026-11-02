<?php
declare(strict_types=1);

class AgendaController
{
    // GET /api/agenda
    // PUBLIK (tanpa login): agenda internal HMTI yang akan datang / sedang berlangsung.
    // Sengaja membaca tabel agenda_hmti langsung, BUKAN view v_kalender:
    // v_kalender berisi nama peminjam, tidak boleh dilihat tamu.
    public static function index(array $params = []): void
    {
        $stmt = db()->query(
            'SELECT id_agenda, nama_agenda, tanggal_mulai, tanggal_selesai, keterangan
             FROM agenda_hmti
             WHERE tanggal_selesai >= CURRENT_DATE
             ORDER BY tanggal_mulai, id_agenda'
        );
        json_success($stmt->fetchAll());
    }
}
