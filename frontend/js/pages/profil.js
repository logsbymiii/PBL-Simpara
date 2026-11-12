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
        isi('email', akun.email);
    } catch (e) {
        if (info) info.textContent = e.message;
    }
}

// Ubah password (peminjam dan admin)
const formPassword = document.getElementById('formPassword');
if (formPassword) {
    formPassword.addEventListener('submit', async e => {
        e.preventDefault();
        const lama = document.getElementById('lama').value;
        const baru = document.getElementById('baru').value;
        const konfirmasi = document.getElementById('konfirmasi').value;

        if (baru.length < 6) {
            toast('Password baru minimal 6 karakter', 'error');
            return;
        }
        if (baru !== konfirmasi) {
            toast('Konfirmasi password baru tidak sama', 'error');
            return;
        }
        if (baru === lama) {
            toast('Password baru harus berbeda dari password lama', 'error');
            return;
        }

        const tombol = formPassword.querySelector('button[type="submit"]');
        tombol.disabled = true;
        try {
            await apiPost('/api/auth/ubah-password', { password_lama: lama, password_baru: baru });
            toast('Password berhasil diubah', 'success');
            formPassword.reset();
        } catch (err) {
            const detail = err.errors ? Object.values(err.errors)[0] : null;
            toast(detail || err.message, 'error');   // mis. "Password lama salah"
        } finally {
            tombol.disabled = false;
        }
    });
}

muat();