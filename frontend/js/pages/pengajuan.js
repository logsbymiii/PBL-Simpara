const user = requireLogin('peminjam');
renderSidebar('peminjam', 'Pengajuan');
renderTopbar(user);

document.getElementById('nama').value = user.nama;

// Isi pilihan barang (hanya yang tersedia)
const select = document.getElementById('barang');
DUMMY_BARANG.filter(b => b.status === 'Tersedia').forEach(b => {
    select.innerHTML += `<option>${b.nama}</option>`;
});

// Pilih otomatis kalau datang dari tombol "Ajukan"
const dariLink = new URLSearchParams(location.search).get('barang');
if (dariLink) select.value = dariLink;

// Tanggal tidak boleh sebelum hari ini
const hariIni = new Date().toISOString().split('T')[0];
document.getElementById('tglPinjam').min = hariIni;
document.getElementById('tglKembali').min = hariIni;

document.getElementById('formAjuan').addEventListener('submit', e => {
    e.preventDefault();
    const tglPinjam = document.getElementById('tglPinjam').value;
    const tglKembali = document.getElementById('tglKembali').value;

    if (tglKembali < tglPinjam) {
        alert('Tanggal kembali tidak boleh sebelum tanggal pinjam');
        return;
    }

    addPengajuan({
        peminjam: user.nama,
        barang: select.value,
        tglPinjam,
        tglKembali,
        keperluan: document.getElementById('keperluan').value.trim(),
    });

    alert('Pengajuan berhasil dikirim!');
    location.href = 'riwayat.html';
});