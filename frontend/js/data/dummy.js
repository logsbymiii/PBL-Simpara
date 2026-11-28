// Ikon barang: dicocokkan dari nama barang, cadangannya dari kategori, terakhir kotak biasa.
// Dipakai hanya kalau barang tidak punya foto atau fotonya gagal dimuat.
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

// Foto barang selalu diminta lewat proxy backend: GET /api/barang/{id}/foto. Backend mengambilnya
// dari database (unggahan lama) atau Cloudflare R2 (key barang/<foto_barang>), jadi browser tidak
// perlu mengakses r2.dev (diblokir di sebagian jaringan). Versi (?v=) dari foto_barang/foto_upload
// supaya foto baru langsung tampil setelah diganti.
const POLA_FOTO = /^[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp)$/;

function fotoBarang(b) {
    if (!b || !(Number(b.id_barang) > 0)) return null;
    const nama = String(b.foto_barang || '').trim();
    const upload = Number(b.foto_upload) || 0;
    if (upload <= 0 && !POLA_FOTO.test(nama)) return null;
    const basis = typeof API_BASE_URL === 'string' ? API_BASE_URL : '';
    return `${basis}/api/barang/${Number(b.id_barang)}/foto?v=${encodeURIComponent(`${nama}-${upload}`)}`;
}

// Cadangan kalau proxy/R2 gagal: file statis bawaan di frontend/assets/images/barang/<foto_barang>.
// akar = jalan dari halaman ke folder frontend ('../../' untuk pages/admin dan pages/peminjam, '' untuk index.html).
// Nama yang tidak cocok pola dianggap kosong, jadi tidak bisa menyisipkan path atau URL lain.
// Unggahan admin di R2 ("<slug>-<id>-<timestamp>.jpg") tidak ada di repo, jadi cadangannya foto bawaan
// menurut nama barang (huruf kecil, selain huruf/angka jadi '-', mis. kabel-hdmi.jpg), sama dengan server.
function fotoCadangan(b, akar = '../../') {
    let nama = String((b && b.foto_barang) || '').trim();
    if (/-\d+-\d{10}\.(jpg|png|webp)$/.test(nama) || (!nama && b && Number(b.foto_upload) > 0)) {
        nama = String(b.nama_barang || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '.jpg';
    }
    return POLA_FOTO.test(nama) && !nama.includes('..') ? `${akar}assets/images/barang/${nama}` : null;
}

// Atribut <img> untuk foto barang: src proxy + data-cadangan (dipakai pendengar error di bawah)
function atributFoto(b, akar = '../../') {
    const cadangan = fotoCadangan(b, akar);
    return `src="${esc(fotoBarang(b))}"${cadangan ? ` data-cadangan="${esc(cadangan)}"` : ''}`;
}

// Satu pendengar untuk SEMUA foto barang: kalau proxy gagal, coba file statis sekali.
// Fase capture + stopImmediatePropagation: pendengar error milik halaman (ganti ke ikon)
// baru jalan kalau file statis juga gagal. Thumbnail dari thumbBarang() (punya data-ikon)
// langsung diganti ikon di sini, jadi halamannya tidak perlu pendengar sendiri.
document.addEventListener('error', e => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement)) return;
    if (img.dataset.cadangan) {
        const cadangan = img.dataset.cadangan;
        delete img.dataset.cadangan;
        e.stopImmediatePropagation();
        img.src = cadangan;
    } else if (img.dataset.ikon && img.parentElement) {
        e.stopImmediatePropagation();
        img.parentElement.innerHTML = img.dataset.ikon;
    }
}, true);

// Thumbnail kecil foto barang (tabel Data Barang admin, Detail Peminjaman, picker form pengajuan).
// Kotak rasio tetap 4:3 (lebar diatur CSS .thumb-barang), foto utuh (object-fit: contain).
// Urutan: foto proxy -> file statis (data-cadangan) -> ikon (data-ikon, oleh pendengar di atas).
// b cukup berisi id_barang, nama_barang, foto_barang (foto_upload/nama_kategori opsional).
function thumbBarang(b, akar = '../../') {
    const ikon = ikonBarang(b);
    return fotoBarang(b)
        ? `<span class="thumb-barang"><img ${atributFoto(b, akar)} data-ikon="${esc(ikon)}" alt="" loading="lazy"></span>`
        : `<span class="thumb-barang">${ikon}</span>`;
}

// Bagian gambar di atas kartu katalog: foto (klik = buka modal) atau ikon kalau tidak ada foto
function gambarKartu(b, akar = '../../') {
    return fotoBarang(b)
        ? `<button type="button" class="img ada-foto" data-foto="${b.id_barang}" aria-label="Lihat foto barang ${esc(b.nama_barang)}">
             <img ${atributFoto(b, akar)} alt="${esc(b.nama_barang)}" loading="lazy">
           </button>`
        : `<div class="img">${ikonBarang(b)}</div>`;
}

// Foto kartu gagal dimuat (proxy dan file statis) -> kembali ke ikon (tidak bisa diklik lagi)
function pasangCadanganFoto(wadah, daftarBarang) {
    wadah.querySelectorAll('.img.ada-foto img').forEach(img => {
        img.addEventListener('error', () => {
            const kotak = img.parentElement;
            const b = daftarBarang.find(x => String(x.id_barang) === kotak.dataset.foto);
            kotak.outerHTML = `<div class="img">${ikonBarang(b)}</div>`;
        });
    });
}

// Modal foto ukuran besar (detail barang, Daftar Barang, katalog guest). Memakai .modal / .modal-box
// yang sama dengan konfirmasi() di ui.js. Tutup lewat tombol Tutup, klik area gelap, atau Esc.
// b = objek barang; akar sama seperti fotoCadangan().
function bukaFoto(b, akar = '../../') {
    const nama = b.nama_barang;
    const cadangan = fotoCadangan(b, akar);
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
    if (cadangan) img.dataset.cadangan = cadangan;   // proxy gagal -> file statis dulu
    img.src = fotoBarang(b);

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
