const user = requireLogin('peminjam');
renderSidebar('peminjam', 'Pengajuan');
renderTopbar(user);

document.getElementById('nama').value = user.nama;

// Hanya barang yang tersedia dan masih ada stok
const tersedia = getAllBarang().filter(b => b.status === 'Tersedia' && b.stok > 0);
const cariBarang = id => tersedia.find(b => String(b.id) === String(id));

const daftar = document.getElementById('daftarBarang');
const btnTambah = document.getElementById('tambahBarang');

// Barang yang sudah dipilih di satu baris tidak bisa dipilih lagi di baris lain
function sinkron() {
    const rows = [...daftar.querySelectorAll('.barang-row')];
    const dipilih = rows.map(r => r.querySelector('select').value).filter(Boolean);
    rows.forEach(r => {
        const select = r.querySelector('select');
        [...select.options].forEach(o => {
            o.disabled = o.value !== '' && o.value !== select.value && dipilih.includes(o.value);
        });
        r.querySelector('.btn-hapus').style.visibility = rows.length > 1 ? 'visible' : 'hidden';
    });
    btnTambah.style.display = rows.length < tersedia.length ? '' : 'none';
}

function tambahBaris(namaAwal = '') {
    const row = document.createElement('div');
    row.className = 'barang-row';
    row.innerHTML = `
    <select required>
      <option value="">Pilih barang</option>
      ${tersedia.map(b => `<option value="${b.id}">${b.nama} (stok ${b.stok})</option>`).join('')}
    </select>
    <input type="number" class="jumlah" min="1" value="1" required>
    <button type="button" class="btn-hapus" aria-label="Hapus barang">×</button>`;

    const select = row.querySelector('select');
    const jumlah = row.querySelector('.jumlah');
    const aturMaks = () => {
        const b = cariBarang(select.value);
        jumlah.max = b ? b.stok : '';
    };

    select.addEventListener('change', () => { aturMaks(); sinkron(); });
    row.querySelector('.btn-hapus').addEventListener('click', () => { row.remove(); sinkron(); });

    // Pilih otomatis kalau datang dari tombol "Ajukan" (?barang=Nama)
    const awal = tersedia.find(b => b.nama === namaAwal);
    if (awal) { select.value = awal.id; aturMaks(); }

    daftar.appendChild(row);
    sinkron();
}

btnTambah.addEventListener('click', () => tambahBaris());
tambahBaris(new URLSearchParams(location.search).get('barang') || '');

// Waktu pinjam tidak boleh sebelum sekarang, waktu kembali tidak boleh sebelum waktu pinjam
const inputPinjam = document.getElementById('tglPinjam');
const inputKembali = document.getElementById('tglKembali');
inputPinjam.min = inputKembali.min = waktuLokal();
inputPinjam.addEventListener('change', () => { inputKembali.min = inputPinjam.value || waktuLokal(); });

document.getElementById('formAjuan').addEventListener('submit', e => {
    e.preventDefault();
    const tglPinjam = inputPinjam.value;
    const tglKembali = inputKembali.value;

    if (tglKembali <= tglPinjam) {
        alert('Tanggal & jam kembali harus setelah tanggal & jam pinjam');
        return;
    }

    const items = [...daftar.querySelectorAll('.barang-row')].map(r => {
        const b = cariBarang(r.querySelector('select').value);
        return { barangId: b.id, nama: b.nama, jumlah: Number(r.querySelector('.jumlah').value) };
    });

    const lebihStok = items.find(it => it.jumlah < 1 || it.jumlah > cariBarang(it.barangId).stok);
    if (lebihStok) {
        alert(`Jumlah ${lebihStok.nama} harus antara 1 dan ${cariBarang(lebihStok.barangId).stok}`);
        return;
    }

    addPengajuan({
        peminjam: user.nama,
        oki: user.oki || '',
        items,
        tglPinjam,
        tglKembali,
        keperluan: document.getElementById('keperluan').value.trim(),
    });

    alert('Pengajuan berhasil dikirim!');
    location.href = 'riwayat.html';
});
