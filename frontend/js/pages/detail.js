const user = requireLogin('peminjam');
renderSidebar('peminjam', 'Riwayat');
renderTopbar(user);

const box = document.getElementById('detail');
const tracking = document.getElementById('tracking');
const aksi = document.getElementById('aksi');

const info = (label, isi, penuh) => `
  <div class="info${penuh ? ' full' : ''}"><small class="info-label">${label}</small><b>${isi}</b></div>`;

// Format informasi tanggal dan petugas pada timeline
const timelineMeta = (tanggal, petugas, label) => `
    <div class="timeline-meta">
        ${tanggal ? formatTanggalJam(tanggal) : 'Tanggal belum tercatat'}
        <br>
        ${label}: ${petugas || 'Belum tercatat'}
    </div>`;


// Membuat timeline berdasarkan status pengajuan
const buatTimeline = (p) => {
    const ditolak = p.status_tampil === 'Ditolak';
    const dibatalkan = p.status_tampil === 'Dibatalkan';
    const berhenti = ditolak || dibatalkan;   // alur berhenti di tahap kedua
 
    const diajukan = { judul: 'Diajukan', tanggal: p.tanggal_diajukan, petugas: p.nama_peminjam, label: 'Diajukan oleh' };
 
    const tahapan = ditolak
        ? [
            diajukan,
            { judul: 'Ditolak', tanggal: p.tanggal_verifikasi, petugas: p.diverifikasi_oleh, label: 'Ditolak oleh' },
            { judul: 'Dipinjam' },
            { judul: 'Dikembalikan' }
        ]
        : dibatalkan
        ? [
            diajukan,
            { judul: 'Dibatalkan', tanggal: null, petugas: p.nama_peminjam, label: 'Dibatalkan oleh' },
            { judul: 'Dipinjam' },
            { judul: 'Dikembalikan' }
        ]
        : [
            diajukan,
            { judul: 'Disetujui', tanggal: p.tanggal_verifikasi, petugas: p.diverifikasi_oleh, label: 'Disetujui oleh' },
            { judul: 'Dipinjam', tanggal: p.tanggal_serah_terima, petugas: p.diserahkan_oleh, label: 'Diserahkan oleh' },
            { judul: 'Dikembalikan', tanggal: p.tanggal_kembali_aktual, petugas: p.diterima_oleh, label: 'Diterima oleh' }
        ];
 
    const statusIndex = {
        'Menunggu Verifikasi': 0,
        'Disetujui': 1,
        'Dipinjam': 2,
        'Terlambat': 2,
        'Dikembalikan': 4      // semua tahap selesai
    };
 
    const tahapAktif = statusIndex[p.status_tampil] ?? 0;
 
    return `
        <div class="timeline">
            ${tahapan.map((t, i) => {
                let kelas = 'pending';
                let ikon = '<i class="bi bi-circle"></i>';
 
                if (berhenti && i === 0) {
                    kelas = 'completed';
                    ikon = '<i class="bi bi-check-lg"></i>';
                } else if (berhenti && i === 1) {
                    kelas = 'rejected';
                    ikon = '<i class="bi bi-x-lg"></i>';
                } else if (!berhenti && i < tahapAktif) {
                    kelas = 'completed';
                    ikon = '<i class="bi bi-check-lg"></i>';
                } else if (!berhenti && i === tahapAktif) {
                    kelas = 'current';
                    ikon = '<i class="bi bi-clock"></i>';
                }
 
                const sudahDilakukan = kelas !== 'pending';
 
                return `
                    <div class="timeline-item ${kelas}">
                        <div class="timeline-marker">${ikon}</div>
                        <div class="timeline-content">
                            <div class="timeline-title">${t.judul}</div>
                            ${sudahDilakukan
                                ? timelineMeta(t.tanggal, t.petugas, t.label)
                                : '<div class="timeline-meta">Belum dilakukan</div>'
                            }
                        </div>
                    </div>`;
            }).join('')}
        </div>
        ${ditolak ? `
            <div class="timeline-reason">
                  <b>Alasan Penolakan:</b><br>
                  ${esc(p.alasan_penolakan) || 'Tidak ada alasan yang dicatat.'}
            </div>
        ` : ''}
    `;
};
 
