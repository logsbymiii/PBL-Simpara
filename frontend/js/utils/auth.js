function getAllUsers() {
    const stored = JSON.parse(localStorage.getItem('users') || '[]');
    return [...DUMMY_USERS, ...stored];
}

function registerUser(user) {
    const stored = JSON.parse(localStorage.getItem('users') || '[]');
    stored.push({ ...user, role: 'peminjam' });
    localStorage.setItem('users', JSON.stringify(stored));
}

function simpanSesi(user) {
    if (user) localStorage.setItem('currentUser', JSON.stringify(user));
    return user || null;
}

// Login lewat API. Server membuat sesi (cookie), salinan user disimpan untuk halaman lain.
async function loginPeminjam(idOki, password) {
    const user = await apiPost('/api/auth/login', { role: 'peminjam', id_oki: Number(idOki), password });
    return simpanSesi(user);
}

async function loginAdmin(username, password) {
    const user = await apiPost('/api/auth/login', { role: 'admin', username, password });
    return simpanSesi(user);
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser') || 'null');
}

// Panggil di halaman yang butuh login
function requireLogin(role) {
    const user = getCurrentUser();
    if (!user || (role && user.role !== role)) location.href = '../auth/login.html';
    return user;
}

async function logout() {
    // api.js baru ada di halaman yang sudah disambungkan; di halaman lain cukup hapus salinan lokal
    if (typeof apiPost === 'function') {
        try { await apiPost('/api/auth/logout'); } catch (e) { /* tetap keluar */ }
    }
    localStorage.removeItem('currentUser');
    if (typeof toastNanti === 'function') toastNanti('Berhasil keluar', 'info');
    location.href = '../auth/login.html';
}