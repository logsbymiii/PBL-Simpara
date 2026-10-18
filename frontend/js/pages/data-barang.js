const user = requireLogin('admin');
renderSidebar('admin', 'Barang');
renderTopbar(user);

let daftar = getAllBarang();
let editId = null;

const modal = document.getElementById('modal');
const form = document.getElementById('formBarang');

function tampilkan() {
    const q = document.getElementById('cari').value.toLowerCase();
    const hasil = daftar.filter(b => b.nama.toLowerCase().includes(q));

    document.getElementById('statTotal').textContent = daftar.length;
    document.getElementById('statTersedia').textContent = daftar.filter(b => b.stok > 0).length;
    document.getElementById('statHabis').textContent = daftar.filter(b => b.stok === 0).length;

    document.getElementById('tabel').innerHTML = hasil.length ? hasil.map((b, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><a href="detail-barang.html?id=${b.id}" class="nama-barang"><span class="ico">${ikonBarang(b.icon)}</span>${b.nama}</a></td>
      <td>${b.stok}</td>
      <td>${badge(b.kondisi || 'Baik')}</td>
      <td>${badge(b.status)}</td>
      <td><div class="actions-cell">
        <button class="btn btn-yellow btn-sm" data-aksi="edit" data-id="${b.id}">Edit</button>
        <button class="btn btn-red btn-sm" data-aksi="hapus" data-id="${b.id}">Hapus</button>
      </div></td>
    </tr>`).join('') : '<tr><td colspan="6" class="empty">Barang tidak ditemukan.</td></tr>';
}

function bukaModal(barang) {
    editId = barang ? barang.id : null;
    document.getElementById('modalJudul').textContent = barang ? 'Edit Barang' : 'Tambah Barang';
    document.getElementById('nama').value = barang ? barang.nama : '';
    document.getElementById('icon').value = barang ? barang.icon : '';
    document.getElementById('stok').value = barang ? barang.stok : '';
    document.getElementById('kondisi').value = barang ? (barang.kondisi || 'Baik') : 'Baik';
    modal.classList.add('show');
}

document.getElementById('btnTambah').addEventListener('click', () => bukaModal(null));
document.getElementById('btnBatal').addEventListener('click', () => modal.classList.remove('show'));
document.getElementById('cari').addEventListener('input', tampilkan);

document.getElementById('tabel').addEventListener('click', e => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;
    const id = Number(btn.dataset.id);

    if (btn.dataset.aksi === 'edit') {
        bukaModal(daftar.find(b => b.id === id));
    } else if (confirm('Yakin ingin menghapus barang ini?')) {
        daftar = daftar.filter(b => b.id !== id);
        saveBarang(daftar);
        tampilkan();
    }
});

form.addEventListener('submit', e => {
    e.preventDefault();
    const stok = Number(document.getElementById('stok').value);
    const data = {
        nama: document.getElementById('nama').value.trim(),
        icon: document.getElementById('icon').value.trim() || 'bi-box-seam-fill',
        stok,
        kondisi: document.getElementById('kondisi').value,
        status: stok > 0 ? 'Tersedia' : 'Dipinjam',  // stok 0 = tidak bisa diajukan
    };

    if (editId) daftar = daftar.map(b => (b.id === editId ? { ...b, ...data } : b));
    else daftar.push({ id: Date.now(), ...data });

    saveBarang(daftar);
    modal.classList.remove('show');
    tampilkan();
});

tampilkan();

// Dari Detail Barang: data-barang.html?edit=<id> langsung membuka form edit
const editParam = Number(new URLSearchParams(location.search).get('edit'));
if (editParam) {
    const target = daftar.find(b => b.id === editParam);
    if (target) bukaModal(target);
}