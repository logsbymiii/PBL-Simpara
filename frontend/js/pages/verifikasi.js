const user = requireLogin('admin');
renderSidebar('admin', 'Verifikasi');
renderTopbar(user);

function tampilkan() {
    const menunggu = getAllPengajuan().filter(p => p.status === 'Menunggu');
    document.getElementById('jumlah').textContent = menunggu.length;

    document.getElementById('tabel').innerHTML = menunggu.length ? menunggu.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${p.peminjam}</td>
      <td>${p.barang}</td>
      <td>${formatTanggal(p.tglPinjam)} – ${formatTanggal(p.tglKembali)}</td>
      <td>${p.keperluan || '-'}</td>
      <td><div class="actions-cell">
        <button class="btn btn-green btn-sm" data-aksi="setuju" data-id="${p.id}">Setujui</button>
        <button class="btn btn-red btn-sm" data-aksi="tolak" data-id="${p.id}">Tolak</button>
      </div></td>
    </tr>`).join('') : '<tr><td colspan="6" class="empty">Tidak ada pengajuan yang menunggu verifikasi.</td></tr>';
}

document.getElementById('tabel').addEventListener('click', e => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;
    const setuju = btn.dataset.aksi === 'setuju';
    if (!confirm(setuju ? 'Setujui pengajuan ini?' : 'Tolak pengajuan ini?')) return;

    setStatusPengajuan(Number(btn.dataset.id), setuju ? 'Dipinjam' : 'Ditolak');
    tampilkan();
});

tampilkan();