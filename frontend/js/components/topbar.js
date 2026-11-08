function renderTopbar(user) {
    const judul = document.title.split('|')[0].trim();
    const peran = user.role === 'admin' ? 'Admin' : 'Peminjam';

    document.getElementById('topbar').innerHTML = `
    <div class="topbar-left">
      <button class="menu-toggle" id="btnToggle" aria-label="Kecilkan sidebar"><i class="bi bi-list"></i></button>
      <span class="topbar-title">${esc(judul)}</span>
    </div>
    <div class="user">
      <div class="avatar"><i class="bi bi-person-circle"></i></div>
      <div class="user-info"><b>${esc(user.nama || peran)}</b><small>${peran}</small></div>
    </div>`;

    document.getElementById('btnToggle').addEventListener('click', () => {
        const layout = document.querySelector('.layout');
        const kecil = layout.classList.toggle('collapsed');
        localStorage.setItem('sidebarKecil', kecil ? '1' : '0');
    });
}