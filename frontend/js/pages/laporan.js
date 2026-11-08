const user = requireLogin('admin');
renderSidebar('admin', 'Laporan');
renderTopbar(user);
 
let semua = [];   // data bulan yang sedang dipilih (dari server)
let hasil = [];   // data setelah filter status (yang tampil dan masuk CSV)
let nomorPermintaan = 0;
 
const tabel = document.getElementById('tabel');
const inputBulan = document.getElementById('bulan');
const inputStatus = document.getElementById('filter');
 
// Tanggal dari server berformat 'YYYY-MM-DD HH:MM:SS'; ganti spasi jadi T supaya aman di Safari
const tgl = s => formatTanggal(String(s).replace(' ', 'T'));
 
// '2026-10' -> { dari: '2026-10-01', sampai: '2026-10-31' }
function rentangBulan(bulan) {
    if (!bulan) return {};
    const [tahun, bln] = bulan.split('-').map(Number);
    const hariTerakhir = new Date(tahun, bln, 0).getDate();   // hari ke-0 bulan berikutnya = hari terakhir bulan ini
    return { dari: `${bulan}-01`, sampai: `${bulan}-${String(hariTerakhir).padStart(2, '0')}` };
}
 
function tampilkan() {
    const status = inputStatus.value;
    hasil = semua.filter(p => !status || p.status_tampil === status);
 
    tabel.innerHTML = hasil.length ? hasil.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(p.nama_peminjam)}<br><small>${esc(p.nama_oki)}</small></td>
      <td>${esc(p.nama_barang)} ×${p.jumlah}</td>
      <td>${tgl(p.tanggal_pinjam)}</td>
      <td>${tgl(p.tanggal_kembali)}</td>
      <td>${badge(p.status_tampil)}</td>
    </tr>`).join('') : '<tr><td colspan="6" class="empty">Tidak ada data untuk filter ini.</td></tr>';
}
 
async function muat() {
    const nomor = ++nomorPermintaan;   // jawaban lama yang telat datang diabaikan
    tabel.innerHTML = '<tr><td colspan="6" class="empty">Memuat laporan...</td></tr>';
    try {
        const data = await apiGet('/api/laporan/peminjaman', rentangBulan(inputBulan.value));
        if (nomor !== nomorPermintaan) return;
        semua = data;
        tampilkan();
    } catch (e) {
        if (nomor !== nomorPermintaan) return;
        semua = [];
        hasil = [];
        tabel.innerHTML = `<tr><td colspan="6" class="empty">${esc(e.message)}</td></tr>`;
    }
}
 
// Nilai yang diawali = + - @ bisa dibaca Excel sebagai rumus; awali dengan tanda ' supaya tetap teks
const amanCsv = c => /^[=+\-@]/.test(String(c)) ? `'${c}` : c;
 
function unduhCSV() {
    const baris = [['No', 'Peminjam', 'NIM', 'OKI', 'Barang', 'Jumlah', 'Tanggal Pinjam', 'Tanggal Kembali', 'Status']];
    hasil.forEach((p, i) => baris.push([
        i + 1, p.nama_peminjam, p.nim, p.nama_oki, p.nama_barang, p.jumlah,
        p.tanggal_pinjam, p.tanggal_kembali, p.status_tampil
    ]));
 
    const csv = baris.map(r => r.map(c => `"${String(amanCsv(c ?? '')).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'laporan-peminjaman.csv';
    a.click();
    URL.revokeObjectURL(a.href);
}
 
inputBulan.addEventListener('change', muat);        // bulan berubah: ambil ulang dari server
inputStatus.addEventListener('change', tampilkan);  // status berubah: cukup saring data yang sudah ada
document.getElementById('btnReset').addEventListener('click', () => {
    inputBulan.value = '';
    inputStatus.value = '';
    muat();
});
document.getElementById('btnCsv').addEventListener('click', unduhCSV);
document.getElementById('btnCetak').addEventListener('click', () => window.print());
 
muat();