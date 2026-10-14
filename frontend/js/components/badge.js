function badge(status) {
  const warna = {
    Tersedia: 'green', Selesai: 'green', Disetujui: 'green',
    Menunggu: 'orange', Dipinjam: 'orange',
    Ditolak: 'red', Habis: 'red',
  };
  return `<span class="badge ${warna[status] || 'orange'}">${status}</span>`;
}