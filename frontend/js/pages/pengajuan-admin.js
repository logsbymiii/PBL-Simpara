const user = requireLogin('admin');
renderSidebar('admin', 'Pengajuan');
renderTopbar(user);

// Semua pengajuan dari server; pencarian dan filter dilakukan di browser
let semua = [];

// Tanggal dari server berformat '2026-11-10 16:05:00'; ganti spasi jadi T supaya aman di semua browser
const tgl = s => formatTanggal(String(s).replace(' ', 'T'));

// Setiap tahap diproses di halamannya: Verifikasi (setujui/tolak + alasan),
// Pengembalian (serahkan barang), Form Kondisi (terima kembali)
function tombolAksi(p) {
    const s = p.status_tampil;
    if (s === 'Menunggu Verifikasi') return `<a href="verifikasi.html?id=${p.id_pengajuan}" class="btn btn-green btn-sm">Verifikasi</a>`;
    if (s === 'Disetujui') return `<a href="pengembalian.html" class="btn btn-yellow btn-sm">Serahkan</a>`;
    if (s === 'Dipinjam' || s === 'Terlambat') return `<a href="form-kondisi.html?id=${p.id_pengajuan}" class="btn btn-yellow btn-sm">Terima Kembali</a>`;
    return '-';
}

function tampilkan() {
    const hitung = s => semua.filter(p => p.status_tampil === s).length;
    document.getElementById('statTotal').textContent = semua.length;
    document.getElementById('statMenunggu').textContent = hitung('Menunggu Verifikasi');
    document.getElementById('statDipinjam').textContent = hitung('Dipinjam');
    document.getElementById('statDikembalikan').textContent = hitung('Dikembalikan');
    document.getElementById('statDipinjam').textContent = hitung('Dipinjam') + hitung('Terlambat');

    const q = document.getElementById('cari').value.toLowerCase();
    const status = document.getElementById('filter').value;
    const hasil = semua.filter(p =>
        (p.nama_peminjam + ' ' + p.barang).toLowerCase().includes(q) && (!status || p.status_tampil === status)
    );

    document.getElementById('tabel').innerHTML = hasil.length ? hasil.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(p.nama_peminjam)}</td>
      <td>${esc(p.barang)}</td>
      <td>${tgl(p.tanggal_pinjam)} – ${tgl(p.tanggal_kembali)}</td>
      <td>${badge(p.status_tampil)}</td>
      <td><div class="actions-cell">${tombolAksi(p)}</div></td>
    </tr>`).join('') : '<tr><td colspan="6" class="empty">Tidak ada data.</td></tr>';
}

async function muat() {
    document.getElementById('tabel').innerHTML = '<tr><td colspan="6" class="empty">Memuat...</td></tr>';
    try {
        semua = await apiGet('/api/pengajuan');
        tampilkan();
    } catch (e) {
        document.getElementById('tabel').innerHTML = `<tr><td colspan="6" class="empty">${esc(e.message)}</td></tr>`;
    }
}

document.getElementById('cari').addEventListener('input', tampilkan);
document.getElementById('filter').addEventListener('change', tampilkan);
muat();