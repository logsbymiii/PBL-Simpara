const user = requireLogin('admin');
renderSidebar('admin', 'Pengembalian');
renderTopbar(user);

const id = Number(new URLSearchParams(location.search).get('id'));
const p = getAllPengajuan().find(x => x.id === id && x.status === 'Dipinjam');
const form = document.getElementById('formKondisi');
const KONDISI = ['Baik', 'Rusak', 'Hilang'];

const info = (label, isi) => `<div class="info"><small class="info-label">${label}</small><b>${isi}</b></div>`;

if (!p) {
    form.innerHTML = '<p>Data peminjaman tidak ditemukan atau barang sudah dikembalikan.</p>';
} else {
    document.getElementById('statusBadge').innerHTML = badge(p.status);
    document.getElementById('infoPinjam').innerHTML =
        info('Peminjam', p.peminjam) + info('Dipinjam', formatTanggal(p.tglPinjam)) + info('Kembali (rencana)', formatTanggal(p.tglKembali));

    document.getElementById('tabel').innerHTML = p.items.map((it, i) => `
    <tr>
      <td>${it.nama}</td>
      <td>${it.jumlah}</td>
      <td><select data-i="${i}" class="kondisi-pilih">${KONDISI.map(k => `<option>${k}</option>`).join('')}</select></td>
      <td><input type="text" data-i="${i}" class="catatan-isi" placeholder="Catatan (opsional)"></td>
    </tr>`).join('');

    form.addEventListener('submit', e => {
        e.preventDefault();
        const items = p.items.map((it, i) => {
            const kondisi = form.querySelector(`.kondisi-pilih[data-i="${i}"]`).value;
            const catatan = form.querySelector(`.catatan-isi[data-i="${i}"]`).value.trim();
            return { ...it, kondisi, ...(catatan ? { catatan } : {}) };
        });

        // Barang rusak/hilang ikut diperbarui kondisinya di data barang
        const rusak = items.filter(it => it.barangId && it.kondisi !== 'Baik');
        if (rusak.length) {
            saveBarang(getAllBarang().map(b => {
                const r = rusak.find(it => it.barangId === b.id);
                return r ? { ...b, kondisi: r.kondisi } : b;
            }));
        }

        updatePengajuan(p.id, { status: 'Dikembalikan', items, dikembalikanPada: waktuLokal() });
        location.href = 'pengembalian.html';
    });
}
