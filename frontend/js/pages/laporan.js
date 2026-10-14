const user = requireLogin('admin');
renderSidebar('admin', 'Laporan');
renderTopbar(user);

let hasil = [];

function tampilkan() {
    const bulan = document.getElementById('bulan').value;   // format "2026-10"
    const status = document.getElementById('filter').value;

    hasil = getAllPengajuan().filter(p =>
        (!bulan || p.tglPinjam.startsWith(bulan)) && (!status || p.status === status)
    );

    document.getElementById('tabel').innerHTML = hasil.length ? hasil.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${p.peminjam}</td>
      <td>${p.barang}</td>
      <td>${formatTanggal(p.tglPinjam)}</td>
      <td>${formatTanggal(p.tglKembali)}</td>
      <td>${badge(p.status)}</td>
    </tr>`).join('') : '<tr><td colspan="6" class="empty">Tidak ada data untuk filter ini.</td></tr>';
}

function unduhCSV() {
    const baris = [['No', 'Peminjam', 'Barang', 'Tanggal Pinjam', 'Tanggal Kembali', 'Status']];
    hasil.forEach((p, i) => baris.push([i + 1, p.peminjam, p.barang, p.tglPinjam, p.tglKembali, p.status]));

    const csv = baris.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'laporan-peminjaman.csv';
    a.click();
}

document.getElementById('bulan').addEventListener('change', tampilkan);
document.getElementById('filter').addEventListener('change', tampilkan);
document.getElementById('btnReset').addEventListener('click', () => {
    document.getElementById('bulan').value = '';
    document.getElementById('filter').value = '';
    tampilkan();
});
document.getElementById('btnCsv').addEventListener('click', unduhCSV);
document.getElementById('btnCetak').addEventListener('click', () => window.print());

tampilkan();