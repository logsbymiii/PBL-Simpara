document.getElementById('formDaftar').addEventListener('submit', e => {
  e.preventDefault();
  const nama = document.getElementById('nama').value.trim();
  const nim = document.getElementById('nim').value.trim();
  const email = document.getElementById('email').value.trim();
  const oki = document.getElementById('oki').value.trim();
  const password = document.getElementById('password').value;
  const err = document.getElementById('error');

  if (password.length < 6) {
    err.textContent = 'Password minimal 6 karakter';
    err.style.display = 'block';
    return;
  }
  if (getAllUsers().some(u => u.email === email)) {
    err.textContent = 'Email sudah terdaftar';
    err.style.display = 'block';
    return;
  }

  registerUser({ nama, nim, email, password, oki });
  alert('Pendaftaran berhasil! Silakan masuk.');
  location.href = 'login.html';
});

// Ikon mata: lihat / sembunyikan password
document.querySelectorAll('.eye').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    input.type = input.type === 'password' ? 'text' : 'password';
  });
});
