const err = document.getElementById('error');
const formPeminjam = document.getElementById('formPeminjam');
const formAdmin = document.getElementById('formAdmin');

function tampilError(pesan) {
    err.textContent = pesan;
    err.style.display = 'block';
}

// Ganti tab Peminjam / Admin
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        err.style.display = 'none';

        const admin = tab.dataset.role === 'admin';
        formPeminjam.classList.toggle('hidden', admin);
        formAdmin.classList.toggle('hidden', !admin);
    });
});

// Ikon mata: lihat / sembunyikan password
document.querySelectorAll('.eye').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        input.type = input.type === 'password' ? 'text' : 'password';
    });
});

// Login peminjam
formPeminjam.addEventListener('submit', e => {
    e.preventDefault();
    const user = loginPeminjam(
        document.getElementById('nim').value.trim(),
        document.getElementById('email').value.trim(),
        document.getElementById('pwPeminjam').value
    );
    if (!user) return tampilError('NIM, email, atau password salah');
    if (!akunAktif(user)) {
        localStorage.removeItem('currentUser');
        return tampilError('Akun kamu dinonaktifkan admin. Hubungi pengurus HMTI.');
    }
    location.href = '../peminjam/dashboard.html';
});

// Login admin
formAdmin.addEventListener('submit', e => {
    e.preventDefault();
    const user = loginAdmin(
        document.getElementById('username').value.trim(),
        document.getElementById('pwAdmin').value
    );
    if (!user) return tampilError('Username atau password salah');
    location.href = '../admin/dashboard.html';
});