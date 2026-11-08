const user = requireLogin('admin');
renderSidebar('admin', 'Pengembalian');
renderTopbar(user);

let tab = 'Disetujui';   // Siap Diambil = sudah disetujui, belum diserahkan
let siap = [];
let pinjam = [];
let pilihId = null;
const modal = document.getElementById('modal');
const tabel = document.getElementById('tabel');

const tgl = s => formatTanggal(String(s).replace(' ', 'T'));

function tampilkan() {
    document.getElementById('jmlSiap').textContent = siap.length;
    document.getElementById('jmlPinjam').textContent = pinjam.length;
    document.getElementById('kolomTanggal').textContent = tab === 'Disetujui' ? 'Pinjam' : 'Kembali';

    const daftar = tab === 'Disetujui' ? siap : pinjam;
    tabel.innerHTML = daftar.length ? daftar.map((p, i) => {
        const telat = p.status_tampil === 'Terlambat';
        return `
    <tr class="${telat ? 'alert' : ''}">
      <td>${i + 1}.</td>
      <td>${esc(p.nama_peminjam)}</td>
      <td>${esc(p.barang)}</td>
      <td>${tgl(tab === 'Disetujui' ? p.tanggal_pinjam : p.tanggal_kembali)}</td>
      <td>${badge(p.status_tampil)}${telat ? `<span class="telat">${Number(p.hari_terlambat) || 0} hari</span>` : ''}</td>
      <td>${tab === 'Disetujui'
            ? `<button class="btn btn-yellow btn-sm" data-id="${p.id_pengajuan}">Serahkan</button>`
            : `<a href="form-kondisi.html?id=${p.id_pengajuan}" class="btn btn-yellow btn-sm">Terima Kembali</a>`}</td>
    </tr>`;
    }).join('') : `<tr><td colspan="6" class="empty">${tab === 'Disetujui'
        ? 'Tidak ada barang yang menunggu diambil.' : 'Tidak ada barang yang sedang dipinjam.'}</td></tr>`;
}

async function muat() {
    tabel.innerHTML = '<tr><td colspan="6" class="empty">Memuat...</td></tr>';
    try {
        [siap, pinjam] = await Promise.all([
            apiGet('/api/pengajuan', { status: 'Disetujui' }),
            apiGet('/api/pengembalian/dipinjam'),
        ]);
        tampilkan();
    } catch (e) {
        tabel.innerHTML = `<tr><td colspan="6" class="empty">${esc(e.message)}</td></tr>`;
    }
}

document.querySelectorAll('.seg-tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.seg-tabs button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tab = btn.dataset.tab;
        tampilkan();
    });
});

tabel.addEventListener('click', e => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;
    pilihId = Number(btn.dataset.id);
    const p = siap.find(x => x.id_pengajuan === pilihId);
    document.getElementById('modalInfo').textContent = `${p.nama_peminjam}: ${p.barang}`;
    modal.classList.add('show');
});

document.getElementById('btnBatal').addEventListener('click', () => modal.classList.remove('show'));

document.getElementById('btnSerahkan').addEventListener('click', async () => {
    const tombol = document.getElementById('btnSerahkan');
    tombol.disabled = true;
    try {
        await apiPost(`/api/pengajuan/${pilihId}/serah-terima`);
        modal.classList.remove('show');
    } catch (err) {
        alert(err.message);
    }
    tombol.disabled = false;
    muat();
});

muat();