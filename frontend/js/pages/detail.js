const user = requireLogin('peminjam');
renderSidebar('peminjam', 'Riwayat');
renderTopbar(user);

const id = Number(new URLSearchParams(location.search).get('id'));
const mine = getAllPengajuan().filter(p => p.peminjam === user.nama);
// Kalau tidak ada ?id= (misal dari dashboard), tampilkan pengajuan terbaru
const p = mine.find(x => x.id === id) || mine[0];
const box = document.getElementById('detail');

if (!p) {
    box.innerHTML = '<p>Data tidak ditemukan.</p>';
} else {
    const icon = (DUMMY_BARANG.find(b => p.barang.includes(b.nama)) || {}).icon || '📦';
    box.innerHTML = `
    <div class="detail-top">
      <div class="img">${icon}</div>
      <div><h3>${p.barang}</h3>${badge(p.status)}</div>
    </div>
    <dl class="detail-grid">
      <dt>Peminjam</dt><dd>${p.peminjam}</dd>
      <dt>Tanggal Pinjam</dt><dd>${formatTanggal(p.tglPinjam)}</dd>
      <dt>Tanggal Kembali</dt><dd>${formatTanggal(p.tglKembali)}</dd>
      <dt>Keperluan</dt><dd>${p.keperluan || '-'}</dd>
    </dl>`;
}