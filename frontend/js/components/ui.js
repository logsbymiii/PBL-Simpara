// Komponen UI kecil: toast (pesan singkat) dan konfirmasi (pengganti confirm()).
(function () {
    const KUNCI = 'flashToast';

    function wadahToast() {
        let w = document.getElementById('toastWadah');
        if (!w) {
            w = document.createElement('div');
            w.id = 'toastWadah';
            w.setAttribute('aria-live', 'polite');
            document.body.appendChild(w);
        }
        return w;
    }

    // toast('Pesan', 'success' | 'error' | 'info')
    window.toast = function (pesan, tipe = 'info') {
        const ikon = { success: 'bi-check-circle-fill', error: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' }[tipe] || 'bi-info-circle-fill';
        const el = document.createElement('div');
        el.className = `toast toast-${tipe}`;
        el.setAttribute('role', tipe === 'error' ? 'alert' : 'status');
        el.innerHTML = `<i class="bi ${ikon}"></i><span></span>`;
        el.querySelector('span').textContent = pesan;   // textContent: aman dari XSS
        wadahToast().appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
        const tutup = () => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); };
        setTimeout(tutup, tipe === 'error' ? 6000 : 3500);
        el.addEventListener('click', tutup);
    };

    // Toast yang baru muncul di halaman berikutnya (dipakai sebelum redirect)
    window.toastNanti = function (pesan, tipe = 'success') {
        try { sessionStorage.setItem(KUNCI, JSON.stringify({ pesan, tipe })); } catch (e) { /* abaikan */ }
    };

    // const ok = await konfirmasi('Yakin?', { judul, ya, batal, bahaya })
    window.konfirmasi = function (pesan, opsi = {}) {
        const { judul = 'Konfirmasi', ya = 'Ya', batal = 'Batal', bahaya = false } = opsi;
        return new Promise(selesai => {
            const m = document.createElement('div');
            m.className = 'modal show';
            m.innerHTML = `
        <div class="modal-box" role="dialog" aria-modal="true">
          <h3></h3>
          <p class="konfirmasi-isi"></p>
          <div class="actions">
            <button type="button" class="btn btn-gray"></button>
            <button type="button" class="btn ${bahaya ? 'btn-red' : 'btn-yellow'}"></button>
          </div>
        </div>`;
            m.querySelector('h3').textContent = judul;
            m.querySelector('.konfirmasi-isi').textContent = pesan;
            const [bBatal, bYa] = m.querySelectorAll('button');
            bBatal.textContent = batal;
            bYa.textContent = ya;

            const tombol = e => { if (e.key === 'Escape') tutup(false); };
            const tutup = hasil => {
                document.removeEventListener('keydown', tombol);
                m.remove();
                selesai(hasil);
            };
            m.addEventListener('click', e => { if (e.target === m) tutup(false); });
            bBatal.addEventListener('click', () => tutup(false));
            bYa.addEventListener('click', () => tutup(true));
            document.addEventListener('keydown', tombol);
            document.body.appendChild(m);
            bYa.focus();
        });
    };

    // Tampilkan toast kiriman halaman sebelumnya
    document.addEventListener('DOMContentLoaded', () => {
        try {
            const d = sessionStorage.getItem(KUNCI);
            if (!d) return;
            sessionStorage.removeItem(KUNCI);
            const { pesan, tipe } = JSON.parse(d);
            toast(pesan, tipe);
        } catch (e) { /* abaikan */ }
    });
})();