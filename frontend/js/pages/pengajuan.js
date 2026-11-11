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

// ===== Picker barang: tampilan sendiri, <select> asli tetap dipakai untuk nilai & validasi =====

// Perbarui tulisan di tombol picker sesuai pilihan di <select>
function segarkanPicker(row) {
    const select = row.querySelector('select');
    const label = row.querySelector('.picker-label');
    const b = cariBarang(select.value);
    label.innerHTML = b
        ? `<span class="picker-ikon">${ikonBarang(b)}</span><span>${esc(b.nama_barang)} <small>(stok ${b.stok_tersedia})</small></span>`
        : '<span class="picker-placeholder">Pilih barang</span>';
}

function tutupPicker() {
    document.querySelectorAll('.picker.buka').forEach(p => p.classList.remove('buka'));
}

// Isi panel dari opsi <select> yang terbaru, lalu buka (klik lagi untuk menutup)
function bukaPicker(row) {
    const picker = row.querySelector('.picker');
    const select = row.querySelector('select');
    const sudahBuka = picker.classList.contains('buka');
    tutupPicker();
    if (sudahBuka) return;

    const opsi = [...select.options].filter(o => o.value !== '');
    picker.querySelector('.picker-panel').innerHTML = opsi.length
        ? opsi.map(o => {
            const b = cariBarang(o.value);
            return `
        <button type="button" class="picker-opsi${o.value === select.value ? ' dipilih' : ''}" data-nilai="${o.value}"${o.disabled ? ' disabled' : ''}>
          <span class="picker-ikon">${ikonBarang(b)}</span>
          <span class="picker-nama">${esc(b.nama_barang)}<small>${esc(b.nama_kategori || '')}</small></span>
          <span class="picker-stok">${o.disabled ? 'Sudah dipilih' : `stok ${b.stok_tersedia}`}</span>
        </button>`;
        }).join('')
        : '<div class="picker-kosong">Isi tanggal &amp; jam pinjam dan kembali dulu untuk melihat barang yang tersedia.</div>';
    picker.classList.add('buka');
}

// Satu pendengar untuk semua baris (baris baru otomatis ikut)
daftar.addEventListener('click', e => {
    if (e.target.classList.contains('picker')) {   // klik latar gelap di HP
        tutupPicker();
        return;
    }
    const tombol = e.target.closest('.picker-btn');
    if (tombol) {
        bukaPicker(tombol.closest('.barang-row'));
        return;
    }
    const opsi = e.target.closest('.picker-opsi');
    if (opsi && !opsi.disabled) {
        const select = opsi.closest('.barang-row').querySelector('select');
        select.value = opsi.dataset.nilai;
        select.dispatchEvent(new Event('change'));
        tutupPicker();
    }
});
document.addEventListener('click', e => {
    if (!e.target.closest('.picker')) tutupPicker();
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') tutupPicker();
});

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
        segarkanPicker(r);
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

function tambahBaris() {
    const row = document.createElement('div');
    row.className = 'barang-row';
    row.innerHTML = `
    <div class="picker">
      <select required tabindex="-1">${opsiBarang()}</select>
      <button type="button" class="picker-btn" aria-haspopup="listbox">
        <span class="picker-label"></span><i class="bi bi-chevron-down"></i>
      </button>
      <div class="picker-panel"></div>
    </div>
    <input type="number" class="jumlah" min="1" value="1" required>
    <button type="button" class="btn-hapus" aria-label="Hapus barang">×</button>`;

    row.querySelector('select').addEventListener('change', () => { aturMaks(row); sinkron(); });
    row.querySelector('.btn-hapus').addEventListener('click', () => { row.remove(); sinkron(); });

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

btnTambah.addEventListener('click', () => tambahBaris());
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

    const pin = document.getElementById('pin').value;
    if (!/^\d{4,6}$/.test(pin)) {
        tampilError('PIN harus 4 sampai 6 angka');
        return;
    }
    if (pin !== document.getElementById('pin2').value) {
        tampilError('PIN dan ulangi PIN tidak sama');
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
            pin,
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