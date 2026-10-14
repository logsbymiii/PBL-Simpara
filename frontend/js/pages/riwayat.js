const user = requireLogin('peminjam');
renderSidebar('peminjam', 'Riwayat');
renderTopbar(user);

const mine = getAllPengajuan().filter(p => p.peminjam === user.nama);

document.getElementById('tabel').innerHTML = mine.length ? mine.map((p, i) => `
  <tr>
    <td>${i + 1}</td>
    <td>${p.barang}</td>
    <td>${formatTanggal(p.tglPinjam)}</td>
    <td>${badge(p.status)}</td>
    <td><a href="detail-peminjaman.html?id=${p.id}" class="btn btn-yellow">Lihat</a></td>
  </tr>`).join('') : '<tr><td colspan="5">Belum ada riwayat.</td></tr>';