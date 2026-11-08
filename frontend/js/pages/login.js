const err = document.getElementById('error');
const formPeminjam = document.getElementById('formPeminjam');
const formAdmin = document.getElementById('formAdmin');
const selectOki = document.getElementById('oki');

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

// Isi pilihan OKI dari server (GET /api/oki, endpoint publik)
async function muatOki() {
    try {
        const daftar = await apiGet('/api/oki');
        selectOki.innerHTML = '';
        selectOki.add(new Option('Pilih OKI', ''));
        daftar.forEach(o => selectOki.add(new Option(o.nama_oki, o.id_oki)));  // Option memakai textContent, aman dari HTML
    } catch (e) {
        tampilError(e.message);
    }
}
 
// Kirim form: matikan tombol saat menunggu, tampilkan pesan dari server kalau gagal
async function kirim(form, aksi, tujuan) {
    const tombol = form.querySelector('button[type="submit"]');
    tombol.disabled = true;
    err.style.display = 'none';
    try {
        await aksi();
        location.href = tujuan;
    } catch (e) {
        tampilError(e.message);
        tombol.disabled = false;
    }
}
 
// Login peminjam (akun OKI)
formPeminjam.addEventListener('submit', e => {
    e.preventDefault();
    kirim(
        formPeminjam,
        () => loginPeminjam(selectOki.value, document.getElementById('pwPeminjam').value),
        '../peminjam/dashboard.html'
    );
});
 
// Login admin
formAdmin.addEventListener('submit', e => {
    e.preventDefault();
    kirim(
        formAdmin,
        () => loginAdmin(document.getElementById('username').value.trim(), document.getElementById('pwAdmin').value),
        '../admin/dashboard.html'
    );
});
 
muatOki();
