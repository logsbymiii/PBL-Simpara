const user = requireLogin('admin');
renderSidebar('admin', 'Pengembalian');
renderTopbar(user);

const id = Number(new URLSearchParams(location.search).get('id'));
const form = document.getElementById('formKondisi');
const KONDISI = ['Baik', 'Rusak', 'Hilang'];

const tgl = s => formatTanggal(String(s).replace(' ', 'T'));
const info = (label, isi) => `<div class="info"><small class="info-label">${label}</small><b>${isi}</b></div>`;

async function mulai() {
    form.innerHTML = '<p>Memuat...</p>';
    let p;
    try {
        if (!id) throw new Error('ID pengajuan tidak ada');
        p = await apiGet(`/api/pengajuan/${id}/pengembalian`);
    } catch (e) {
        form.innerHTML = `<p>${esc(e.status === 404 ? 'Data peminjaman tidak ditemukan.' : e.message)}</p>`;
        return;
    }

    // Hanya pengajuan yang masih dipinjam (termasuk yang terlambat) yang bisa diterima kembali
    if (p.status !== 'Dipinjam') {
        form.innerHTML = '<p>Barang ini sudah dikembalikan atau belum diserahkan.</p>';
        return;
    }

    document.getElementById('statusBadge').innerHTML = badge(p.status_tampil);
    document.getElementById('infoPinjam').innerHTML =
        info('Peminjam', esc(p.nama_peminjam)) +
        info('Dipinjam', tgl(p.tanggal_pinjam)) +
        info('Kembali (rencana)', tgl(p.tanggal_kembali));

    document.getElementById('tabel').innerHTML = p.barang.map((b, i) => `
    <tr>
      <td>${esc(b.nama_barang)}</td>
      <td>${b.jumlah}</td>
      <td><select data-i="${i}" class="kondisi-pilih">${KONDISI.map(k => `<option>${k}</option>`).join('')}</select></td>
      <td><input type="text" data-i="${i}" class="catatan-isi" maxlength="255" placeholder="Catatan (opsional)"></td>
    </tr>`).join('');

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const barang = p.barang.map((b, i) => ({
            id_barang: b.id_barang,
            kondisi: form.querySelector(`.kondisi-pilih[data-i="${i}"]`).value,
            catatan: form.querySelector(`.catatan-isi[data-i="${i}"]`).value.trim() || null,
        }));

        const tombol = form.querySelector('button[type="submit"]');
        tombol.disabled = true;
        try {
            await apiPost(`/api/pengajuan/${id}/pengembalian`, { barang });
            location.href = 'pengembalian.html';
        } catch (err) {
            alert(err.message);
            tombol.disabled = false;
        }
    });
}

mulai();