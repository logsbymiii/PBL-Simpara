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
    try {
        const semua = await apiGet('/api/barang');
        box.innerHTML = semua.slice(0, 4).map(b => `
  <div class="item">
    <div class="img">${ikonBarang()}</div>
    <b>${esc(b.nama_barang)}</b><br>${badge(b.status, 'barang')}<br><br>
    ${b.status === 'Tersedia'
            ? `<a href="form-pengajuan.html?barang=${encodeURIComponent(b.nama_barang)}" class="btn btn-yellow">Ajukan</a>`
            : `<button class="btn btn-gray" disabled>Tidak tersedia</button>`}
  </div>`).join('');
    } catch (e) {
        box.innerHTML = `<p>${esc(e.message || 'Gagal memuat barang.')}</p>`;
    }
}

muatPengajuan();
muatBarang();