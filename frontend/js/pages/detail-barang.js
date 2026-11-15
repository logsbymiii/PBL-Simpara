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
    const foto = fotoBarang(b);

    box.innerHTML = `
    <div class="detail-card">
      ${foto
        ? `<button type="button" class="img ada-foto" id="thumbFoto" aria-label="Lihat foto ${esc(b.nama_barang)}">
             <img src="${esc(foto)}" alt="${esc(b.nama_barang)}" loading="lazy">
           </button>`
        : `<div class="img">${ikonBarang(b)}</div>`}
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

    // Tombol "Lihat Barang" hanya kalau ada foto yang valid
    if (foto) {
        aksi.insertAdjacentHTML('afterbegin',
            '<button type="button" class="btn btn-gray btn-sm" id="btnLihatFoto"><i class="bi bi-image"></i> Lihat Barang</button>');
        const thumb = document.getElementById('thumbFoto');
        const tombolLihat = document.getElementById('btnLihatFoto');
        const buka = () => bukaFoto(foto, b.nama_barang);
        thumb.addEventListener('click', buka);
        tombolLihat.addEventListener('click', buka);

        // File foto tidak ada / gagal dimuat -> kembali ke ikon, tombol disembunyikan
        thumb.querySelector('img').addEventListener('error', () => {
            thumb.outerHTML = `<div class="img">${ikonBarang(b)}</div>`;
            tombolLihat.remove();
        });
    }

    if (admin && riwayatBox) muatRiwayat(b.id_barang);
}

// Modal foto ukuran besar. Memakai .modal / .modal-box yang sama dengan konfirmasi() di ui.js.
// Tutup lewat tombol Tutup, klik area gelap, atau Esc.
function bukaFoto(src, nama) {
    const m = document.createElement('div');
    m.className = 'modal show modal-foto';
    m.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true">
      <h3></h3>
      <div class="foto-besar"><img></div>
      <div class="actions"><button type="button" class="btn btn-gray">Tutup</button></div>
    </div>`;
    m.querySelector('h3').textContent = nama;
    const img = m.querySelector('img');
    img.src = src;
    img.alt = nama;

    const tombol = e => { if (e.key === 'Escape') tutup(); };
    const tutup = () => {
        document.removeEventListener('keydown', tombol);
        m.remove();
    };
    m.addEventListener('click', e => { if (e.target === m) tutup(); });
    m.querySelector('button').addEventListener('click', tutup);
    document.addEventListener('keydown', tombol);
    document.body.appendChild(m);
    m.querySelector('button').focus();
}

async function hapus(idBarang, tombol) {
    if (!await konfirmasi('Yakin ingin menghapus barang ini?', { judul: 'Hapus Barang', ya: 'Hapus', bahaya: true })) return;
    try {
        await apiDelete(`/api/barang/${idBarang}`);
        toastNanti('Barang berhasil dihapus');
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