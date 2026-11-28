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
      <td><a href="detail-barang.html?id=${b.id_barang}" class="nama-barang"><span class="ico${fotoBarang(b) ? ' ico-foto' : ''}">${fotoBarang(b)
            ? `<img ${atributFoto(b)} alt="" loading="lazy">`
            : ikonBarang(b)}</span>${esc(b.nama_barang)}</a></td>
      <td>${b.stok_tersedia} / ${b.stok_total}</td>
      <td>${badge(b.kondisi)}</td>
      <td>${badge(b.status, 'barang')}</td>
      <td><div class="actions-cell">
        <button class="btn btn-yellow btn-sm" data-aksi="edit" data-id="${b.id_barang}">Edit</button>
        <button class="btn btn-red btn-sm" data-aksi="hapus" data-id="${b.id_barang}">Hapus</button>
      </div></td>
    </tr>`).join('') : '<tr><td colspan="6" class="empty">Barang tidak ditemukan.</td></tr>';
}
 
// Foto kecil di tabel gagal dimuat (proxy dan file statis) -> ikon barang.
// Fase capture karena event error tidak naik (bubble) dari <img>.
tabel.addEventListener('error', e => {
    const kotak = e.target instanceof HTMLImageElement ? e.target.closest('.ico-foto') : null;
    if (!kotak) return;
    const id = Number(new URL(kotak.closest('a').href).searchParams.get('id'));
    kotak.classList.remove('ico-foto');
    kotak.innerHTML = ikonBarang(daftar.find(b => b.id_barang === id));
}, true);

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
 
// ---------- Foto barang (unggahan admin) ----------
const FOTO_MAKS = 300 * 1024;   // sama dengan batas di BarangController
const fotoFile = document.getElementById('fotoFile');
const fotoPratinjau = document.getElementById('fotoPratinjau');
const fotoInfo = document.getElementById('fotoInfo');
const btnHapusFoto = document.getElementById('btnHapusFoto');
const INFO_FOTO = fotoInfo.textContent;
let fotoBaru = null;   // Blob JPEG hasil pengecilan, menunggu diunggah saat Simpan

// Pratinjau: src foto (atau null -> ikon barang). Foto barang tersimpan memakai cadangan file statis.
function tampilPratinjau(src, barang) {
    const cadangan = barang && src === fotoBarang(barang) ? fotoCadangan(barang) : null;
    fotoPratinjau.innerHTML = src
        ? `<img src="${esc(src)}"${cadangan ? ` data-cadangan="${esc(cadangan)}"` : ''} alt="Pratinjau foto">`
        : ikonBarang(barang);
    const img = fotoPratinjau.querySelector('img');
    if (img) img.addEventListener('error', () => { fotoPratinjau.innerHTML = ikonBarang(barang); });
}

// Kecilkan foto di browser: sisi terpanjang maks. 800 px, JPEG kualitas 0.8
// (diturunkan bertahap sampai di bawah 300 KB). PNG transparan diberi latar putih.
async function kecilkanFoto(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
        throw new Error('File harus berupa gambar JPEG, PNG, atau WebP');
    }
    const url = URL.createObjectURL(file);
    try {
        const img = await new Promise((ok, gagal) => {
            const i = new Image();
            i.onload = () => ok(i);
            i.onerror = () => gagal(new Error('File gambar tidak bisa dibaca'));
            i.src = url;
        });
        const skala = Math.min(1, 800 / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.naturalWidth * skala);
        canvas.height = Math.round(img.naturalHeight * skala);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        for (const kualitas of [0.8, 0.7, 0.6, 0.5]) {
            const blob = await new Promise(ok => canvas.toBlob(ok, 'image/jpeg', kualitas));
            if (blob && blob.size <= FOTO_MAKS) return blob;
        }
        throw new Error('Foto masih lebih dari 300 KB setelah dikecilkan. Coba foto lain.');
    } finally {
        URL.revokeObjectURL(url);
    }
}

fotoFile.addEventListener('change', async () => {
    const file = fotoFile.files[0];
    fotoBaru = null;
    if (!file) return;
    fotoInfo.textContent = 'Mengecilkan foto...';
    try {
        fotoBaru = await kecilkanFoto(file);
        tampilPratinjau(URL.createObjectURL(fotoBaru));
        fotoInfo.textContent = `Siap diunggah (${Math.round(fotoBaru.size / 1024)} KB). Klik Simpan untuk mengunggah.`;
    } catch (err) {
        fotoFile.value = '';
        fotoInfo.textContent = INFO_FOTO;
        toast(err.message, 'error');
    }
});

// Unggah foto ke barang 'id', dengan progres di bawah input. true kalau berhasil.
async function unggahFoto(id) {
    try {
        const hasil = await apiUnggah(`/api/barang/${id}/foto`, fotoBaru, persen => {
            fotoInfo.textContent = `Mengunggah foto... ${persen}%`;
        });
        // Server jatuh ke penyimpanan database kalau R2 tidak aktif/gagal: foto tetap tersimpan
        if (hasil && hasil.penyimpanan === 'database') {
            toast('Foto tersimpan di database (penyimpanan R2 tidak aktif atau sedang gagal)', 'info');
        }
        return true;
    } catch (err) {
        toast(`Data barang tersimpan, tapi foto gagal diunggah: ${err.message}`, 'error');
        return false;
    }
}

btnHapusFoto.addEventListener('click', async () => {
    if (!editId) return;
    if (!await konfirmasi('Hapus foto unggahan? Barang akan kembali memakai foto bawaan.',
        { judul: 'Hapus Foto', ya: 'Hapus', bahaya: true })) return;
    btnHapusFoto.disabled = true;
    try {
        const b = await apiDelete(`/api/barang/${editId}/foto`);
        toast('Foto unggahan dihapus', 'success');
        btnHapusFoto.hidden = true;
        tampilPratinjau(fotoBarang(b), b);
        await muatBarang();
    } catch (err) {
        toast(err.message, 'error');
    } finally {
        btnHapusFoto.disabled = false;
    }
});

function bukaModal(barang) {
    editId = barang ? barang.id_barang : null;
    errorModal.style.display = 'none';
    fotoBaru = null;
    fotoFile.value = '';
    fotoInfo.textContent = INFO_FOTO;
    tampilPratinjau(barang ? fotoBarang(barang) : null, barang);
    // foto_unggahan dari server: true kalau ada unggahan admin (di R2 maupun database)
    btnHapusFoto.hidden = !(barang && barang.foto_unggahan === true);
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
        toast('Barang berhasil dihapus', 'success');
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
        const hasil = editId
            ? await apiPut(`/api/barang/${editId}`, body)
            : await apiPost('/api/barang', body);
        // Foto baru (kalau dipilih) diunggah setelah data barang tersimpan, karena butuh id_barang
        const fotoOk = fotoBaru ? await unggahFoto(hasil.id_barang) : true;
        if (fotoOk) {
            toast(editId ? 'Barang berhasil diperbarui' : 'Barang berhasil ditambahkan', 'success');
        }
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

// Kembali lewat tombol Back (halaman dipulihkan dari cache browser): ambil ulang supaya stok terbaru
window.addEventListener('pageshow', e => { if (e.persisted) muatBarang(); });