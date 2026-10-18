const DUMMY_USERS = [
    { nama: 'Aqilah Zakky', nim: '2341720001', email: 'aqilah@gmail.com', password: '123456', role: 'peminjam', oki: 'UKM Theateristic' },
    { nama: 'Samuelo Adhitiasa', nim: '2341720002', email: 'samuelo@gmail.com', password: '123456', role: 'peminjam', oki: 'HMTI' },
    { nama: 'Lana Aprilana', nim: '2341720003', email: 'lana@gmail.com', password: '123456', role: 'peminjam', oki: 'UKM Jurnalistik' },
    { nama: 'Gilne Ayu', nim: '2341720004', email: 'gilne@gmail.com', password: '123456', role: 'peminjam', oki: 'BEM' },
    { nama: 'Nagustan Kalmorina', nim: '2341720005', email: 'nagustan@gmail.com', password: '123456', role: 'peminjam', oki: 'UKM Seni', aktif: false },
    { nama: 'Inventaris HMTI', username: 'admin', nim: '', email: 'admin@simpara.com', password: 'admin123', role: 'admin' },
];

const DUMMY_BARANG = [
    { id: 1, nama: 'Mikrofon', icon: 'bi-mic-fill', stok: 5, status: 'Tersedia', kategori: 'Audio' },
    { id: 2, nama: 'Proyektor', icon: 'bi-projector-fill', stok: 2, status: 'Tersedia', kategori: 'Multimedia' },
    { id: 3, nama: 'Kamera', icon: 'bi-camera-fill', stok: 0, status: 'Dipinjam', kategori: 'Dokumentasi' },
    { id: 4, nama: 'Kabel HDMI', icon: 'bi-plug-fill', stok: 8, status: 'Tersedia', kategori: 'Aksesoris' },
    { id: 5, nama: 'White Screen', icon: 'bi-easel-fill', stok: 1, status: 'Tersedia', kategori: 'Multimedia' },
    { id: 6, nama: 'Handy Talkie', icon: 'bi-broadcast-pin', stok: 0, status: 'Dipinjam', kategori: 'Komunikasi' },
];

// icon barang = nama kelas Bootstrap Icons (placeholder, nanti diganti foto dari database).
// Data lama di localStorage yang masih berisi emoji tetap ditampilkan apa adanya.
function ikonBarang(icon) {
    if (!icon) icon = 'bi-box-seam-fill';
    return icon.startsWith('bi-') ? `<i class="bi ${icon}"></i>` : icon;
}

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
        keperluan: 'Lomba coding', status: 'Disetujui',
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
// override[id] bisa berupa status (data lama) atau objek perubahan dari updatePengajuan.
function normalisasiPengajuan(p, override) {
    const o = override[p.id];
    const ubah = typeof o === 'string' ? { status: o } : (o || {});
    const gabung = { ...p, ...ubah };
    const items = gabung.items || (gabung.barang ? [{ nama: gabung.barang, jumlah: 1 }] : []);
    let status = gabung.status;
    if (status === 'Selesai') status = 'Dikembalikan';
    return { ...gabung, items, status, barang: items.map(it => `${it.nama} ×${it.jumlah}`).join(', ') };
}

function getAllPengajuan() {
    const stored = JSON.parse(localStorage.getItem('pengajuan') || '[]');
    const override = JSON.parse(localStorage.getItem('statusPengajuan') || '{}');
    return [...stored, ...DUMMY_PENGAJUAN].map(p => normalisasiPengajuan(p, override));
}

// Dipakai admin untuk mengubah pengajuan: status, alasanTolak, kondisi per barang, dll.
function updatePengajuan(id, perubahan) {
    const o = JSON.parse(localStorage.getItem('statusPengajuan') || '{}');
    const lama = typeof o[id] === 'string' ? { status: o[id] } : (o[id] || {});
    o[id] = { ...lama, ...perubahan };
    localStorage.setItem('statusPengajuan', JSON.stringify(o));
}

// Alur status: Menunggu -> Disetujui (siap diambil) -> Dipinjam -> Dikembalikan, atau Ditolak
function setStatusPengajuan(id, status) {
    updatePengajuan(id, { status });
}

// Sudah lewat tanggal kembali tapi barang belum dikembalikan
function terlambat(p) {
    return p.status === 'Dipinjam' && p.tglKembali < waktuLokal();
}

// Barang yang bisa diubah admin (disimpan di localStorage)
function getAllBarang() {
    const stored = localStorage.getItem('barang');
    return stored ? JSON.parse(stored) : DUMMY_BARANG;
}
function saveBarang(list) {
    localStorage.setItem('barang', JSON.stringify(list));
}

// Jumlah unit barang yang sedang dibawa peminjam (status Dipinjam)
function jumlahDipinjam(barangId) {
    return getAllPengajuan()
        .filter(p => p.status === 'Dipinjam')
        .flatMap(p => p.items)
        .filter(it => it.barangId === barangId)
        .reduce((n, it) => n + it.jumlah, 0);
}

// Akun peminjam bisa dinonaktifkan admin (disimpan di localStorage, kunci: email)
function akunAktif(u) {
    const status = JSON.parse(localStorage.getItem('statusAkun') || '{}');
    return u.email in status ? status[u.email] : u.aktif !== false;
}
function setAkunAktif(email, aktif) {
    const status = JSON.parse(localStorage.getItem('statusAkun') || '{}');
    status[email] = aktif;
    localStorage.setItem('statusAkun', JSON.stringify(status));
}

// p: { peminjam, oki, items: [{ barangId, nama, jumlah }], tglPinjam, tglKembali, keperluan }
function addPengajuan(p) {
    const stored = JSON.parse(localStorage.getItem('pengajuan') || '[]');
    stored.unshift({ ...p, id: Date.now(), status: 'Menunggu', diajukanPada: waktuLokal() });
    localStorage.setItem('pengajuan', JSON.stringify(stored));
}
