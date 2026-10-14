document.getElementById('formDaftar').addEventListener('submit', e => {
  e.preventDefault();
  const nim = document.getElementById('nim').value.trim();
  const email = document.getElementById('email').value.trim();
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

  registerUser({ nama: email.split('@')[0], nim, email, password });
  alert('Pendaftaran berhasil! Silakan masuk.');
  location.href = 'login.html';
});