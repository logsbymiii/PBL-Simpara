const MENU = {
    peminjam: [
        { label: 'Dashboard', href: 'dashboard.html', icon: 'bi-house' },
        { label: 'Barang', href: 'daftar-barang.html', icon: 'bi-box-seam' },
        { label: 'Pengajuan', href: 'form-pengajuan.html', icon: 'bi-file-earmark-text' },
        { label: 'Riwayat', href: 'riwayat.html', icon: 'bi-clock-history' },
        { label: 'Profil', href: 'profil.html', icon: 'bi-person' },
    ],
    admin: [
        { label: 'Dashboard', href: 'dashboard.html', icon: 'bi-house' },
        { label: 'Barang', href: 'data-barang.html', icon: 'bi-box-seam' },
        { label: 'Pengajuan', href: 'pengajuan.html', icon: 'bi-file-earmark-text' },
        { label: 'Kalender', href: 'kalender.html', icon: 'bi-calendar3' },
        { label: 'Verifikasi', href: 'verifikasi.html', icon: 'bi-check-circle' },
        { label: 'Pengembalian', href: 'pengembalian.html', icon: 'bi-box-arrow-in-left' },
        { label: 'Laporan', href: 'laporan.html', icon: 'bi-file-earmark-bar-graph' },
        { label: 'Pengguna', href: 'pengguna.html', icon: 'bi-people' },
        { label: 'Profil', href: 'profil.html', icon: 'bi-person' },
    ],
};

function renderSidebar(role, active) {
    const layout = document.querySelector('.layout');
    layout.classList.add(`role-${role}`);

    // Mode sidebar kecil hanya untuk desktop; di mobile sidebar jadi drawer / bottom nav
    const mobile = window.matchMedia('(max-width: 768px)').matches;
    if (!mobile && localStorage.getItem('sidebarKecil') === '1') {
        layout.classList.add('collapsed');
    }

    // Latar gelap di belakang drawer (mobile), klik untuk menutup
    layout.insertAdjacentHTML('beforeend', '<div class="drawer-backdrop" id="drawerBackdrop"></div>');
    document.getElementById('drawerBackdrop').addEventListener('click', () => layout.classList.remove('drawer-open'));

    const links = MENU[role].map(m => `
    <a href="${m.href}" class="${m.label === active ? 'active' : ''}" title="${m.label}">
      <i class="bi ${m.icon}"></i><span class="text">${m.label}</span>
    </a>`).join('');

    document.getElementById('sidebar').innerHTML = `
    <div>
      <div class="brand"><img src="../../assets/images/logo-hmti.png" alt="Logo HMTI"><span class="text">SIMPARA</span></div>
      <nav class="menu">${links}</nav>
    </div>
    <a href="#" class="logout" id="btnLogout"><i class="bi bi-box-arrow-right"></i><span class="text">Keluar</span></a>`;

    document.getElementById('btnLogout').addEventListener('click', e => {
        e.preventDefault();
        logout();
    });
}