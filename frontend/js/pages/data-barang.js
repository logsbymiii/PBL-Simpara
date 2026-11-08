const user = requireLogin('admin');
renderSidebar('admin', 'Barang');
renderTopbar(user);
 
let daftar = [];      // barang dari server
let kategori = [];    // kategori dari server
let editId = null;    // null = mode tambah, angka = id_barang yang sedang diedit
 
const tabel = document.getElementById('tabel');
const modal = document.getElementById('modal');
const form = document.getElementById('formBarang');
const errorModal = document.getElementById('errorModal');
 
function tampilkan() {
    const q = document.getElementById('cari').value.toLowerCase();
    const hasil = daftar.filter(b => b.nama_barang.toLowerCase().includes(q));
 
    document.getElementById('statTotal').textContent = daftar.length;
    document.getElementById('statTersedia').textContent = daftar.filter(b => b.status === 'Tersedia').length;
    document.getElementById('statHabis').textContent = daftar.filter(b => b.stok_tersedia === 0).length;
 
    tabel.innerHTML = hasil.length ? hasil.map((b, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><a href="detail-barang.html?id=${b.id_barang}" class="nama-barang"><span class="ico">${ikonBarang(b)}</span>${esc(b.nama_barang)}</a></td>
      <td>${b.stok_tersedia} / ${b.stok_total}</td>
      <td>${badge(b.kondisi)}</td>
      <td>${badge(b.status, 'barang')}</td>
      <td><div class="actions-cell">
        <button class="btn btn-yellow btn-sm" data-aksi="edit" data-id="${b.id_barang}">Edit</button>
        <button class="btn btn-red btn-sm" data-aksi="hapus" data-id="${b.id_barang}">Hapus</button>
      </div></td>
    </tr>`).join('') : '<tr><td colspan="6" class="empty">Barang tidak ditemukan.</td></tr>';
}
 
// Ambil ulang daftar barang dari server. Mengembalikan true kalau berhasil.
async function muatBarang() {
    try {
        daftar = await apiGet('/api/barang');
        tampilkan();
        return true;
    } catch (e) {
        tabel.innerHTML = `<tr><td colspan="6" class="empty">${esc(e.message)}</td></tr>`;
        return false;
    }
}
 
async function muatKategori() {
    try {
        kategori = await apiGet('/api/kategori');
        document.getElementById('kategori').innerHTML =
            '<option value="">Pilih kategori</option>' +
            kategori.map(k => `<option value="${k.id_kategori}">${esc(k.nama_kategori)}</option>`).join('');
    } catch (e) {
        document.getElementById('kategori').innerHTML = '<option value="">Gagal memuat kategori</option>';
    }
}
 
function tampilErrorModal(pesan, errors) {
    const detail = errors && typeof errors === 'object'
        ? Object.values(errors).filter(v => typeof v === 'string')
        : [];
    errorModal.innerHTML = [pesan, ...detail].map(esc).join('<br>');
    errorModal.style.display = 'block';
}
 
function bukaModal(barang) {
    editId = barang ? barang.id_barang : null;
    errorModal.style.display = 'none';
    document.getElementById('modalJudul').textContent = barang ? 'Edit Barang' : 'Tambah Barang';
    document.getElementById('kode').value = barang ? barang.kode_barang : '';
    document.getElementById('nama').value = barang ? barang.nama_barang : '';
    document.getElementById('kategori').value = barang ? barang.id_kategori : '';
    document.getElementById('stok').value = barang ? barang.stok_total : '';
    document.getElementById('kondisi').value = barang ? barang.kondisi : 'Baik';
    modal.classList.add('show');
}
 
document.getElementById('btnTambah').addEventListener('click', () => bukaModal(null));
document.getElementById('btnBatal').addEventListener('click', () => modal.classList.remove('show'));
document.getElementById('cari').addEventListener('input', tampilkan);
 
tabel.addEventListener('click', async e => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
 
    if (btn.dataset.aksi === 'edit') {
        bukaModal(daftar.find(b => b.id_barang === id));
        return;
    }
 
    if (!await konfirmasi('Yakin ingin menghapus barang ini?', { judul: 'Hapus Barang', ya: 'Hapus', bahaya: true })) return;
    try {
        await apiDelete(`/api/barang/${id}`);
        await muatBarang();
    } catch (err) {
        toast(err.message, 'error');   // mis. "Barang sudah pernah dipinjam, tidak dapat dihapus"
        btn.disabled = false;
    }
});
 
form.addEventListener('submit', async e => {
    e.preventDefault();
    errorModal.style.display = 'none';
 
    const body = {
        kode_barang: document.getElementById('kode').value.trim(),
        nama_barang: document.getElementById('nama').value.trim(),
        id_kategori: Number(document.getElementById('kategori').value),
        stok_total: Number(document.getElementById('stok').value),
        kondisi: document.getElementById('kondisi').value,
    };
 
    const tombol = form.querySelector('button[type="submit"]');
    tombol.disabled = true;
    try {
        if (editId) await apiPut(`/api/barang/${editId}`, body);
        else await apiPost('/api/barang', body);
        modal.classList.remove('show');
        await muatBarang();
    } catch (err) {
        // 422: errors per kolom, 409: kode barang sudah dipakai
        tampilErrorModal(err.message, err.errors);
    } finally {
        tombol.disabled = false;
    }
});
 
async function mulai() {
    tabel.innerHTML = '<tr><td colspan="6" class="empty">Memuat data...</td></tr>';
    await Promise.all([muatBarang(), muatKategori()]);
 
    // Dari Detail Barang: data-barang.html?edit=<id_barang> langsung membuka form edit
    const editParam = Number(new URLSearchParams(location.search).get('edit'));
    if (editParam) {
        const target = daftar.find(b => b.id_barang === editParam);
        if (target) bukaModal(target);
    }
}
 
mulai();