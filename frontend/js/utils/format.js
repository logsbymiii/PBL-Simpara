function formatTanggal(str) {
  return new Date(str).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// '2026-09-21T10:15' -> '21 Sep 2026, 10:15' (tanpa jam kalau datanya hanya tanggal)
function formatTanggalJam(str) {
  if (!str) return '-';
  str = String(str).replace(' ', 'T');
  if (!str.includes('T')) return formatTanggal(str);
  return `${formatTanggal(str)}, ${str.slice(11, 16)}`;
}

// Ringkasan barang untuk tabel: 'Proyektor Epson +2 lainnya'
function ringkasBarang(p) {
  const items = p.items || [];
  if (!items.length) return p.barang || '-';
  return items.length > 1 ? `${items[0].nama} +${items.length - 1} lainnya` : items[0].nama;
}

// Mengubah karakter HTML jadi teks biasa sebelum dimasukkan lewat innerHTML
function esc(teks) {
  return String(teks ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
// Kotak kerangka sebagai pengganti tulisan "Memuat..." (n kartu)
function skeletonKartu(n = 8) {
    return Array.from({ length: n }, () => `
    <div class="item skeleton">
      <div class="img"></div>
      <div class="sk-baris"></div>
      <div class="sk-baris pendek"></div>
    </div>`).join('');
}

// Katalog barang: 12 kartu per halaman (4 x 3 di desktop, 3 kolom tablet, 2 kolom HP)
const PER_HALAMAN = 12;   // katalog: 4 kolom x 3 baris di desktop

// Potong 'daftar' untuk halaman ke-'halaman' dan gambar tombol Sebelumnya/Berikutnya di 'wadah'.
// pindah(n) dipanggil saat tombol diklik. Hasil: { isi, halaman } (halaman sudah dibatasi 1..total).
function paginasi(daftar, halaman, wadah, pindah) {
    const total = Math.max(1, Math.ceil(daftar.length / PER_HALAMAN));
    const h = Math.min(Math.max(1, halaman), total);

    wadah.innerHTML = total > 1 ? `
    <button type="button" class="btn btn-gray btn-sm" data-arah="-1" ${h === 1 ? 'disabled' : ''}><i class="bi bi-chevron-left"></i> Sebelumnya</button>
    <span>Halaman ${h} dari ${total}</span>
    <button type="button" class="btn btn-gray btn-sm" data-arah="1" ${h === total ? 'disabled' : ''}>Berikutnya <i class="bi bi-chevron-right"></i></button>` : '';
    wadah.onclick = e => {
        const btn = e.target.closest('button[data-arah]');
        if (btn) pindah(h + Number(btn.dataset.arah));
    };

    return { isi: daftar.slice((h - 1) * PER_HALAMAN, h * PER_HALAMAN), halaman: h };
}
// Angka di kartu statistik menghitung naik dari 0 saat nilainya terisi dari API
(function () {
    const hitungNaik = (el, target) => {
        if (target < 1 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const mulai = performance.now();
        const durasi = 700;
        el.dataset.anim = '1';
        const langkah = (t) => {
            const p = Math.min((t - mulai) / durasi, 1);
            el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
            if (p < 1) {
                requestAnimationFrame(langkah);
            } else {
                setTimeout(() => { delete el.dataset.anim; }, 0);
            }
        };
        requestAnimationFrame(langkah);
    };

    document.querySelectorAll('.stat .num').forEach(el => {
        new MutationObserver(() => {
            if (el.dataset.anim) return;
            const n = Number(el.textContent);
            if (Number.isInteger(n)) hitungNaik(el, n);
        }).observe(el, { childList: true, characterData: true, subtree: true });
    });
})();