function formatTanggal(str) {
  return new Date(str).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// '2026-09-21T10:15' -> '21 Sep 2026, 10:15' (tanpa jam kalau datanya hanya tanggal)
function formatTanggalJam(str) {
  if (!str) return '-';
  if (!str.includes('T')) return formatTanggal(str);
  return `${formatTanggal(str)}, ${str.slice(11, 16)}`;
}

// Ringkasan barang untuk tabel: 'Proyektor Epson +2 lainnya'
function ringkasBarang(p) {
  const items = p.items || [];
  if (!items.length) return p.barang || '-';
  return items.length > 1 ? `${items[0].nama} +${items.length - 1} lainnya` : items[0].nama;
}
