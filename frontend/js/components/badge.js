// jenis 'barang' = Badge Ketersediaan (status stok barang), selain itu Badge Status pengajuan
function badge(status, jenis) {
  const warna = {
    Tersedia: 'green', Aktif: 'green', Disetujui: 'green-tua',
    Menunggu: 'orange',
    Dipinjam: 'blue',
    Dikembalikan: 'gray', Nonaktif: 'gray',
    Ditolak: 'red', Habis: 'red', Rusak: 'red', Hilang: 'red',
  };
  if (jenis === 'barang') {
    const ikon = status === 'Tersedia' ? '<i class="bi bi-check-circle"></i>' : '';
    return `<span class="badge stok ${warna[status] || 'orange'}">${ikon}${status}</span>`;
  }
  return `<span class="badge ${warna[status] || 'orange'}">${status}</span>`;
}
