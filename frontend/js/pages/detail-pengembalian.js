const user = requireLogin('admin');
renderSidebar('admin', 'Pengembalian');
renderTopbar(user);

const id = Number(new URLSearchParams(location.search).get('id'));
const p = getAllPengajuan().find(x => x.id === id && x.status === 'Dikembalikan');
const box = document.getElementById('detailKembali');

const info = (label, isi) => `<div class="info"><small class="info-label">${label}</small><b>${isi}</b></div>`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

if (!p) {
    box.innerHTML = '<p>Data pengembalian tidak ditemukan.</p>';
} else {
    document.getElementById('statusBadge').innerHTML = badge(p.status);
    document.getElementById('infoPinjam').innerHTML =
        info('Peminjam', p.peminjam) + info('Dipinjam', formatTanggal(p.tglPinjam)) + info('Kembali (rencana)', formatTanggal(p.tglKembali));

    // Tampilan read-only: memakai gaya field yang sama dengan form, tapi disabled
    document.getElementById('tabel').innerHTML = p.items.map(it => `
    <tr>
      <td>${it.nama}</td>
      <td>${it.jumlah}</td>
      <td><select disabled><option>${it.kondisi || '-'}</option></select></td>
      <td><input type="text" value="${esc(it.catatan || '')}" placeholder="-" disabled></td>
    </tr>`).join('');

    const foto = p.fotoBukti || [];
    document.getElementById('fotoGrid').innerHTML = foto.length ? foto.map((f, i) => `
      <button type="button" class="foto-slot terisi foto-lihat" data-i="${i}">
        <img src="${f.data}" alt="${esc(f.nama)}">
        <span class="foto-nama">${esc(f.nama)}</span>
        <span class="foto-perbesar">Perbesar</span>
      </button>`).join('') : '<p class="empty">Tidak ada foto bukti untuk pengembalian ini.</p>';

    // Klik foto -> tampil besar di modal
    const modalFoto = document.getElementById('modalFoto');
    document.getElementById('fotoGrid').addEventListener('click', e => {
        const btn = e.target.closest('.foto-lihat');
        if (!btn) return;
        const f = foto[Number(btn.dataset.i)];
        document.getElementById('fotoBesar').src = f.data;
        document.getElementById('fotoBesar').alt = f.nama;
        modalFoto.classList.add('show');
    });
    document.getElementById('btnTutupFoto').addEventListener('click', () => modalFoto.classList.remove('show'));
    modalFoto.addEventListener('click', e => { if (e.target === modalFoto) modalFoto.classList.remove('show'); });
}