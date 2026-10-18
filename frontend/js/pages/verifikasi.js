const user = requireLogin('admin');
renderSidebar('admin', 'Verifikasi');
renderTopbar(user);

const modal = document.getElementById('modal');
const formTolak = document.getElementById('formTolak');
let tolakId = null;

// Pengajuan yang menunggu lebih dari 5 jam ditandai supaya segera diproses
function lamaMenunggu(p) {
    if (!p.diajukanPada) return false;
    return Date.now() - new Date(p.diajukanPada).getTime() > 5 * 60 * 60 * 1000;
}

function tampilkan() {
    const menunggu = getAllPengajuan().filter(p => p.status === 'Menunggu');
    document.getElementById('jumlah').textContent = menunggu.length;

    document.getElementById('tabel').innerHTML = menunggu.length ? menunggu.map((p, i) => `
    <tr class="${lamaMenunggu(p) ? 'alert' : ''}">
      <td>${i + 1}</td>
      <td>${p.peminjam}</td>
      <td>${p.barang}</td>
      <td>${formatTanggal(p.tglPinjam)} – ${formatTanggal(p.tglKembali)}</td>
      <td>${p.keperluan || '-'}</td>
      <td>${badge(p.status)}${lamaMenunggu(p) ? '<span class="telat">&gt; 5 jam</span>' : ''}</td>
      <td><div class="actions-cell">
        <button class="btn btn-green btn-sm" data-aksi="setuju" data-id="${p.id}">Setujui</button>
        <button class="btn btn-red btn-sm" data-aksi="tolak" data-id="${p.id}">Tolak</button>
      </div></td>
    </tr>`).join('') : '<tr><td colspan="7" class="empty">Tidak ada pengajuan yang menunggu verifikasi.</td></tr>';
}

document.getElementById('tabel').addEventListener('click', e => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;
    const id = Number(btn.dataset.id);

    if (btn.dataset.aksi === 'setuju') {
        if (!confirm('Setujui pengajuan ini?')) return;
        setStatusPengajuan(id, 'Disetujui');   // barang lalu diserahkan di halaman Pengembalian
        tampilkan();
        return;
    }

    tolakId = id;
    const p = getAllPengajuan().find(x => x.id === id);
    document.getElementById('modalInfo').textContent = `${p.peminjam}: ${p.barang}`;
    formTolak.reset();
    modal.classList.add('show');
});

document.getElementById('btnBatal').addEventListener('click', () => modal.classList.remove('show'));
formTolak.addEventListener('submit', e => {
    e.preventDefault();
    updatePengajuan(tolakId, { status: 'Ditolak', alasanTolak: document.getElementById('alasan').value.trim() });
    modal.classList.remove('show');
    tampilkan();
});

tampilkan();
