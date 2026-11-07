// Halaman depan publik (mode tamu): tidak memanggil requireLogin().

// Kalau sudah login, tombol Masuk/Daftar diganti jadi tombol ke dashboard.
const sesi = getCurrentUser();
if (sesi) {
    const tujuan = sesi.role === 'admin' ? 'pages/admin/dashboard.html' : 'pages/peminjam/dashboard.html';
    document.getElementById('aksiNav').innerHTML =
        `<a href="${tujuan}" class="btn btn-yellow">Ke Dashboard</a>`;
}

const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
function tanggalIndo(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return `${d} ${bulan[m - 1]} ${y}`;
}

// Semua barang dari server disimpan di sini. Pencarian dan filter status
// dilakukan di browser, jadi mengetik di kotak cari tidak memanggil API terus-menerus.
let semuaBarang = [];
 
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

    const hasil = DUMMY_BARANG.filter(b =>
        b.nama.toLowerCase().includes(q) && (!status || b.status === status)
    );

    document.getElementById('daftar').innerHTML = hasil.length ? hasil.map(b => `
    <div class="item">
      <div class="img">${ikonBarang(b.icon)}</div>
      <b>${b.nama}</b><br>
      <small>${b.kategori || ''}</small><br>
      ${badge(b.status, 'barang')}<br><br>
      <a href="pages/auth/login.html" class="btn btn-gray">Masuk untuk meminjam</a>
    </div>`).join('') : '<p>Barang tidak ditemukan.</p>';
}

async function muatBarang() {
    const box = document.getElementById('daftar');
    box.innerHTML = '<p>Memuat barang...</p>';
    try {
        semuaBarang = await apiGet('/api/barang');
        tampilkanBarang();
    } catch (e) {
        box.innerHTML = `<p>${esc(e.message)}</p>`;
    }
}

document.getElementById('cari').addEventListener('input', tampilkanBarang);
document.getElementById('filter').addEventListener('change', tampilkanBarang);
tampilkanAgenda();
tampilkanBarang();
