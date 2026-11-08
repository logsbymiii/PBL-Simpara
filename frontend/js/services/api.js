// Di Vercel: lewat alamat sendiri (rewrite), supaya cookie sesi satu situs.
// Di localhost: langsung ke backend.
const API_BASE_URL = location.hostname.endsWith('vercel.app')
    ? ''
    : 'https://simpara.76.13.21.60.sslip.io';
// Error khusus supaya halaman bisa membaca status dan detail validasi dari server
class ApiError extends Error {
    constructor(message, status, errors) {
        super(message);
        this.name = 'ApiError';
        this.status = status;       // 0 = gagal konek, 401 = belum login, 422 = input salah, dst.
        this.errors = errors || null; // detail per kolom dari server, mis. { password: '...' }
    }
}
 
// Arahkan ke halaman login saat sesi habis (hanya dari halaman di folder /pages/)
function redirectKeLogin() {
    const path = location.pathname;
    if (!path.includes('/pages/')) return;                       // landing: tidak perlu
    if (path.includes('/pages/auth/')) return;                   // sudah di login/daftar
    localStorage.removeItem('currentUser');                      // buang sisa sesi lama
    location.href = path.split('/pages/')[0] + '/pages/auth/login.html';
}
 
// Fungsi inti: semua request lewat sini
async function apiRequest(method, path, body) {
    const opsi = {
        method,
        credentials: 'include',   // WAJIB: supaya cookie sesi ikut terkirim dan diterima
        headers: {},
    };
    if (body !== undefined) {
        opsi.headers['Content-Type'] = 'application/json';
        opsi.body = JSON.stringify(body);
    }
 
    let res;
    try {
        res = await fetch(API_BASE_URL + path, opsi);
    } catch (e) {
        // server mati, alamat salah, atau diblok CORS
        throw new ApiError('Tidak bisa terhubung ke server. Pastikan back-end sudah berjalan.', 0);
    }
 
    // Respons normal selalu JSON; kalau bukan (mis. server error mentah), json tetap null
    let json = null;
    try { json = await res.json(); } catch (e) { /* abaikan */ }
 
    if (!res.ok || !json || json.success === false) {
        const pesan = (json && json.message) || 'Terjadi kesalahan pada server';
        // 401 di endpoint login artinya password salah, bukan sesi habis
        if (res.status === 401 && path !== '/api/auth/login') redirectKeLogin();
        throw new ApiError(pesan, res.status, json && json.errors);
    }
    return json.data;   // bentuk respons server: { success, message, data }
}
 
// Ubah objek { a: 1, b: '' } jadi "?a=1" (nilai kosong dilewati)
function buatQuery(params) {
    if (!params) return '';
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') q.append(k, v);
    });
    const s = q.toString();
    return s ? '?' + s : '';
}
 
const apiGet    = (path, params) => apiRequest('GET', path + buatQuery(params));
const apiPost   = (path, body)   => apiRequest('POST', path, body ?? {});
const apiPut    = (path, body)   => apiRequest('PUT', path, body ?? {});
const apiDelete = (path)         => apiRequest('DELETE', path);