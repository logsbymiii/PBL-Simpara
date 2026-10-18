const user = requireLogin('admin');
renderSidebar('admin', 'Pengajuan');
renderTopbar(user);

const AKSI = { setuju: 'Dipinjam', tolak: 'Ditolak', kembali: 'Dikembalikan' };

function tombolAksi(p) {
    if (p.status === 'Menunggu') return `
    <button class="btn btn-green btn-sm" data-aksi="setuju" data-id="${p.id}">Setujui</button>
    <button class="btn btn-red btn-sm" data-aksi="tolak" data-id="${p.id}">Tolak</button>`;
    if (p.status === 'Dipinjam') return `
    <button class="btn btn-yellow btn-sm" data-aksi="kembali" data-id="${p.id}">Tandai Kembali</button>`;
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

document.getElementById('tabel').addEventListener('click', e => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;
    setStatusPengajuan(Number(btn.dataset.id), AKSI[btn.dataset.aksi]);
    tampilkan();
});
document.getElementById('cari').addEventListener('input', tampilkan);
document.getElementById('filter').addEventListener('change', tampilkan);
tampilkan();