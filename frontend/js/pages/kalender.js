const user = requireLogin('admin');
renderSidebar('admin', 'Kalender');
renderTopbar(user);

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const sekarang = new Date();
let tahun = sekarang.getFullYear();
let bulan = sekarang.getMonth();

const pad = n => String(n).padStart(2, '0');
const keStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function render() {
    document.getElementById('judul').textContent = `${BULAN[bulan]} ${tahun}`;

    const pengajuan = getAllPengajuan().filter(p => p.status !== 'Ditolak');
    const awalMinggu = (new Date(tahun, bulan, 1).getDay() + 6) % 7;   // Senin = 0
    const jumlahHari = new Date(tahun, bulan + 1, 0).getDate();
    const totalSel = Math.ceil((awalMinggu + jumlahHari) / 7) * 7;
    const hariIni = keStr(sekarang);

    let html = HARI.map(h => `<div class="cal-dow">${h}</div>`).join('');

    for (let i = 0; i < totalSel; i++) {
        const d = new Date(tahun, bulan, 1 - awalMinggu + i);
        const tgl = keStr(d);
        const luar = d.getMonth() !== bulan;
        const events = pengajuan.filter(p => tgl >= p.tglPinjam && tgl <= p.tglKembali);

        html += `
      <div class="cal-day ${luar ? 'luar' : ''} ${tgl === hariIni ? 'hari-ini' : ''}">
        <span class="tgl">${d.getDate()}</span>
        ${events.map(p => `<div class="event ${p.status.toLowerCase()}" title="${p.peminjam} - ${p.barang} (${p.status})">${p.barang}</div>`).join('')}
      </div>`;
    }
    document.getElementById('kalender').innerHTML = html;
}

function geser(n) {
    bulan += n;
    if (bulan < 0) { bulan = 11; tahun--; }
    if (bulan > 11) { bulan = 0; tahun++; }
    render();
}

document.getElementById('prev').addEventListener('click', () => geser(-1));
document.getElementById('next').addEventListener('click', () => geser(1));
render();