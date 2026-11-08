const user = requireLogin('admin');
renderSidebar('admin', 'Dashboard');
renderTopbar(user);

document.getElementById('welcome').textContent = `Selamat datang, ${user.nama}!`;

const tgl = s => formatTanggal(String(s).replace(' ', 'T'));

async function muat() {
    const tabel = document.getElementById('tabel');
    tabel.innerHTML = '<tr><td colspan="5" class="empty">Memuat...</td></tr>';
    try {
        const semua = await apiGet('/api/pengajuan');
        const hitung = (...status) => semua.filter(p => status.includes(p.status_tampil)).length;

        document.getElementById('statMenunggu').textContent = hitung('Menunggu Verifikasi');
        document.getElementById('statDipinjam').textContent = hitung('Dipinjam', 'Terlambat');
        document.getElementById('statDikembalikan').textContent = hitung('Dikembalikan');
        document.getElementById('statDitolak').textContent = hitung('Ditolak');

        // 5 pengajuan terbaru berdasarkan waktu diajukan
        const terbaru = [...semua]
            .sort((a, b) => String(b.tanggal_diajukan).localeCompare(String(a.tanggal_diajukan)))
            .slice(0, 5);

        tabel.innerHTML = terbaru.length ? terbaru.map((p, i) => `
  <tr>
    <td>${i + 1}</td>
    <td>${esc(p.nama_peminjam)}</td>
    <td>${esc(p.barang)}</td>
    <td>${tgl(p.tanggal_pinjam)}</td>
    <td>${badge(p.status_tampil)}</td>
  </tr>`).join('') : '<tr><td colspan="5" class="empty">Belum ada pengajuan.</td></tr>';
    } catch (e) {
        tabel.innerHTML = `<tr><td colspan="5" class="empty">${esc(e.message)}</td></tr>`;
    }
}

muat();