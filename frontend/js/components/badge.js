function badge(status) {
  const warna = {
    Tersedia: 'green', Disetujui: 'green',
    Menunggu: 'orange',
    Dipinjam: 'blue',
    Dikembalikan: 'gray',
    Ditolak: 'red', Habis: 'red',
  };
  return `<span class="badge ${warna[status] || 'orange'}">${status}</span>`;
}
