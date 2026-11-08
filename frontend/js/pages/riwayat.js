const user = requireLogin('peminjam');
renderSidebar('peminjam', 'Riwayat');
renderTopbar(user);

// Semua pengajuan dari server disimpan di sini; filter tab dilakukan di browser
let semua = [];

// Daftar tab filter. Nilai status mengikuti status_tampil dari server.
const daftarTab = [
    { key: 'Semua', status: null },
    { key: 'Menunggu', status: ['Menunggu Verifikasi'] },
    { key: 'Disetujui', status: ['Disetujui'] },
    { key: 'Dipinjam', status: ['Dipinjam'] },
    { key: 'Terlambat', status: ['Terlambat'] },
    { key: 'Dikembalikan', status: ['Dikembalikan'] },
    { key: 'Ditolak', status: ['Ditolak'] },
    { key: 'Dibatalkan', status: ['Dibatalkan'] }
];

let statusAktif = 'Semua';

const filterStatus = document.getElementById('filterStatus');
const tabel = document.getElementById('tabel');

function hitungJumlah(tab) {
    if (tab.status === null) return semua.length;
    return semua.filter(p => tab.status.includes(p.status_tampil)).length;
}

function tampilkanTab() {
    filterStatus.innerHTML = daftarTab.map(tab => `
        <button type="button"
            class="${statusAktif === tab.key ? 'active' : ''}"
            data-status="${tab.key}">
            ${tab.key}
            <span>${hitungJumlah(tab)}</span>
        </button>
    `).join('');

    filterStatus.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', function () {
            statusAktif = this.dataset.status;
            tampilkanTab();
            tampilkanRiwayat();
        });
    });
}

function tampilkanRiwayat() {
    const tab = daftarTab.find(item => item.key === statusAktif);

    const dataTampil = tab.status === null
        ? semua
        : semua.filter(p => tab.status.includes(p.status_tampil));

    tabel.innerHTML = dataTampil.length
        ? dataTampil.map((p, i) => `
            <tr>
                <td>${i + 1}.</td>
                <td title="${esc(p.barang)}">${esc(ringkasBarang(p))}</td>
                <td>${formatTanggalJam(p.tanggal_pinjam)}</td>
                <td>${badge(p.status_tampil)}</td>
                <td>
                    <a href="detail-peminjaman.html?id=${p.id_pengajuan}"
                       class="btn btn-yellow btn-sm">Detail</a>
                </td>
            </tr>
        `).join('')
        : '<tr><td colspan="5">Belum ada riwayat.</td></tr>';
}

async function muatRiwayat() {
    tabel.innerHTML = '<tr><td colspan="5">Memuat riwayat...</td></tr>';
    try {
        semua = await apiGet('/api/pengajuan');
        tampilkanTab();
        tampilkanRiwayat();
    } catch (e) {
        tabel.innerHTML = `<tr><td colspan="5">${esc(e.message)}</td></tr>`;
    }
}

muatRiwayat();