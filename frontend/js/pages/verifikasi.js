const user = requireLogin('admin');
renderSidebar('admin', 'Verifikasi');
renderTopbar(user);

const modal = document.getElementById('modal');
const formTolak = document.getElementById('formTolak');
const tabel = document.getElementById('tabel');
let menunggu = [];
let tolakId = null;

const tgl = s => formatTanggal(String(s).replace(' ', 'T'));

function tampilkan() {
    document.getElementById('jumlah').textContent = menunggu.length;

    tabel.innerHTML = menunggu.length ? menunggu.map((p, i) => {
        const telat = Number(p.peringatan_5_jam) > 0;
        return `
    <tr class="${telat ? 'alert' : ''}">
      <td>${i + 1}</td>
      <td>${esc(p.nama_peminjam)}</td>
      <td>${esc(p.barang)}</td>
      <td>${tgl(p.tanggal_pinjam)} – ${tgl(p.tanggal_kembali)}</td>
      <td>${esc(p.nama_kegiatan || '-')}</td>
      <td>${badge(p.status_tampil)}${telat ? '<span class="telat">&gt; 5 jam</span>' : ''}</td>
      <td><div class="actions-cell">
        <button class="btn btn-green btn-sm" data-aksi="setuju" data-id="${p.id_pengajuan}">Setujui</button>
        <button class="btn btn-red btn-sm" data-aksi="tolak" data-id="${p.id_pengajuan}">Tolak</button>
      </div></td>
    </tr>`;
    }).join('') : '<tr><td colspan="7" class="empty">Tidak ada pengajuan yang menunggu verifikasi.</td></tr>';
}

async function muat() {
    tabel.innerHTML = '<tr><td colspan="7" class="empty">Memuat...</td></tr>';
    try {
        menunggu = await apiGet('/api/pengajuan', { status: 'Menunggu Verifikasi' });
        tampilkan();
    } catch (e) {
        tabel.innerHTML = `<tr><td colspan="7" class="empty">${esc(e.message)}</td></tr>`;
    }
}

tabel.addEventListener('click', async e => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;
    const id = Number(btn.dataset.id);

    if (btn.dataset.aksi === 'setuju') {
        if (!confirm('Setujui pengajuan ini?')) return;
        btn.disabled = true;
        try {
            await apiPost(`/api/pengajuan/${id}/setujui`);
        } catch (err) {
            alert(err.message);          // mis. stok kurang / bentrok agenda HMTI / sudah diproses
        }
        muat();                          // barang lalu diserahkan di halaman Pengembalian
        return;
    }

    tolakId = id;
    const p = menunggu.find(x => x.id_pengajuan === id);
    document.getElementById('modalInfo').textContent = `${p.nama_peminjam}: ${p.barang}`;
    formTolak.reset();
    modal.classList.add('show');
});

document.getElementById('btnBatal').addEventListener('click', () => modal.classList.remove('show'));

formTolak.addEventListener('submit', async e => {
    e.preventDefault();
    const tombol = formTolak.querySelector('button[type="submit"]');
    tombol.disabled = true;
    try {
        await apiPost(`/api/pengajuan/${tolakId}/tolak`, {
            alasan: document.getElementById('alasan').value.trim(),
        });
        modal.classList.remove('show');
    } catch (err) {
        alert(err.message);
    }
    tombol.disabled = false;
    muat();
});

muat();