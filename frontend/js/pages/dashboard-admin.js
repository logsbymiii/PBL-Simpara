const user = requireLogin('admin');
renderSidebar('admin', 'Dashboard');
renderTopbar(user);

document.getElementById('welcome').textContent = `Selamat datang, ${user.nama}!`;

const semua = getAllPengajuan();
const hitung = s => semua.filter(p => p.status === s).length;
document.getElementById('statMenunggu').textContent = hitung('Menunggu');
document.getElementById('statDipinjam').textContent = hitung('Dipinjam');
document.getElementById('statDikembalikan').textContent = hitung('Dikembalikan');
document.getElementById('statDitolak').textContent = hitung('Ditolak');

document.getElementById('tabel').innerHTML = semua.slice(0, 5).map((p, i) => `
  <tr>
    <td>${i + 1}</td>
    <td>${p.peminjam}</td>
    <td>${p.barang}</td>
    <td>${formatTanggal(p.tglPinjam)}</td>
    <td>${badge(p.status)}</td>
  </tr>`).join('');