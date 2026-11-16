const user = requireLogin('peminjam');
renderSidebar('peminjam', 'Barang');
renderTopbar(user);

let semuaBarang = [];

function tampilkanStatistik() {
    const hitung = s => semuaBarang.filter(b => b.status === s).length;
    document.getElementById('statTotal').textContent = semuaBarang.length;
    document.getElementById('statTersedia').textContent = hitung('Tersedia');
    document.getElementById('statDipinjam').textContent = hitung('Dipinjam');
}

function tampilkan() {
    const q = document.getElementById('cari').value.toLowerCase();
    const status = document.getElementById('filter').value;

    const hasil = semuaBarang.filter(b =>
        b.nama_barang.toLowerCase().includes(q) && (!status || b.status === status)
    );

    // Kartu memakai ikon; foto baru tampil di modal lewat tombol "Lihat Barang" (sama seperti katalog guest)
    document.getElementById('daftar').innerHTML = hasil.length ? hasil.map((b, i) => `
    <div class="item" style="--i:${i}">
      <div class="img">${ikonBarang(b)}</div>
      <b>${esc(b.nama_barang)}</b><br>
      ${badge(b.status, 'barang')}
      <div class="item-aksi">
        ${fotoBarang(b)
            ? `<button type="button" class="btn btn-yellow" data-foto="${b.id_barang}"><i class="bi bi-image"></i> Lihat Barang</button>`
            : ''}
        ${b.status === 'Tersedia'
            ? `<a href="form-pengajuan.html?barang=${encodeURIComponent(b.nama_barang)}" class="btn btn-yellow">Ajukan</a>`
            : `<button class="btn btn-gray" disabled>Tidak tersedia</button>`}
        <a href="detail-barang.html?id=${b.id_barang}" class="btn btn-gray">Detail</a>
      </div>
    </div>`).join('') : '<p>Barang tidak ditemukan.</p>';
}

// Tombol "Lihat Barang" -> modal foto besar (sama seperti detail barang). Akar foto '../../'.
document.getElementById('daftar').addEventListener('click', e => {
    const btn = e.target.closest('button[data-foto]');
    if (!btn) return;
    const b = semuaBarang.find(x => String(x.id_barang) === btn.dataset.foto);
    if (b) bukaFoto(fotoBarang(b), b.nama_barang);
});

async function muat() {
    const daftar = document.getElementById('daftar');
    daftar.innerHTML = skeletonKartu();
    try {
        semuaBarang = await apiGet('/api/barang');
        tampilkanStatistik();
        tampilkan();
    } catch (e) {
        daftar.innerHTML = `<p>${esc(e.message || 'Gagal memuat barang.')}</p>`;
    }
}

document.getElementById('cari').addEventListener('input', tampilkan);
document.getElementById('filter').addEventListener('change', tampilkan);
muat();