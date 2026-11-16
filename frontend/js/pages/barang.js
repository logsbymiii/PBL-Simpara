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

    const daftar = document.getElementById('daftar');
    daftar.innerHTML = hasil.length ? hasil.map((b, i) => {
        const foto = fotoBarang(b);   // pages/peminjam -> akar '../../'
        return `
    <div class="item" style="--i:${i}">
      ${foto
        ? `<div class="img ada-foto"><img src="${esc(foto)}" alt="${esc(b.nama_barang)}" loading="lazy" data-id="${b.id_barang}"></div>`
        : `<div class="img">${ikonBarang(b)}</div>`}
      <b>${esc(b.nama_barang)}</b><br>
      ${badge(b.status, 'barang')}<br>
      ${foto
        ? `<button type="button" class="btn btn-yellow btn-sm" data-foto="${b.id_barang}"><i class="bi bi-image"></i> Lihat Barang</button><br>`
        : ''}
      ${b.status === 'Tersedia'
            ? `<a href="form-pengajuan.html?barang=${encodeURIComponent(b.nama_barang)}" class="btn btn-yellow">Ajukan</a>`
            : `<button class="btn btn-gray" disabled>Tidak tersedia</button>`}
      <a href="detail-barang.html?id=${b.id_barang}" class="btn btn-gray">Detail</a>
    </div>`;
    }).join('') : '<p>Barang tidak ditemukan.</p>';

    // Foto gagal dimuat -> kembali ke ikon, tombol Lihat Barang disembunyikan
    daftar.querySelectorAll('.img.ada-foto img').forEach(img => {
        img.addEventListener('error', () => {
            const b = semuaBarang.find(x => String(x.id_barang) === img.dataset.id);
            const tombol = daftar.querySelector(`button[data-foto="${img.dataset.id}"]`);
            if (tombol) {
                tombol.nextElementSibling?.remove();   // <br> setelah tombol
                tombol.remove();
            }
            img.parentElement.outerHTML = `<div class="img">${ikonBarang(b)}</div>`;
        });
    });
}

// Tombol "Lihat Barang" -> modal foto besar (sama seperti detail barang)
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