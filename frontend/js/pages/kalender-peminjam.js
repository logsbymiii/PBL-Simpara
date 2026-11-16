const user = requireLogin('peminjam');
renderSidebar('peminjam', 'Kalender');
renderTopbar(user);

// Baca-saja: agenda HMTI dari GET /api/agenda (server hanya mengirim agenda yang
// sedang berlangsung atau akan datang). Tanggal agenda tidak bisa dipinjam.
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const sekarang = new Date();
let tahun = sekarang.getFullYear();
let bulan = sekarang.getMonth();
let agenda = [];

const info = document.getElementById('infoKalender');
const pad = n => String(n).padStart(2, '0');
const keStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// '2026-11-20' -> '20 Nov 2026'
function tanggalIndo(iso) {
    const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
    return `${d} ${BULAN[m - 1].slice(0, 3)} ${y}`;
}

function renderKalender() {
    document.getElementById('judul').textContent = `${BULAN[bulan]} ${tahun}`;

    const awalMinggu = (new Date(tahun, bulan, 1).getDay() + 6) % 7;   // Senin = 0
    const jumlahHari = new Date(tahun, bulan + 1, 0).getDate();
    const totalSel = Math.ceil((awalMinggu + jumlahHari) / 7) * 7;
    const hariIni = keStr(sekarang);

    let html = HARI.map(h => `<div class="cal-dow">${h}</div>`).join('');

    for (let i = 0; i < totalSel; i++) {
        const d = new Date(tahun, bulan, 1 - awalMinggu + i);
        const tgl = keStr(d);
        const luar = d.getMonth() !== bulan;
        const events = agenda.filter(a =>
            tgl >= String(a.tanggal_mulai).slice(0, 10) && tgl <= String(a.tanggal_selesai).slice(0, 10));

        html += `
      <div class="cal-day ${luar ? 'luar' : ''} ${tgl === hariIni ? 'hari-ini' : ''} ${events.length ? 'terkunci' : ''}">
        <span class="tgl">${d.getDate()}</span>
        ${events.map(a => `<div class="event agenda" title="${esc(a.nama_agenda)} (tidak bisa dipinjam)">${esc(a.nama_agenda)}</div>`).join('')}
      </div>`;
    }
    document.getElementById('kalender').innerHTML = html;
}

// Daftar di bawah kalender: nama acara lengkap, mudah dibaca di HP
function renderDaftar() {
    document.getElementById('daftarAgenda').innerHTML = agenda.length ? agenda.map(a => `
    <div class="agenda-baris">
      <div class="agenda-tanggal">
        <b>${tanggalIndo(a.tanggal_mulai)}</b>
        ${a.tanggal_selesai !== a.tanggal_mulai ? `<small>s/d ${tanggalIndo(a.tanggal_selesai)}</small>` : ''}
      </div>
      <div>
        <b>${esc(a.nama_agenda)}</b>
        ${a.keterangan ? `<small>${esc(a.keterangan)}</small>` : ''}
      </div>
    </div>`).join('') : '<p class="empty">Belum ada agenda HMTI yang akan datang.</p>';
}

function geser(n) {
    bulan += n;
    if (bulan < 0) { bulan = 11; tahun--; }
    if (bulan > 11) { bulan = 0; tahun++; }
    renderKalender();
}

async function muat() {
    renderKalender();   // grid langsung tampil, agenda menyusul
    info.textContent = 'Memuat agenda...';
    try {
        agenda = await apiGet('/api/agenda');
        info.textContent = '';
        renderKalender();
        renderDaftar();
    } catch (e) {
        info.textContent = e.message;
        document.getElementById('daftarAgenda').innerHTML = `<p class="empty">${esc(e.message)}</p>`;
    }
}

document.getElementById('prev').addEventListener('click', () => geser(-1));
document.getElementById('next').addEventListener('click', () => geser(1));
muat();
