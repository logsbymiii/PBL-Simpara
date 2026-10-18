function renderTopbar(user) {
    document.getElementById('topbar').innerHTML = `
    <div class="topbar-left">
      <button class="menu-toggle" id="btnToggle" aria-label="Kecilkan sidebar"><i class="bi bi-list"></i></button>
      <input type="text" placeholder="Cari...">
    </div>
    <div class="user">
      <div class="avatar"><i class="bi bi-person-circle"></i></div>
      <div><b>${user.nama}</b><br><small>${user.role === 'admin' ? 'Admin' : (user.oki || 'Peminjam')}</small></div>
    </div>`;

    document.getElementById('btnToggle').addEventListener('click', () => {
        const layout = document.querySelector('.layout');
        const kecil = layout.classList.toggle('collapsed');
        localStorage.setItem('sidebarKecil', kecil ? '1' : '0');
    });
}