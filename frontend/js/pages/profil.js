const user = requireLogin();
renderSidebar(user.role, 'Profil');
renderTopbar(user);

// Isi kolom kalau elemennya ada di halaman ini; nilai kosong tampil sebagai '-'
function isi(id, nilai) {
    const el = document.getElementById(id);
    if (el) el.value = nilai || '-';
}

async function muat() {
    const info = document.getElementById('infoProfil');
    try {
        const akun = await apiGet('/api/auth/me');   // data terbaru dari sesi di server
        isi('nama', akun.nama);
        isi('username', akun.username);
        isi('jabatan', akun.jabatan);
        isi('oki', akun.nama_oki);
    } catch (e) {
        if (info) info.textContent = e.message;
    }
}

muat();