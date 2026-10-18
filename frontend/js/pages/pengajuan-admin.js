const user = requireLogin('admin');
renderSidebar('admin', 'Pengajuan');
renderTopbar(user);

// Setiap tahap diproses di halamannya: Verifikasi (setujui/tolak + alasan),
// Pengembalian (serahkan barang), Form Kondisi (terima kembali)
function tombolAksi(p) {
    if (p.status === 'Menunggu') return `<a href="verifikasi.html" class="btn btn-green btn-sm">Verifikasi</a>`;
    if (p.status === 'Disetujui') return `<a href="pengembalian.html" class="btn btn-yellow btn-sm">Serahkan</a>`;
    if (p.status === 'Dipinjam') return `<a href="form-kondisi.html?id=${p.id}" class="btn btn-yellow btn-sm">Terima Kembali</a>`;
    return '-';
}

function tampilkan() {
    const semua = getAllPengajuan();
    const hitung = s => semua.filter(p => p.status === s).length;
    document.getElementById('statTotal').textContent = semua.length;
    document.getElementById('statMenunggu').textContent = hitung('Menunggu');
    document.getElementById('statDipinjam').textContent = hitung('Dipinjam');
    document.getElementById('statDikembalikan').textContent = hitung('Dikembalikan');

    const q = document.getElementById('cari').value.toLowerCase();
    const status = document.getElementById('filter').value;
    const hasil = semua.filter(p =>
        (p.peminjam + ' ' + p.barang).toLowerCase().includes(q) && (!status || p.status === status)
    );

    document.getElementById('tabel').innerHTML = hasil.length ? hasil.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${p.peminjam}</td>
      <td>${p.barang}</td>
      <td>${formatTanggal(p.tglPinjam)} – ${formatTanggal(p.tglKembali)}</td>
      <td>${badge(p.status)}</td>
      <td><div class="actions-cell">${tombolAksi(p)}</div></td>
    </tr>`).join('') : '<tr><td colspan="6" class="empty">Tidak ada data.</td></tr>';
}

document.getElementById('cari').addEventListener('input', tampilkan);
document.getElementById('filter').addEventListener('change', tampilkan);
tampilkan();