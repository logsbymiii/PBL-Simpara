function renderTopbar(user) {
    document.getElementById('topbar').innerHTML = `
    <div class="topbar-left">
      <button class="menu-toggle" id="btnToggle" aria-label="Kecilkan sidebar">☰</button>
      <input type="text" placeholder="Cari...">
    </div>
    <div class="user">
      <div class="avatar">👤</div>
      <div><b>${user.nama}</b><br><small>${user.role === 'admin' ? 'Admin' : 'Peminjam'}</small></div>
    </div>`;

    document.getElementById('btnToggle').addEventListener('click', () => {
        const layout = document.querySelector('.layout');
        const kecil = layout.classList.toggle('collapsed');
        localStorage.setItem('sidebarKecil', kecil ? '1' : '0');
    });
}