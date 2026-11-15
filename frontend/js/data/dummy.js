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

// Waktu lokal dalam format 'YYYY-MM-DDTHH:mm'
function waktuLokal(d = new Date()) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Sudah lewat tanggal kembali tapi barang belum dikembalikan
function terlambat(p) {
    return p.status === 'Dipinjam' && p.tglKembali < waktuLokal();
}
