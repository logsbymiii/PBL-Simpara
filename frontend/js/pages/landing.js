// Halaman depan publik (mode tamu): tidak memanggil requireLogin().
// Data masih dummy; nanti diganti GET /api/barang dan GET /api/agenda (Fase 8).

const DUMMY_AGENDA = [
    { nama: 'Seminar Nasional HMTI', mulai: '2026-11-11', selesai: '2026-11-12', keterangan: 'Seluruh inventaris dipakai panitia internal' },
    { nama: 'Dies Natalis HMTI', mulai: '2026-11-22', selesai: '2026-11-23', keterangan: 'Acara puncak tahunan' },
];

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

function tampilkanAgenda() {
    const hariIni = new Date().toISOString().slice(0, 10);
    const akanDatang = DUMMY_AGENDA.filter(a => a.selesai >= hariIni);

    document.getElementById('daftarAgenda').innerHTML = akanDatang.length
        ? akanDatang.map(a => `
        <div class="agenda-item">
          <div class="agenda-tgl">
            <b>${tanggalIndo(a.mulai)}</b>${a.selesai !== a.mulai ? `<br><small>s/d ${tanggalIndo(a.selesai)}</small>` : ''}
          </div>
          <div>
            <b>${a.nama}</b><br>
            <small>${a.keterangan || ''}</small>
          </div>
        </div>`).join('')
        : '<p>Belum ada agenda HMTI yang akan datang.</p>';
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

document.getElementById('cari').addEventListener('input', tampilkanBarang);
document.getElementById('filter').addEventListener('change', tampilkanBarang);
tampilkanAgenda();
tampilkanBarang();
