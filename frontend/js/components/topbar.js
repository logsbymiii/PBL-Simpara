function renderTopbar(user) {
    const judul = document.title.split('|')[0].trim();
    // Admin dibedakan lewat 'level' (admin / super_admin) yang dikirim server saat login
    const peran = user.role !== 'admin' ? 'Peminjam'
        : user.level === 'super_admin' ? 'Super Admin' : 'Admin';
    const nama = esc(user.nama || peran);

    document.getElementById('topbar').innerHTML = `
    <div class="topbar-left">
      <button class="menu-toggle" id="btnToggle" aria-label="Menu"><i class="bi bi-list"></i></button>
      <span class="topbar-title">${esc(judul)}</span>
    </div>
    <div class="user">
      <button type="button" class="user-btn" id="btnAkun" aria-haspopup="true" aria-expanded="false" aria-controls="menuAkun" aria-label="Menu akun">
        <span class="avatar"><i class="bi bi-person-circle"></i></span>
        <span class="user-info"><b>${nama}</b><small>${peran}</small></span>
        <i class="bi bi-chevron-down user-caret"></i>
      </button>
      <div class="user-menu" id="menuAkun" hidden>
        <div class="user-menu-info"><b>${nama}</b><small>${peran}</small></div>
        <a href="profil.html"><i class="bi bi-person"></i> Profil</a>
        <button type="button" id="btnKeluarMenu"><i class="bi bi-box-arrow-right"></i> Keluar</button>
      </div>
    </div>`;

    document.getElementById('btnToggle').addEventListener('click', () => {
        const layout = document.querySelector('.layout');
        if (window.matchMedia('(max-width: 768px)').matches) {
            layout.classList.toggle('drawer-open');   // mobile: buka/tutup drawer
            return;
        }
        const kecil = layout.classList.toggle('collapsed');
        localStorage.setItem('sidebarKecil', kecil ? '1' : '0');
    });

    // Dropdown akun: buka/tutup dengan klik atau sentuh, tutup saat klik di luar atau Esc
    const btnAkun = document.getElementById('btnAkun');
    const menuAkun = document.getElementById('menuAkun');
    const aturMenu = buka => {
        menuAkun.hidden = !buka;
        btnAkun.setAttribute('aria-expanded', String(buka));
    };
    btnAkun.addEventListener('click', e => {
        e.stopPropagation();
        aturMenu(menuAkun.hidden);
    });
    document.addEventListener('click', e => {
        if (!menuAkun.hidden && !menuAkun.contains(e.target)) aturMenu(false);
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !menuAkun.hidden) {
            aturMenu(false);
            btnAkun.focus();
        }
    });

    document.getElementById('btnKeluarMenu').addEventListener('click', () => logout());
}