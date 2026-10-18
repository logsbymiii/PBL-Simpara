const DUMMY_USERS = [
    { nama: 'Aqilah Zakky', nim: '2341720001', email: 'aqilah@gmail.com', password: '123456', role: 'peminjam', oki: 'UKM Theateristic' },
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

// Satu pengajuan bisa berisi beberapa barang (items).
// Tanggal pakai format 'YYYY-MM-DDTHH:mm' (sama dengan input datetime-local).
// kondisi/catatan per barang & dikembalikanPada diisi saat barang dikembalikan,
// alasanTolak diisi saat pengajuan ditolak.
const DUMMY_PENGAJUAN = [
    {
        id: 1, peminjam: 'Aqilah Zakky', oki: 'UKM Theateristic',
        items: [{ barangId: 2, nama: 'Proyektor Epson', jumlah: 1 }, { barangId: 4, nama: 'Kabel HDMI', jumlah: 2 }, { barangId: 5, nama: 'White Screen', jumlah: 1 }],
        tglPinjam: '2026-09-20T08:00', tglKembali: '2026-09-21T16:00', diajukanPada: '2026-09-15T10:30',
        keperluan: 'Pentas teater UKM Theateristic', status: 'Menunggu',
    },
    {
        id: 2, peminjam: 'Aqilah Zakky', oki: 'UKM Theateristic',
        items: [{ nama: 'Laptop', jumlah: 1, kondisi: 'Baik' }, { barangId: 1, nama: 'Mikrofon', jumlah: 2, kondisi: 'Rusak', catatan: 'Kabel mikrofon putus' }],
        tglPinjam: '2026-09-05T09:00', tglKembali: '2026-09-07T15:00', diajukanPada: '2026-09-01T13:20', dikembalikanPada: '2026-09-07T10:15',
        keperluan: 'Rapat divisi', status: 'Dikembalikan',
    },
    {
        id: 3, peminjam: 'Aqilah Zakky', oki: 'UKM Theateristic',
        items: [{ barangId: 3, nama: 'Kamera', jumlah: 1 }],
        tglPinjam: '2026-09-01T07:30', tglKembali: '2026-09-03T17:00', diajukanPada: '2026-08-28T09:00',
        keperluan: 'Dokumentasi acara', status: 'Dipinjam',
    },
    {
        id: 9, peminjam: 'Aqilah Zakky', oki: 'UKM Theateristic',
        items: [{ nama: 'Sound System', jumlah: 1 }, { barangId: 1, nama: 'Mikrofon', jumlah: 2 }],
        tglPinjam: '2026-08-25T08:00', tglKembali: '2026-08-25T22:00', diajukanPada: '2026-08-20T11:45',
        keperluan: 'Latihan gabungan pentas', status: 'Ditolak',
        alasanTolak: 'Sound system sedang dipakai kegiatan HMTI pada tanggal tersebut.',
    },
    {
        id: 4, peminjam: 'Samuelo Adhitiasa', oki: 'HMTI',
        items: [{ nama: 'Laptop', jumlah: 2 }],
        tglPinjam: '2026-10-12T08:00', tglKembali: '2026-10-14T16:00', diajukanPada: '2026-10-08T14:00',
        keperluan: 'Lomba coding', status: 'Menunggu',
    },
    {
        id: 5, peminjam: 'Lana Aprilana', oki: 'UKM Jurnalistik',
        items: [{ barangId: 3, nama: 'Kamera', jumlah: 1 }, { nama: 'Tripod', jumlah: 1 }],
        tglPinjam: '2026-10-15T07:00', tglKembali: '2026-10-16T18:00', diajukanPada: '2026-10-10T09:30',
        keperluan: 'Liputan seminar', status: 'Menunggu',
    },
    {
        id: 6, peminjam: 'Gilne Ayu', oki: 'BEM',
        items: [{ barangId: 1, nama: 'Mikrofon', jumlah: 3, kondisi: 'Baik' }],
        tglPinjam: '2026-10-08T08:00', tglKembali: '2026-10-10T16:00', diajukanPada: '2026-10-03T10:00', dikembalikanPada: '2026-10-10T15:40',
        keperluan: 'Acara penyambutan', status: 'Dikembalikan',
    },
    {
        id: 7, peminjam: 'Nagustan Kalmorina', oki: 'UKM Seni',
        items: [{ nama: 'Sound System', jumlah: 1 }],
        tglPinjam: '2026-10-20T13:00', tglKembali: '2026-10-22T21:00', diajukanPada: '2026-10-14T16:10',
        keperluan: 'Pentas seni', status: 'Ditolak', alasanTolak: 'Sound system sedang diperbaiki.',
    },
    {
        id: 8, peminjam: 'Gilne Ayu', oki: 'BEM',
        items: [{ barangId: 2, nama: 'Proyektor', jumlah: 1 }, { barangId: 4, nama: 'Kabel HDMI', jumlah: 1 }],
        tglPinjam: '2026-10-09T18:00', tglKembali: '2026-10-13T12:00', diajukanPada: '2026-10-05T08:15',
        keperluan: 'Nonton bareng', status: 'Dipinjam',
    },
];

// Waktu lokal dalam format 'YYYY-MM-DDTHH:mm'
function waktuLokal(d = new Date()) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Samakan bentuk data: data lama (barang: 'string', status 'Selesai') diubah ke model baru.
// Kolom `barang` tetap diisi (teks gabungan) supaya halaman admin yang masih memakainya tidak rusak.
function normalisasiPengajuan(p, override) {
    const items = p.items || (p.barang ? [{ nama: p.barang, jumlah: 1 }] : []);
    let status = override[p.id] || p.status;
    if (status === 'Selesai') status = 'Dikembalikan';
    return { ...p, items, status, barang: items.map(it => `${it.nama} ×${it.jumlah}`).join(', ') };
}

function getAllPengajuan() {
    const stored = JSON.parse(localStorage.getItem('pengajuan') || '[]');
    const override = JSON.parse(localStorage.getItem('statusPengajuan') || '{}');
    return [...stored, ...DUMMY_PENGAJUAN].map(p => normalisasiPengajuan(p, override));
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

// p: { peminjam, oki, items: [{ barangId, nama, jumlah }], tglPinjam, tglKembali, keperluan }
function addPengajuan(p) {
    const stored = JSON.parse(localStorage.getItem('pengajuan') || '[]');
    stored.unshift({ ...p, id: Date.now(), status: 'Menunggu', diajukanPada: waktuLokal() });
    localStorage.setItem('pengajuan', JSON.stringify(stored));
}
