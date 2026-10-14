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

function loginPeminjam(nim, email, password) {
    const user = getAllUsers().find(u =>
        u.role === 'peminjam' && u.nim === nim && u.email === email && u.password === password
    );
    return simpanSesi(user);
}

function loginAdmin(username, password) {
    const user = getAllUsers().find(u =>
        u.role === 'admin' && u.username === username && u.password === password
    );
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

function logout() {
    localStorage.removeItem('currentUser');
    location.href = '../auth/login.html';
}