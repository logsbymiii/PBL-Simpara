const user = requireLogin('admin');
renderSidebar('admin', 'Kalender');
renderTopbar(user);

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

// Kelas warna di kalender.css untuk tiap status. Terlambat belum punya warna sendiri,
// jadi dipakai warna Dipinjam (arti statusnya: masih dipinjam).
const KELAS_STATUS = {
  'Menunggu Verifikasi': 'menunggu',
  'Disetujui': 'disetujui',
  'Dipinjam': 'dipinjam',
  'Terlambat': 'dipinjam',
  'Dikembalikan': 'dikembalikan',
};

const sekarang = new Date();
let tahun = sekarang.getFullYear();
let bulan = sekarang.getMonth();
let nomorPermintaan = 0;

const info = document.getElementById('infoKalender');
const pad = n => String(n).padStart(2, '0');
const keStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Tanggal pertama dan terakhir yang tampil di grid (termasuk sisa bulan sebelum/sesudahnya)
function rentangGrid() {
  const awalMinggu = (new Date(tahun, bulan, 1).getDay() + 6) % 7;   // Senin = 0
  const jumlahHari = new Date(tahun, bulan + 1, 0).getDate();
  const totalSel = Math.ceil((awalMinggu + jumlahHari) / 7) * 7;
  const awal = new Date(tahun, bulan, 1 - awalMinggu);
  const akhir = new Date(tahun, bulan, 1 - awalMinggu + totalSel - 1);
  return { awalMinggu, totalSel, awal, akhir };
}

// Gambar grid kalender. 'data' = baris peminjaman dari server (satu baris per barang).
function render(data) {
  document.getElementById('judul').textContent = `${BULAN[bulan]} ${tahun}`;

  // Yang ditolak atau dibatalkan tidak memakai barang, jadi tidak ditampilkan
  const pengajuan = data.filter(p => KELAS_STATUS[p.status_tampil]);
  const { awalMinggu, totalSel } = rentangGrid();
  const hariIni = keStr(sekarang);

  let html = HARI.map(h => `<div class="cal-dow">${h}</div>`).join('');

  for (let i = 0; i < totalSel; i++) {
    const d = new Date(tahun, bulan, 1 - awalMinggu + i);
    const tgl = keStr(d);
    const luar = d.getMonth() !== bulan;
    const events = pengajuan.filter(p =>
      tgl >= p.tanggal_pinjam.slice(0, 10) && tgl <= p.tanggal_kembali.slice(0, 10));

    html += `
      <div class="cal-day ${luar ? 'luar' : ''} ${tgl === hariIni ? 'hari-ini' : ''}">
        <span class="tgl">${d.getDate()}</span>
        ${events.map(p => `<div class="event ${KELAS_STATUS[p.status_tampil]}" title="${esc(p.nama_peminjam)} - ${esc(p.nama_barang)} ×${p.jumlah} (${esc(p.status_tampil)})">${esc(p.nama_barang)}</div>`).join('')}
      </div>`;
  }
  document.getElementById('kalender').innerHTML = html;
}

async function muat() {
  const nomor = ++nomorPermintaan;   // jawaban lama yang telat datang diabaikan
  render([]);                        // grid langsung tampil, peminjaman menyusul
  info.textContent = 'Memuat jadwal...';

  const { awal, akhir } = rentangGrid();
  try {
    const data = await apiGet('/api/laporan/peminjaman', { dari: keStr(awal), sampai: keStr(akhir) });
    if (nomor !== nomorPermintaan) return;
    info.textContent = '';
    render(data);
  } catch (e) {
    if (nomor !== nomorPermintaan) return;
    info.textContent = e.message;
  }
}

function geser(n) {
  bulan += n;
  if (bulan < 0) { bulan = 11; tahun--; }
  if (bulan > 11) { bulan = 0; tahun++; }
  muat();
}

document.getElementById('prev').addEventListener('click', () => geser(-1));
document.getElementById('next').addEventListener('click', () => geser(1));
muat();