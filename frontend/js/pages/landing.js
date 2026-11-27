// Halaman depan publik (mode tamu): tidak memanggil requireLogin().
// Data agenda dan barang diambil dari API (GET /api/agenda dan GET /api/barang).
// Keduanya endpoint publik, jadi tamu yang belum login tetap bisa melihatnya.

// Kalau sudah login, tombol Masuk/Daftar diganti jadi tombol ke dashboard.
// (Sesi login masih dari localStorage; diganti ke API di kelompok B.)
const sesi = getCurrentUser();
if (sesi) {
    const tujuan = sesi.role === 'admin' ? 'pages/admin/dashboard.html' : 'pages/peminjam/dashboard.html';
    document.getElementById('aksiNav').innerHTML =
        `<a href="${tujuan}" class="btn btn-yellow">Ke Dashboard</a>`;
}

const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
function tanggalIndo(iso) {
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    return `${d} ${bulan[m - 1]} ${y}`;
}

// Semua barang dari server disimpan di sini. Pencarian dan filter status
// dilakukan di browser, jadi mengetik di kotak cari tidak memanggil API terus-menerus.
let semuaBarang = [];
let halaman = 1;   // halaman katalog yang sedang tampil (PER_HALAMAN = 12 kartu)

async function muatAgenda() {
    const box = document.getElementById('daftarAgenda');
    box.innerHTML = '<p>Memuat agenda...</p>';
    try {
        // Server sudah hanya mengirim agenda yang akan datang atau sedang berlangsung
        const agenda = await apiGet('/api/agenda');
        box.innerHTML = agenda.length
            ? agenda.map(a => `
        <div class="agenda-item">
          <div class="agenda-tgl">
            <b>${tanggalIndo(a.tanggal_mulai)}</b>${a.tanggal_selesai !== a.tanggal_mulai ? `<br><small>s/d ${tanggalIndo(a.tanggal_selesai)}</small>` : ''}
          </div>
          <div>
            <b>${esc(a.nama_agenda)}</b><br>
            <small>${esc(a.keterangan || '')}</small>
          </div>
        </div>`).join('')
            : '<p>Belum ada agenda HMTI yang akan datang.</p>';
    } catch (e) {
        box.innerHTML = `<p>${esc(e.message)}</p>`;
    }
}

function tampilkanBarang() {
    const q = document.getElementById('cari').value.toLowerCase();
    const status = document.getElementById('filter').value;

    const hasil = semuaBarang.filter(b =>
        b.nama_barang.toLowerCase().includes(q) && (!status || b.status === status)
    );

    const daftar = document.getElementById('daftar');
    const hal = paginasi(hasil, halaman, document.getElementById('paginasi'), n => {
        halaman = n;
        tampilkanBarang();
        daftar.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
    halaman = hal.halaman;

    // index.html ada di root frontend, jadi akar foto ''
    daftar.innerHTML = hal.isi.length ? hal.isi.map((b, i) => `
    <div class="item" style="--i:${i}">
      ${gambarKartu(b, '')}
      <b>${esc(b.nama_barang)}</b><br>
      <small>${esc(b.nama_kategori || '')}</small><br>
      ${badge(b.status, 'barang')}
      <div class="item-aksi">
        <a href="pages/auth/login.html" class="btn btn-gray">Masuk untuk meminjam</a>
      </div>
    </div>`).join('') : '<p>Barang tidak ditemukan.</p>';
    pasangCadanganFoto(daftar, semuaBarang);
}

// Klik gambar kartu -> modal foto. Akar foto ''.
document.getElementById('daftar').addEventListener('click', e => {
    const btn = e.target.closest('button[data-foto]');
    if (!btn) return;
    const b = semuaBarang.find(x => String(x.id_barang) === btn.dataset.foto);
    if (b) bukaFoto(b, '');
});

async function muatBarang() {
    const box = document.getElementById('daftar');
    box.innerHTML = skeletonKartu(PER_HALAMAN);
    try {
        semuaBarang = await apiGet('/api/barang');
        tampilkanBarang();
    } catch (e) {
        box.innerHTML = `<p>${esc(e.message)}</p>`;
    }
}

// Cari/filter baru -> mulai lagi dari halaman 1
const ulangDariAwal = () => { halaman = 1; tampilkanBarang(); };
document.getElementById('cari').addEventListener('input', ulangDariAwal);
document.getElementById('filter').addEventListener('change', ulangDariAwal);
muatAgenda();
muatBarang();