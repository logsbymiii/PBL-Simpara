const user = requireLogin('admin');
renderSidebar('admin', 'Pengguna');
renderTopbar(user);

function tampilkan() {
    document.getElementById('tabel').innerHTML = getAllUsers().map((u, i) => {
        const aktif = akunAktif(u);
        const aksi = u.role === 'admin' ? '-' : aktif
            ? `<button class="btn btn-red btn-sm" data-email="${u.email}" data-aktif="0">Nonaktifkan</button>`
            : `<button class="btn btn-green btn-sm" data-email="${u.email}" data-aktif="1">Aktifkan</button>`;
        return `
    <tr>
      <td>${i + 1}.</td>
      <td>${u.nama}</td>
      <td>${u.nim || u.username || '-'}</td>
      <td>${u.oki || 'HMTI'}</td>
      <td>${u.role === 'admin' ? 'Admin' : 'Peminjam'}</td>
      <td>${badge(aktif ? 'Aktif' : 'Nonaktif')}</td>
      <td>${aksi}</td>
    </tr>`;
    }).join('');
}

document.getElementById('tabel').addEventListener('click', e => {
    const btn = e.target.closest('button[data-email]');
    if (!btn) return;
    setAkunAktif(btn.dataset.email, btn.dataset.aktif === '1');
    tampilkan();
});

tampilkan();
