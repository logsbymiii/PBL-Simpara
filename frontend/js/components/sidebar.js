const MENU = {
    peminjam: [
        { label: 'Dashboard', href: 'dashboard.html', icon: '🏠' },
        { label: 'Barang', href: 'daftar-barang.html', icon: '📦' },
        { label: 'Pengajuan', href: 'form-pengajuan.html', icon: '📝' },
        { label: 'Riwayat', href: 'riwayat.html', icon: '🕘' },
        { label: 'Profil', href: 'profil.html', icon: '👤' },
    ],
    admin: [
        { label: 'Dashboard', href: 'dashboard.html', icon: '🏠' },
        { label: 'Barang', href: 'data-barang.html', icon: '📦' },
        { label: 'Pengajuan', href: 'pengajuan.html', icon: '📝' },
        { label: 'Kalender', href: 'kalender.html', icon: '📅' },
        { label: 'Verifikasi', href: 'verifikasi.html', icon: '✅' },
        { label: 'Laporan', href: 'laporan.html', icon: '📄' },
        { label: 'Profil', href: 'profil.html', icon: '👤' },
    ],
};

function renderSidebar(role, active) {
    if (localStorage.getItem('sidebarKecil') === '1') {
        document.querySelector('.layout').classList.add('collapsed');
    }
    
    const links = MENU[role].map(m => `
    <a href="${m.href}" class="${m.label === active ? 'active' : ''}" title="${m.label}">
      <span>${m.icon}</span><span class="text">${m.label}</span>
    </a>`).join('');

    document.getElementById('sidebar').innerHTML = `
    <div>
      <div class="brand"><img src="../../assets/images/logo-hmti.png" alt="Logo HMTI"><span class="text">SIMPARA</span></div>
      <nav class="menu">${links}</nav>
    </div>
    <a href="#" class="logout" id="btnLogout"><span>↩️</span><span class="text">Keluar</span></a>`;

    document.getElementById('btnLogout').addEventListener('click', e => {
        e.preventDefault();
        logout();
    });
}