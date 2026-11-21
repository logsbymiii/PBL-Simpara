const user = requireLogin('peminjam');
renderSidebar('peminjam', 'Barang');
renderTopbar(user);

let semuaBarang = [];
let halaman = 1;   // halaman katalog yang sedang tampil (6 kartu per halaman)

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
    const hal = paginasi(hasil, halaman, document.getElementById('paginasi'), n => {
        halaman = n;
        tampilkan();
        daftar.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
    halaman = hal.halaman;

    // Foto tampil di atas kartu (klik = modal); tanpa foto -> ikon. Sama seperti katalog guest.
    daftar.innerHTML = hal.isi.length ? hal.isi.map((b, i) => `
    <div class="item" style="--i:${i}">
      ${gambarKartu(b)}
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
    pasangCadanganFoto(daftar, semuaBarang);
}

// Gambar kartu atau tombol "Lihat Barang" -> modal foto besar. Akar foto '../../'.
document.getElementById('daftar').addEventListener('click', e => {
    const btn = e.target.closest('button[data-foto]');
    if (!btn) return;
    const b = semuaBarang.find(x => String(x.id_barang) === btn.dataset.foto);
    if (b) bukaFoto(fotoBarang(b), b.nama_barang);
});

async function muat() {
    const daftar = document.getElementById('daftar');
    daftar.innerHTML = skeletonKartu(PER_HALAMAN);
    try {
        semuaBarang = await apiGet('/api/barang');
        tampilkanStatistik();
        tampilkan();
    } catch (e) {
        daftar.innerHTML = `<p>${esc(e.message || 'Gagal memuat barang.')}</p>`;
    }
}

// Cari/filter baru -> mulai lagi dari halaman 1
const ulangDariAwal = () => { halaman = 1; tampilkan(); };
document.getElementById('cari').addEventListener('input', ulangDariAwal);
document.getElementById('filter').addEventListener('change', ulangDariAwal);
muat();