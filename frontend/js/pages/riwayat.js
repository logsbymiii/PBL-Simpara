const user = requireLogin('peminjam');
renderSidebar('peminjam', 'Riwayat');
renderTopbar(user);

const mine = getAllPengajuan().filter(p => p.peminjam === user.nama);


// Daftar tab filter status
const daftarTab = [
    { key: 'Semua', status: null },
    { key: 'Menunggu', status: ['Menunggu', 'Menunggu Verifikasi'] },
    { key: 'Disetujui', status: ['Disetujui'] },
    { key: 'Dipinjam', status: ['Dipinjam'] },
    { key: 'Dikembalikan', status: ['Dikembalikan'] },
    { key: 'Ditolak', status: ['Ditolak'] }
];

// Status tab yang aktif
let statusAktif = 'Semua';

// Mengambil elemen tab dan tabel
const filterStatus = document.getElementById('filterStatus');
const tabel = document.getElementById('tabel');

// Menghitung jumlah pengajuan berdasarkan status
function hitungJumlah(tab) {
    if (tab.status === null) return mine.length;

    return mine.filter(p => tab.status.includes(p.status)).length;
}

// Menampilkan tab status
function tampilkanTab() {
    filterStatus.innerHTML = daftarTab.map(tab => `
        <button type="button"
            class="${statusAktif === tab.key ? 'active' : ''}"
            data-status="${tab.key}">
            ${tab.key}
            <span>${hitungJumlah(tab)}</span>
        </button>
    `).join('');

    // Event klik tab
    filterStatus.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', function () {
            statusAktif = this.dataset.status;

            tampilkanTab();
            tampilkanRiwayat();
        });
    });
}

// Menampilkan riwayat sesuai status yang dipilih
function tampilkanRiwayat() {
    const tab = daftarTab.find(item => item.key === statusAktif);

    const dataTampil = tab.status === null
        ? mine
        : mine.filter(p => tab.status.includes(p.status));

    tabel.innerHTML = dataTampil.length
        ? dataTampil.map((p, i) => `
            <tr>
                <td>${i + 1}.</td>
                <td title="${p.barang}">${ringkasBarang(p)}</td>
                <td>${formatTanggalJam(p.tglPinjam)}</td>
                <td>${badge(p.status)}</td>
                <td>
                    <a href="detail-peminjaman.html?id=${p.id}"
                       class="btn btn-yellow btn-sm">Detail</a>
                </td>
            </tr>
        `).join('')
        : '<tr><td colspan="5">Belum ada riwayat.</td></tr>';
}

// Menjalankan tampilan awal
tampilkanTab();
tampilkanRiwayat();
