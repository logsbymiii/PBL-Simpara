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

    document.getElementById('daftar').innerHTML = hasil.length ? hasil.map(b => `
    <div class="item">
      <div class="img">${ikonBarang()}</div>
      <b>${esc(b.nama_barang)}</b><br>
      ${badge(b.status, 'barang')}<br>
      ${b.status === 'Tersedia'
            ? `<a href="form-pengajuan.html?barang=${encodeURIComponent(b.nama_barang)}" class="btn btn-yellow">Ajukan</a>`
            : `<button class="btn btn-gray" disabled>Tidak tersedia</button>`}
      <a href="detail-barang.html?id=${b.id_barang}" class="btn btn-gray">Detail</a>
    </div>`).join('') : '<p>Barang tidak ditemukan.</p>';
}

async function muat() {
    const daftar = document.getElementById('daftar');
    daftar.innerHTML = '<p>Memuat...</p>';
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