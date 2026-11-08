const user = requireLogin('admin');
renderSidebar('admin', 'Pengguna');
renderTopbar(user);

const tabel = document.getElementById('tabel');

async function muat() {
    tabel.innerHTML = '<tr><td colspan="5">Memuat data...</td></tr>';
    try {
        const daftar = await apiGet('/api/pengguna');
        tampilkan(daftar);
    } catch (e) {
        tabel.innerHTML = `<tr><td colspan="5">${esc(e.message)}</td></tr>`;
    }
}

function tampilkan(daftar) {
    if (!daftar.length) {
        tabel.innerHTML = '<tr><td colspan="5">Belum ada akun peminjam.</td></tr>';
        return;
    }

    tabel.innerHTML = daftar.map((u, i) => {
        const aktif = u.status_akun === 'Aktif';
        const aksi = aktif
            ? `<button class="btn btn-red btn-sm" data-id="${u.id_oki}" data-aksi="nonaktifkan">Nonaktifkan</button>`
            : `<button class="btn btn-green btn-sm" data-id="${u.id_oki}" data-aksi="aktifkan">Aktifkan</button>`;
        return `
    <tr>
      <td>${i + 1}.</td>
      <td>${esc(u.nama_oki)}</td>
      <td>${u.jumlah_pengajuan}</td>
      <td>${badge(u.status_akun)}</td>
      <td>${aksi}</td>
    </tr>`;
    }).join('');
}

muat();

tabel.addEventListener('click', async e => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;

    if (btn.dataset.aksi === 'nonaktifkan' &&
    !(await konfirmasi('Nonaktifkan akun ini? Akun tidak bisa masuk sampai diaktifkan lagi.', { judul: 'Nonaktifkan Akun', ya: 'Nonaktifkan', bahaya: true }))) return;

    btn.disabled = true;
    try {
        await apiPost(`/api/pengguna/${btn.dataset.id}/${btn.dataset.aksi}`);
        await muat();
    } catch (err) {
        toast(err.message, 'error');
        btn.disabled = false;
    }
});