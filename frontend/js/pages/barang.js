const user = requireLogin('peminjam');
renderSidebar('peminjam', 'Barang');
renderTopbar(user);

const hitung = s => DUMMY_BARANG.filter(b => b.status === s).length;
document.getElementById('statTotal').textContent = DUMMY_BARANG.length;
document.getElementById('statTersedia').textContent = hitung('Tersedia');
document.getElementById('statDipinjam').textContent = hitung('Dipinjam');

function tampilkan() {
    const q = document.getElementById('cari').value.toLowerCase();
    const status = document.getElementById('filter').value;

    const hasil = DUMMY_BARANG.filter(b =>
        b.nama.toLowerCase().includes(q) && (!status || b.status === status)
    );

    document.getElementById('daftar').innerHTML = hasil.length ? hasil.map(b => `
    <div class="item">
      <div class="img">${b.icon}</div>
      <b>${b.nama}</b><br>
      ${badge(b.status)}<br><br>
      ${b.status === 'Tersedia'
            ? `<a href="form-pengajuan.html?barang=${encodeURIComponent(b.nama)}" class="btn btn-yellow">Ajukan</a>`
            : `<button class="btn btn-gray" disabled>Tidak tersedia</button>`}
    </div>`).join('') : '<p>Barang tidak ditemukan.</p>';
}

document.getElementById('cari').addEventListener('input', tampilkan);
document.getElementById('filter').addEventListener('change', tampilkan);
tampilkan();