const err = document.getElementById('error');

function tampilError(pesan) {
  err.textContent = pesan;
  err.style.display = 'block';
  toast(pesan, 'error');
}

document.getElementById('formDaftar').addEventListener('submit', async e => {
  e.preventDefault();
  err.style.display = 'none';

  const oki = document.getElementById('oki').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (password.length < 6) {
    tampilError('Password minimal 6 karakter');
    return;
  }

  const tombol = e.target.querySelector('button[type="submit"]');
  if (tombol) tombol.disabled = true;
  try {
    await apiPost('/api/auth/register', { oki, email, password });
    toastNanti('Pendaftaran berhasil! Silakan masuk.');
    location.href = 'login.html';
  } catch (ex) {
    const detail = ex.errors ? Object.values(ex.errors)[0] : null;
    tampilError(detail || ex.message || 'Pendaftaran gagal');
  } finally {
    if (tombol) tombol.disabled = false;
  }
});

// Ikon mata: lihat / sembunyikan password
document.querySelectorAll('.eye').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    input.type = input.type === 'password' ? 'text' : 'password';
  });
});