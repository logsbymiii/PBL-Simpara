const user = requireLogin('peminjam');
renderSidebar('peminjam', 'Dashboard');
renderTopbar(user);

document.getElementById('welcome').textContent = `Selamat datang, ${user.nama}!`;

// Statistik
const mine = getAllPengajuan().filter(p => p.peminjam === user.nama);
const hitung = s => mine.filter(p => p.status === s).length;
document.getElementById('statDipinjam').textContent = hitung('Dipinjam');
document.getElementById('statMenunggu').textContent = hitung('Menunggu');
document.getElementById('statSelesai').textContent = hitung('Dikembalikan');
document.getElementById('statDitolak').textContent = hitung('Ditolak');

// Pengajuan terbaru
const terbaru = mine[0];
document.getElementById('pengajuanTerbaru').innerHTML = terbaru ? `
  <div><b>${terbaru.barang}</b><br>
    <small>${formatTanggal(terbaru.tglPinjam)} – ${formatTanggal(terbaru.tglKembali)}</small><br>
    ${badge(terbaru.status)}</div>
  <a href="detail-peminjaman.html" class="btn btn-yellow">Detail</a>`
  : '<p>Belum ada pengajuan.</p>';

// Barang terbaru
document.getElementById('barangTerbaru').innerHTML = DUMMY_BARANG.slice(0, 4).map(b => `
  <div class="item">
    <div class="img">${ikonBarang(b.icon)}</div>
    <b>${b.nama}</b><br>${badge(b.status)}<br><br>
    <a href="form-pengajuan.html?barang=${encodeURIComponent(b.nama)}" class="btn btn-yellow">Ajukan</a>
  </div>`).join('');