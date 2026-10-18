const user = requireLogin();
renderSidebar(user.role, 'Profil');
renderTopbar(user);

document.getElementById('nama').value = user.nama;
document.getElementById('nim').value = user.nim || user.username || '-';  // admin tidak punya NIM
document.getElementById('email').value = user.email;

document.getElementById('formPassword').addEventListener('submit', e => {
    e.preventDefault();
    const lama = document.getElementById('lama').value;
    const baru = document.getElementById('baru').value;
    const konfirmasi = document.getElementById('konfirmasi').value;

    if (lama !== user.password) return alert('Password lama salah');
    if (baru.length < 6) return alert('Password baru minimal 6 karakter');
    if (baru !== konfirmasi) return alert('Konfirmasi password tidak cocok');

    user.password = baru;
    localStorage.setItem('currentUser', JSON.stringify(user));

    // Update juga di daftar akun hasil register (akun dummy tidak berubah)
    const stored = JSON.parse(localStorage.getItem('users') || '[]');
    const idx = stored.findIndex(u => u.email === user.email);
    if (idx !== -1) {
        stored[idx].password = baru;
        localStorage.setItem('users', JSON.stringify(stored));
    }

    alert('Password berhasil diubah');
    e.target.reset();
});