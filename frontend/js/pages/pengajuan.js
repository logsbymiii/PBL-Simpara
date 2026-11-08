const user = requireLogin('peminjam');
renderSidebar('peminjam', 'Pengajuan');
renderTopbar(user);

const daftar = document.getElementById('daftarBarang');
const btnTambah = document.getElementById('tambahBarang');
const info = document.getElementById('infoBarang');
const errorBox = document.getElementById('errorForm');
const form = document.getElementById('formAjuan');
const inputPinjam = document.getElementById('tglPinjam');
const inputKembali = document.getElementById('tglKembali');

// Barang yang tersedia pada rentang waktu yang dipilih (diisi dari server)
let tersedia = [];
// Kalau datang dari tombol "Ajukan" di katalog (?barang=Nama), pilih barang itu otomatis
let barangAwal = new URLSearchParams(location.search).get('barang') || '';
// Nomor permintaan terakhir, supaya jawaban lama yang telat datang tidak menimpa yang baru
let nomorPermintaan = 0;
 
const cariBarang = id => tersedia.find(b => String(b.id_barang) === String(id));
 
// Tampilkan pesan error dari server (pesan utama + detail per kolom kalau ada)
function tampilError(pesan, errors) {
    const detail = errors && typeof errors === 'object'
        ? Object.values(errors).filter(v => typeof v === 'string')
        : [];
    errorBox.innerHTML = [pesan, ...detail].map(esc).join('<br>');
    errorBox.style.display = 'block';
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
 
function opsiBarang() {
    return '<option value="">Pilih barang</option>' +
        tersedia.map(b => `<option value="${b.id_barang}">${esc(b.nama_barang)} (stok ${b.stok_tersedia})</option>`).join('');
}
 
// Batas jumlah mengikuti stok barang yang dipilih
function aturMaks(row) {
    const b = cariBarang(row.querySelector('select').value);
    row.querySelector('.jumlah').max = b ? b.stok_tersedia : '';
}

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

// Isi ulang pilihan di semua baris setelah daftar barang berubah.
// Pilihan lama dipertahankan kalau barangnya masih tersedia.
function isiUlangOpsi() {
    daftar.querySelectorAll('.barang-row').forEach(row => {
        const select = row.querySelector('select');
        const lama = select.value;
        select.innerHTML = opsiBarang();
        select.value = cariBarang(lama) ? lama : '';
        aturMaks(row);
    });
    sinkron();
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

// Ambil barang yang tersedia dari server setiap kali tanggal pinjam / kembali berubah
async function muatBarang() {
    const mulai = inputPinjam.value;
    const selesai = inputKembali.value;
    if (!mulai || !selesai) return;
 
    const nomor = ++nomorPermintaan;
 
    if (selesai <= mulai) {
        tersedia = [];
        isiUlangOpsi();
        info.textContent = 'Tanggal & jam kembali harus setelah tanggal & jam pinjam.';
        return;
    }
 
    info.textContent = 'Memuat barang yang tersedia...';
    try {
        // Format 'YYYY-MM-DDTHH:mm' dari datetime-local diterima server apa adanya
        const data = await apiGet('/api/barang/tersedia', { mulai, selesai });
        if (nomor !== nomorPermintaan) return;
        tersedia = data;
        info.textContent = data.length ? '' : 'Tidak ada barang yang tersedia pada waktu itu.';
    } catch (e) {
        if (nomor !== nomorPermintaan) return;
        tersedia = [];
        info.textContent = e.message;
    }
    isiUlangOpsi();
 
    // Pilih otomatis barang dari katalog (hanya sekali)
    if (barangAwal) {
        const awal = tersedia.find(b => b.nama_barang === barangAwal);
        const select = daftar.querySelector('.barang-row select');
        if (awal && select && !select.value) {
            select.value = awal.id_barang;
            aturMaks(select.closest('.barang-row'));
            sinkron();
        }
        barangAwal = '';
    }
}

btnTambah.addEventListener('click', tambahBaris);
tambahBaris();

// Waktu pinjam tidak boleh sebelum sekarang, waktu kembali tidak boleh sebelum waktu pinjam
inputPinjam.min = inputKembali.min = waktuLokal();
inputPinjam.addEventListener('change', () => {
    inputKembali.min = inputPinjam.value || waktuLokal();
    muatBarang();
});
inputKembali.addEventListener('change', muatBarang);
 
form.addEventListener('submit', async e => {
    e.preventDefault();
    errorBox.style.display = 'none';
 
    const tglPinjam = inputPinjam.value;
    const tglKembali = inputKembali.value;
    if (tglKembali <= tglPinjam) {
        tampilError('Tanggal & jam kembali harus setelah tanggal & jam pinjam');
        return;
    }
 
    const barang = [...daftar.querySelectorAll('.barang-row')].map(r => ({
        id_barang: Number(r.querySelector('select').value),
        jumlah: Number(r.querySelector('.jumlah').value),
    }));
 
    const lebihStok = barang.find(it => it.jumlah < 1 || it.jumlah > cariBarang(it.id_barang).stok_tersedia);
    if (lebihStok) {
        const b = cariBarang(lebihStok.id_barang);
        tampilError(`Jumlah ${b.nama_barang} harus antara 1 dan ${b.stok_tersedia}`);
        return;
    }
 
    const tombol = form.querySelector('button[type="submit"]');
    tombol.disabled = true;
    try {
        await apiPost('/api/pengajuan', {
            nama_peminjam: document.getElementById('nama').value.trim(),
            nim_peminjam: document.getElementById('nim').value.trim(),
            no_hp_peminjam: document.getElementById('noHp').value.trim(),
            nama_kegiatan: document.getElementById('namaKegiatan').value.trim(),
            keperluan: document.getElementById('keperluan').value.trim(),
            tanggal_pinjam: tglPinjam,
            tanggal_kembali: tglKembali,
            barang,
        });
        toastNanti('Pengajuan berhasil dikirim!');
        location.href = 'riwayat.html';
    } catch (err) {
        // 422: errors per kolom, 409: stok kurang / bentrok agenda HMTI
        tampilError(err.message, err.errors);
        tombol.disabled = false;
    }
});