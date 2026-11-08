const user = requireLogin();
const admin = user.role === 'admin';
renderSidebar(user.role, 'Barang');
renderTopbar(user);

const id = Number(new URLSearchParams(location.search).get('id'));
const box = document.getElementById('detail');
const aksi = document.getElementById('aksi');
const riwayatBox = document.getElementById('riwayat');   // hanya ada di halaman admin

const info = (label, isi, penuh) => `
  <div class="info${penuh ? ' full' : ''}"><small class="info-label">${label}</small><b>${isi}</b></div>`;

function tampilkan(b) {
    // Barang rusak dihitung 0 tersedia oleh server, jadi selisih total - tersedia hanya berarti
    // "terpakai" kalau kondisinya Baik. Terpakai = Disetujui atau Dipinjam pada hari ini.
    const terpakai = b.kondisi === 'Baik' ? b.stok_total - b.stok_tersedia : 0;

    document.getElementById('statusBadge').innerHTML = badge(b.status, 'barang');

    box.innerHTML = `
    <div class="detail-card">
      <div class="img">${ikonBarang(b)}</div>
      <div class="detail-info">
        ${info('Nama Barang', esc(b.nama_barang))}
        ${info('Kode Barang', esc(b.kode_barang))}
        ${info('Kategori', esc(b.nama_kategori || '-'))}
        ${info('Jumlah Total', `${b.stok_total} unit`)}
        ${info(admin ? 'Stok Tersedia Hari Ini' : 'Tersedia Saat Ini', `${b.stok_tersedia} unit`)}
        ${info('Kondisi', esc(b.kondisi))}
        ${info('Terpakai Hari Ini', `${terpakai} unit`)}
        ${info('Catatan', admin
        ? 'Kondisi Rusak → barang dihitung 0 saat pengajuan'
        : 'Bawa surat peminjaman + KTM saat serah terima', true)}
      </div>
    </div>`;

    if (admin) {
        aksi.innerHTML = `
        <a href="data-barang.html?edit=${b.id_barang}" class="btn btn-yellow btn-sm">Edit</a>
        <button class="btn btn-red btn-sm" id="btnHapus">Hapus</button>`;
        document.getElementById('btnHapus').addEventListener('click', e => hapus(b.id_barang, e.target));
    } else if (b.stok_tersedia > 0) {
        aksi.innerHTML = `<a href="form-pengajuan.html?barang=${encodeURIComponent(b.nama_barang)}" class="btn btn-yellow btn-sm">Ajukan Pinjam</a>`;
    }

    if (admin && riwayatBox) muatRiwayat(b.id_barang);
}

async function hapus(idBarang, tombol) {
    if (!await konfirmasi('Yakin ingin menghapus barang ini?', { judul: 'Hapus Barang', ya: 'Hapus', bahaya: true })) return;
    try {
        await apiDelete(`/api/barang/${idBarang}`);
        location.href = 'data-barang.html';
    } catch (e) {
        toast(e.message, 'error');   // mis. "Barang sudah pernah dipinjam, tidak dapat dihapus"
        tombol.disabled = false;
    }
}
async function muatRiwayat(idBarang) {
    riwayatBox.innerHTML = '<h3>Riwayat Peminjam</h3><p class="empty">Memuat riwayat...</p>';
    try {
        const data = await apiGet(`/api/barang/${idBarang}/riwayat`);
        if (!data.length) {
            riwayatBox.innerHTML = '<h3>Riwayat Peminjam</h3><p class="empty">Barang ini belum pernah dipinjam.</p>';
            return;
        }
        const baris = data.map(r => `
            <tr>
              <td>${esc(r.nama_peminjam)}</td>
              <td>${esc(r.nama_kegiatan)}</td>
              <td>${formatTanggalJam(r.tgl_pinjam)}</td>
              <td>${formatTanggalJam(r.tgl_kembali)}</td>
              <td>${r.jumlah} unit</td>
              <td>${badge(r.status_tampil)}</td>
            </tr>`).join('');
        riwayatBox.innerHTML = `
            <h3>Riwayat Peminjam</h3>
            <table>
              <thead><tr><th>Peminjam</th><th>Kegiatan</th><th>Pinjam</th><th>Kembali</th><th>Jumlah</th><th>Status</th></tr></thead>
              <tbody>${baris}</tbody>
            </table>`;
    } catch (e) {
        riwayatBox.innerHTML = `<h3>Riwayat Peminjam</h3><p class="empty">${esc(e.message)}</p>`;
    }
}
async function muat() {
    if (!id) {
        box.innerHTML = '<p>Barang tidak ditemukan.</p>';
        return;
    }
    box.innerHTML = '<p>Memuat detail barang...</p>';
    try {
        tampilkan(await apiGet(`/api/barang/${id}`));
    } catch (e) {
        box.innerHTML = `<p>${esc(e.status === 404 ? 'Barang tidak ditemukan.' : e.message)}</p>`;
    }
}

muat();