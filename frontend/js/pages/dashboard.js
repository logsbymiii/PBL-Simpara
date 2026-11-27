const user = requireLogin('peminjam');
renderSidebar('peminjam', 'Dashboard');
renderTopbar(user);

document.getElementById('welcome').textContent = `Selamat datang, ${user.nama}!`;

const tgl = s => formatTanggal(String(s).replace(' ', 'T'));

async function muatPengajuan() {
    const box = document.getElementById('pengajuanTerbaru');
    try {
        const semua = await apiGet('/api/pengajuan');
        const hitung = (...status) => semua.filter(p => status.includes(p.status_tampil)).length;

        document.getElementById('statDipinjam').textContent = hitung('Dipinjam', 'Terlambat');
        document.getElementById('statMenunggu').textContent = hitung('Menunggu Verifikasi');
        document.getElementById('statDikembalikan').textContent = hitung('Dikembalikan');
        document.getElementById('statDitolak').textContent = hitung('Ditolak');

        const terbaru = [...semua]
            .sort((a, b) => String(b.tanggal_diajukan).localeCompare(String(a.tanggal_diajukan)))[0];

        box.innerHTML = terbaru ? `
  <div><b>${esc(terbaru.barang)}</b><br>
    <small>${tgl(terbaru.tanggal_pinjam)} – ${tgl(terbaru.tanggal_kembali)}</small><br>
    ${badge(terbaru.status_tampil)}</div>
  <a href="detail-peminjaman.html?id=${terbaru.id_pengajuan}" class="btn btn-yellow">Detail</a>`
            : '<p>Belum ada pengajuan.</p>';
    } catch (e) {
        box.innerHTML = `<p>${esc(e.message || 'Gagal memuat pengajuan.')}</p>`;
    }
}

async function muatBarang() {
    const box = document.getElementById('barangTerbaru');
    box.innerHTML = skeletonKartu(4);
    try {
        const semua = await apiGet('/api/barang');
        const terbaru = semua.slice(0, 4);
        box.innerHTML = terbaru.map((b, i) => `
  <div class="item" style="--i:${i}">
    ${gambarKartu(b)}
    <b>${esc(b.nama_barang)}</b><br>${badge(b.status, 'barang')}<br><br>
    ${b.status === 'Tersedia'
            ? `<a href="form-pengajuan.html?barang=${encodeURIComponent(b.nama_barang)}" class="btn btn-yellow">Ajukan</a>`
            : `<button class="btn btn-gray" disabled>Tidak tersedia</button>`}
  </div>`).join('');
        pasangCadanganFoto(box, terbaru);
        // Klik foto -> modal foto penuh (sama seperti Daftar Barang)
        box.onclick = e => {
            const btn = e.target.closest('button[data-foto]');
            const b = btn && terbaru.find(x => String(x.id_barang) === btn.dataset.foto);
            if (b) bukaFoto(b);
        };
    } catch (e) {
        box.innerHTML = `<p>${esc(e.message || 'Gagal memuat barang.')}</p>`;
    }
}

muatPengajuan();
muatBarang();