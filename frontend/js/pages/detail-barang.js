// Dipakai halaman Detail Barang admin dan peminjam
const user = requireLogin();
const admin = user.role === 'admin';
renderSidebar(user.role, 'Barang');
renderTopbar(user);

const id = Number(new URLSearchParams(location.search).get('id'));
const b = getAllBarang().find(x => x.id === id);
const box = document.getElementById('detail');

const info = (label, isi, penuh) => `
  <div class="info${penuh ? ' full' : ''}"><small class="info-label">${label}</small><b>${isi}</b></div>`;

if (!b) {
    box.innerHTML = '<p>Barang tidak ditemukan.</p>';
} else {
    const kondisi = b.kondisi || 'Baik';
    const dipinjam = jumlahDipinjam(b.id);
    // Barang rusak/hilang tidak bisa diajukan, jadi tersedia = 0
    const tersedia = kondisi === 'Baik' ? b.stok : 0;
    const status = kondisi !== 'Baik' ? kondisi : tersedia > 0 ? 'Tersedia' : 'Dipinjam';
    document.getElementById('statusBadge').innerHTML = badge(status, 'barang');

    box.innerHTML = `
    <div class="detail-card">
      <div class="img">${ikonBarang(b.icon)}</div>
      <div class="detail-info">
        ${info('Nama Barang', b.nama)}
        ${info('Kategori', b.kategori || '-')}
        ${info('Jumlah Total', `${b.stok + dipinjam} unit`)}
        ${info(admin ? 'Stok Tersedia Hari Ini' : 'Tersedia Saat Ini', `${tersedia} unit`)}
        ${info('Kondisi', kondisi)}
        ${info('Dipinjam Saat Ini', `${dipinjam} unit`)}
        ${info('Catatan', b.catatan || (admin
            ? 'Kondisi Rusak → barang dihitung 0 saat pengajuan'
            : 'Bawa surat peminjaman + KTM saat serah terima'), true)}
      </div>
    </div>`;

    const aksi = document.getElementById('aksi');
    if (admin) {
        aksi.innerHTML = `
        <a href="data-barang.html?edit=${b.id}" class="btn btn-yellow btn-sm">Edit</a>
        <button class="btn btn-red btn-sm" id="btnHapus">Hapus</button>`;
        document.getElementById('btnHapus').addEventListener('click', () => {
            if (!confirm('Yakin ingin menghapus barang ini?')) return;
            saveBarang(getAllBarang().filter(x => x.id !== b.id));
            location.href = 'data-barang.html';
        });
    } else if (tersedia > 0) {
        aksi.innerHTML = `<a href="form-pengajuan.html?barang=${encodeURIComponent(b.nama)}" class="btn btn-yellow btn-sm">Ajukan Pinjam</a>`;
    }
}
