// Ikon barang: dicocokkan dari nama barang, cadangannya dari kategori, terakhir kotak biasa.
// (Nanti kalau sudah ada foto asli, tampilkan <img> di sini.)
const IKON_NAMA = [
    ['laptop', 'bi-laptop-fill'],
    ['proyektor', 'bi-projector-fill'],
    ['tripod', 'bi-camera-reels-fill'],
    ['kamera', 'bi-camera-fill'],
    ['mikrofon', 'bi-mic-fill'],
    ['sound', 'bi-speaker-fill'],
    ['white screen', 'bi-easel-fill'],
    ['hdmi', 'bi-hdmi-fill'],
    ['handy', 'bi-broadcast-pin'],
    ['karpet', 'bi-grid-3x3-gap-fill'],
    ['backdrop', 'bi-image-fill'],
    ['terminal', 'bi-plug-fill'],
];
const IKON_KATEGORI = {
    'Elektronik': 'bi-cpu-fill',
    'Audio': 'bi-volume-up-fill',
    'Perlengkapan Acara': 'bi-calendar-event-fill',
};

// b = objek barang dari API ({ nama_barang, nama_kategori }), boleh kosong
function ikonBarang(b) {
    const nama = String((b && b.nama_barang) || '').toLowerCase();
    const cocok = IKON_NAMA.find(([kata]) => nama.includes(kata));
    const icon = cocok ? cocok[1] : (b && IKON_KATEGORI[b.nama_kategori]) || 'bi-box-seam-fill';
    return `<i class="bi ${icon}"></i>`;
}

// Foto barang: kolom foto_barang hanya berisi nama file (mis. kamera.jpg) di assets/images/barang/.
// akar = jalan dari halaman ke folder frontend ('../../' untuk pages/admin dan pages/peminjam).
// Nama yang tidak cocok pola dianggap kosong, jadi tidak bisa menyisipkan path atau URL lain.
function fotoBarang(b, akar = '../../') {
    const nama = String((b && b.foto_barang) || '').trim();
    return /^[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp)$/.test(nama) ? `${akar}assets/images/barang/${nama}` : null;
}

// Modal foto ukuran besar (detail barang dan katalog guest). Memakai .modal / .modal-box yang sama
// dengan konfirmasi() di ui.js. Tutup lewat tombol Tutup, klik area gelap, atau Esc.
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
    img.alt = nama;
    img.addEventListener('error', () => { img.parentElement.textContent = 'Foto tidak tersedia.'; });
    img.src = src;

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

// Waktu lokal dalam format 'YYYY-MM-DDTHH:mm'
function waktuLokal(d = new Date()) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Sudah lewat tanggal kembali tapi barang belum dikembalikan
function terlambat(p) {
    return p.status === 'Dipinjam' && p.tglKembali < waktuLokal();
}
