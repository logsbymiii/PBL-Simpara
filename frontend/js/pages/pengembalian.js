const user = requireLogin('admin');
renderSidebar('admin', 'Pengembalian');
renderTopbar(user);

let tab = 'Disetujui';   // Siap Diambil = sudah disetujui, belum diserahkan
let pilihId = null;
const modal = document.getElementById('modal');

function tampilkan() {
    const semua = getAllPengajuan();
    const siap = semua.filter(p => p.status === 'Disetujui');
    const pinjam = semua.filter(p => p.status === 'Dipinjam');
    document.getElementById('jmlSiap').textContent = siap.length;
    document.getElementById('jmlPinjam').textContent = pinjam.length;
    document.getElementById('kolomTanggal').textContent = tab === 'Disetujui' ? 'Pinjam' : 'Kembali';

    const daftar = tab === 'Disetujui' ? siap : pinjam;
    document.getElementById('tabel').innerHTML = daftar.length ? daftar.map((p, i) => `
    <tr class="${terlambat(p) ? 'alert' : ''}">
      <td>${i + 1}.</td>
      <td>${p.peminjam}</td>
      <td>${p.barang}</td>
      <td>${formatTanggal(tab === 'Disetujui' ? p.tglPinjam : p.tglKembali)}</td>
      <td>${badge(p.status)}${terlambat(p) ? '<span class="telat">Terlambat</span>' : ''}</td>
      <td>${tab === 'Disetujui'
            ? `<button class="btn btn-yellow btn-sm" data-id="${p.id}">Serahkan</button>`
            : `<a href="form-kondisi.html?id=${p.id}" class="btn btn-yellow btn-sm">Terima Kembali</a>`}</td>
    </tr>`).join('') : `<tr><td colspan="6" class="empty">${tab === 'Disetujui'
        ? 'Tidak ada barang yang menunggu diambil.' : 'Tidak ada barang yang sedang dipinjam.'}</td></tr>`;
}

document.querySelectorAll('.seg-tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.seg-tabs button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tab = btn.dataset.tab;
        tampilkan();
    });
});

document.getElementById('tabel').addEventListener('click', e => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;
    pilihId = Number(btn.dataset.id);
    const p = getAllPengajuan().find(x => x.id === pilihId);
    document.getElementById('modalInfo').textContent = `${p.peminjam}: ${p.barang}`;
    modal.classList.add('show');
});

document.getElementById('btnBatal').addEventListener('click', () => modal.classList.remove('show'));
document.getElementById('btnSerahkan').addEventListener('click', () => {
    updatePengajuan(pilihId, { status: 'Dipinjam', diserahkanPada: waktuLokal() });
    modal.classList.remove('show');
    tampilkan();
});

tampilkan();
