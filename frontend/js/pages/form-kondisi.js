const user = requireLogin('admin');
renderSidebar('admin', 'Pengembalian');
renderTopbar(user);

const id = Number(new URLSearchParams(location.search).get('id'));
const p = getAllPengajuan().find(x => x.id === id && x.status === 'Dipinjam');
const form = document.getElementById('formKondisi');
const KONDISI = ['Baik', 'Rusak', 'Hilang'];

const info = (label, isi) => `<div class="info"><small class="info-label">${label}</small><b>${isi}</b></div>`;

// A5: foto bukti pengembalian (maks. 3), disimpan sebagai data URL yang sudah dikecilkan
const MAKS_FOTO = 3;
let fotoBukti = [];   // { nama, data }
const fotoGrid = document.getElementById('fotoGrid');
const fotoInput = document.getElementById('fotoInput');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function kecilkanFoto(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                const skala = Math.min(1, 800 / Math.max(img.width, img.height));
                const c = document.createElement('canvas');
                c.width = Math.round(img.width * skala);
                c.height = Math.round(img.height * skala);
                const ctx = c.getContext('2d');
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, c.width, c.height);
                ctx.drawImage(img, 0, 0, c.width, c.height);
                resolve(c.toDataURL('image/jpeg', 0.7));
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

function renderFoto() {
    fotoGrid.innerHTML = Array.from({ length: MAKS_FOTO }, (_, i) => {
        const f = fotoBukti[i];
        return f ? `
        <div class="foto-slot terisi">
          <img src="${f.data}" alt="${esc(f.nama)}">
          <span class="foto-nama">${esc(f.nama)}</span>
          <button type="button" class="link-btn foto-hapus" data-i="${i}">Hapus</button>
        </div>` : `
        <button type="button" class="foto-slot foto-tambah"><i class="bi bi-upload"></i><span>Unggah foto</span></button>`;
    }).join('');
}

if (p) {
    renderFoto();
    fotoGrid.addEventListener('click', e => {
        if (e.target.closest('.foto-tambah')) fotoInput.click();
        const hapus = e.target.closest('.foto-hapus');
        if (hapus) {
            fotoBukti.splice(Number(hapus.dataset.i), 1);
            renderFoto();
        }
    });
    fotoInput.addEventListener('change', async () => {
        const file = fotoInput.files[0];
        fotoInput.value = '';
        if (!file || fotoBukti.length >= MAKS_FOTO) return;
        if (!['image/jpeg', 'image/png'].includes(file.type)) {
            alert('Format foto harus JPG atau PNG.');
            return;
        }
        try {
            fotoBukti.push({ nama: file.name, data: await kecilkanFoto(file) });
            renderFoto();
        } catch {
            alert('Foto tidak bisa dibaca, coba file lain.');
        }
    });
}

if (!p) {
    form.innerHTML = '<p>Data peminjaman tidak ditemukan atau barang sudah dikembalikan.</p>';
} else {
    document.getElementById('statusBadge').innerHTML = badge(p.status);
    document.getElementById('infoPinjam').innerHTML =
        info('Peminjam', p.peminjam) + info('Dipinjam', formatTanggal(p.tglPinjam)) + info('Kembali (rencana)', formatTanggal(p.tglKembali));

    document.getElementById('tabel').innerHTML = p.items.map((it, i) => `
    <tr>
      <td>${it.nama}</td>
      <td>${it.jumlah}</td>
      <td><select data-i="${i}" class="kondisi-pilih">${KONDISI.map(k => `<option>${k}</option>`).join('')}</select></td>
      <td><input type="text" data-i="${i}" class="catatan-isi" placeholder="Catatan (opsional)"></td>
    </tr>`).join('');

    form.addEventListener('submit', e => {
        e.preventDefault();
        const items = p.items.map((it, i) => {
            const kondisi = form.querySelector(`.kondisi-pilih[data-i="${i}"]`).value;
            const catatan = form.querySelector(`.catatan-isi[data-i="${i}"]`).value.trim();
            return { ...it, kondisi, ...(catatan ? { catatan } : {}) };
        });

        // A5: foto bukti wajib kalau ada barang Rusak/Hilang
        if (items.some(it => it.kondisi !== 'Baik') && !fotoBukti.length) {
            alert('Unggah minimal 1 foto bukti karena ada barang berkondisi Rusak atau Hilang.');
            return;
        }

        // Barang rusak/hilang ikut diperbarui kondisinya di data barang
        const rusak = items.filter(it => it.barangId && it.kondisi !== 'Baik');
        if (rusak.length) {
            saveBarang(getAllBarang().map(b => {
                const r = rusak.find(it => it.barangId === b.id);
                return r ? { ...b, kondisi: r.kondisi } : b;
            }));
        }

        updatePengajuan(p.id, { status: 'Dikembalikan', items, dikembalikanPada: waktuLokal(), fotoBukti });
        location.href = 'pengembalian.html';
    });
}