function tampilkanDetail(p, kondisiBarang) {
    document.getElementById('statusBadge').innerHTML = badge(p.status_tampil);
 
    // Kondisi & catatan per barang hanya ada setelah barang dikembalikan
    const daftarItem = p.barang.map(it => {
        const k = kondisiBarang[it.id_barang] || {};
        return `
      <li>
        <b>${esc(it.nama_barang)} ×${it.jumlah}</b>
        ${k.kondisi_kembali ? `<span class="kondisi ${k.kondisi_kembali === 'Baik' ? 'baik' : 'rusak'}">${esc(k.kondisi_kembali)}</span>` : ''}
        ${k.catatan ? `<small>${esc(k.catatan)}</small>` : ''}
      </li>`;
    }).join('');
 
    box.innerHTML = `
    <div class="detail-card">
      <div class="img">${ikonBarang(null)}</div>
      <div class="detail-info">
        <div class="info"><small class="info-label">Barang yang Dipinjam</small><ul class="item-list">${daftarItem}</ul></div>
        ${info('Peminjam', esc(p.nama_peminjam))}
        ${info('NIM', esc(p.nim || '-'))}
        ${info('OKI', esc(p.nama_oki || '-'))}
        ${info('Nama Kegiatan', esc(p.nama_kegiatan || '-'))}
        ${info('Tanggal Pinjam', formatTanggalJam(p.tanggal_pinjam))}
        ${info('Tanggal Kembali', formatTanggalJam(p.tanggal_kembali))}
        ${p.tanggal_kembali_aktual ? info('Dikembalikan Pada', formatTanggalJam(p.tanggal_kembali_aktual)) : ''}
        ${info('Diajukan Pada', p.tanggal_diajukan ? formatTanggal(p.tanggal_diajukan) : '-')}
        ${info('Keperluan', esc(p.keperluan || '-'), true)}
      </div>
    </div>`;
 
    tracking.innerHTML = `
        <h3>Tracking Proses</h3>
        ${buatTimeline(p)}
    `;
 
    // Tombol batalkan hanya muncul selama pengajuan masih menunggu verifikasi
    aksi.innerHTML = p.status_tampil === 'Menunggu Verifikasi'
        ? '<button type="button" class="btn btn-gray" id="btnBatal">Batalkan Pengajuan</button>'
        : '';
    const btnBatal = document.getElementById('btnBatal');
    if (btnBatal) btnBatal.addEventListener('click', () => batalkan(p.id_pengajuan, btnBatal));
}
 
async function batalkan(id, tombol) {
    if (!await konfirmasi('Batalkan pengajuan ini? Tindakan ini tidak bisa dibatalkan.', { judul: 'Batalkan Pengajuan', ya: 'Batalkan', bahaya: true })) return;
    tombol.disabled = true;
    try {
        await apiPost(`/api/pengajuan/${id}/batal`);
        await muat(id);   // ambil data terbaru supaya status dan timeline ikut berubah
    } catch (e) {
        toast(e.message, 'error');   // mis. "pengajuan sudah diproses admin"
        tombol.disabled = false;
    }
}
 
async function muat(id) {
    const p = await apiGet(`/api/pengajuan/${id}`);
 
    // Kondisi tiap barang ada di endpoint pengembalian; gagal di sini tidak boleh merusak halaman
    const kondisiBarang = {};
    if (p.status_tampil === 'Dikembalikan') {
        try {
            const kembali = await apiGet(`/api/pengajuan/${id}/pengembalian`);
            kembali.barang.forEach(b => { kondisiBarang[b.id_barang] = b; });
        } catch (e) { /* tampilkan detail tanpa kondisi */ }
    }
 
    tampilkanDetail(p, kondisiBarang);
}
 
async function mulai() {
    box.innerHTML = '<p>Memuat detail...</p>';
    try {
        let id = Number(new URLSearchParams(location.search).get('id'));
        if (!id) {
            // Tanpa ?id= (misal dari dashboard): tampilkan pengajuan terbaru
            const daftar = await apiGet('/api/pengajuan');
            if (!daftar.length) { box.innerHTML = '<p>Belum ada pengajuan.</p>'; return; }
            id = daftar[0].id_pengajuan;
        }
        await muat(id);
    } catch (e) {
        box.innerHTML = `<p>${esc(e.status === 404 ? 'Data tidak ditemukan.' : e.message)}</p>`;
    }
}
 
mulai();