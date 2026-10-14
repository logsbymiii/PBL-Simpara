const DUMMY_USERS = [
    { nama: 'Aqilah Zakky', nim: '2341720001', email: 'aqilah@gmail.com', password: '123456', role: 'peminjam' },
    { nama: 'Inventaris HMTI', username: 'admin', nim: '', email: 'admin@simpara.com', password: 'admin123', role: 'admin' },
];

const DUMMY_BARANG = [
    { id: 1, nama: 'Mikrofon', icon: '🎤', stok: 5, status: 'Tersedia' },
    { id: 2, nama: 'Proyektor', icon: '📽️', stok: 2, status: 'Tersedia' },
    { id: 3, nama: 'Kamera', icon: '📷', stok: 0, status: 'Dipinjam' },
    { id: 4, nama: 'Kabel HDMI', icon: '🔌', stok: 8, status: 'Tersedia' },
    { id: 5, nama: 'White Screen', icon: '🖼️', stok: 1, status: 'Tersedia' },
    { id: 6, nama: 'Handy Talkie', icon: '📻', stok: 0, status: 'Dipinjam' },
];

const DUMMY_PENGAJUAN = [
    { id: 1, peminjam: 'Aqilah Zakky', barang: 'Proyektor Epson', tglPinjam: '2026-09-10', tglKembali: '2026-09-12', keperluan: 'Presentasi kegiatan HMTI', status: 'Menunggu' },
    { id: 2, peminjam: 'Aqilah Zakky', barang: 'Laptop', tglPinjam: '2026-09-05', tglKembali: '2026-09-07', keperluan: 'Rapat divisi', status: 'Selesai' },
    { id: 3, peminjam: 'Aqilah Zakky', barang: 'Kamera', tglPinjam: '2026-09-01', tglKembali: '2026-09-03', keperluan: 'Dokumentasi acara', status: 'Dipinjam' },
    { id: 4, peminjam: 'Samuelo Adhitiasa', barang: 'Laptop', tglPinjam: '2026-10-12', tglKembali: '2026-10-14', keperluan: 'Lomba coding', status: 'Menunggu' },
    { id: 5, peminjam: 'Lana Aprilana', barang: 'Kamera', tglPinjam: '2026-10-15', tglKembali: '2026-10-16', keperluan: 'Liputan seminar', status: 'Menunggu' },
    { id: 6, peminjam: 'Gilne Ayu', barang: 'Mikrofon', tglPinjam: '2026-10-08', tglKembali: '2026-10-10', keperluan: 'Acara penyambutan', status: 'Selesai' },
    { id: 7, peminjam: 'Nagustan Kalmorina', barang: 'Sound System', tglPinjam: '2026-10-20', tglKembali: '2026-10-22', keperluan: 'Pentas seni', status: 'Ditolak' },
    { id: 8, peminjam: 'Gilne Ayu', barang: 'Proyektor', tglPinjam: '2026-10-09', tglKembali: '2026-10-13', keperluan: 'Nonton bareng', status: 'Dipinjam' },
];

function getAllPengajuan() {
    const stored = JSON.parse(localStorage.getItem('pengajuan') || '[]');
    const override = JSON.parse(localStorage.getItem('statusPengajuan') || '{}');
    return [...stored, ...DUMMY_PENGAJUAN].map(p => ({ ...p, status: override[p.id] || p.status }));
}

// Dipakai admin untuk setujui / tolak / tandai kembali
function setStatusPengajuan(id, status) {
    const o = JSON.parse(localStorage.getItem('statusPengajuan') || '{}');
    o[id] = status;
    localStorage.setItem('statusPengajuan', JSON.stringify(o));
}

// Barang yang bisa diubah admin (disimpan di localStorage)
function getAllBarang() {
    const stored = localStorage.getItem('barang');
    return stored ? JSON.parse(stored) : DUMMY_BARANG;
}
function saveBarang(list) {
    localStorage.setItem('barang', JSON.stringify(list));
}

function addPengajuan(p) {
    const stored = JSON.parse(localStorage.getItem('pengajuan') || '[]');
    stored.unshift({ ...p, id: Date.now(), status: 'Menunggu' });
    localStorage.setItem('pengajuan', JSON.stringify(stored));
}