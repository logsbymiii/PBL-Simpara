const user = requireLogin('peminjam');
renderSidebar('peminjam', 'Riwayat');
renderTopbar(user);

const id = Number(new URLSearchParams(location.search).get('id'));
const mine = getAllPengajuan().filter(p => p.peminjam === user.nama);
// Kalau tidak ada ?id= (misal dari dashboard), tampilkan pengajuan terbaru
const p = mine.find(x => x.id === id) || mine[0];
const box = document.getElementById('detail');

const info = (label, isi, penuh) => `
  <div class="info${penuh ? ' full' : ''}"><small class="info-label">${label}</small><b>${isi}</b></div>`;

if (!p) {
    box.innerHTML = '<p>Data tidak ditemukan.</p>';
} else {
    document.getElementById('statusBadge').innerHTML = badge(p.status);

    const pertama = (p.items[0] || {}).nama || '';
    const icon = (DUMMY_BARANG.find(b => pertama.includes(b.nama)) || {}).icon;

    // Kondisi & catatan per barang hanya ada setelah barang dikembalikan
    const daftarItem = p.items.map(it => `
      <li>
        <b>${it.nama} ×${it.jumlah}</b>
        ${it.kondisi ? `<span class="kondisi ${it.kondisi === 'Baik' ? 'baik' : 'rusak'}">${it.kondisi}</span>` : ''}
        ${it.catatan ? `<small>${it.catatan}</small>` : ''}
      </li>`).join('');

    box.innerHTML = `
    <div class="detail-card">
      <div class="img">${ikonBarang(icon)}</div>
      <div class="detail-info">
        <div class="info"><small class="info-label">Barang yang Dipinjam</small><ul class="item-list">${daftarItem}</ul></div>
        ${info('Peminjam', p.peminjam)}
        ${info('OKI', p.oki || '-')}
        ${info('Tanggal Pinjam', formatTanggalJam(p.tglPinjam))}
        ${info('Tanggal Kembali', formatTanggalJam(p.tglKembali))}
        ${p.dikembalikanPada ? info('Dikembalikan Pada', formatTanggalJam(p.dikembalikanPada)) : ''}
        ${info('Diajukan Pada', p.diajukanPada ? formatTanggal(p.diajukanPada) : '-')}
        ${info('Keperluan', p.keperluan || '-', true)}
        ${p.status === 'Ditolak' ? info('Alasan Penolakan', p.alasanTolak || '-', true) : ''}
      </div>
    </div>`;
}
