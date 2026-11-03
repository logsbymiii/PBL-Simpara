const user = requireLogin('peminjam');
renderSidebar('peminjam', 'Riwayat');
renderTopbar(user);

const id = Number(new URLSearchParams(location.search).get('id'));
const mine = getAllPengajuan().filter(p => p.peminjam === user.nama);
// Kalau tidak ada ?id= (misal dari dashboard), tampilkan pengajuan terbaru
const p = mine.find(x => x.id === id) || mine[0];
const box = document.getElementById('detail');

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
    const ditolak = p.status === 'Ditolak';

    const tahapan = ditolak
        ? [
            {
                judul: 'Diajukan',
                tanggal: p.diajukanPada,
                petugas: p.peminjam,
                label: 'Diajukan oleh'
            },
            {
                judul: 'Ditolak',
                tanggal: p.ditolakPada,
                petugas: p.ditolakOleh,
                label: 'Ditolak oleh'
            },
            { judul: 'Dipinjam' },
            { judul: 'Dikembalikan' }
        ]
        : [
            {
                judul: 'Diajukan',
                tanggal: p.diajukanPada,
                petugas: p.peminjam,
                label: 'Diajukan oleh'
            },
            {
                judul: 'Disetujui',
                tanggal: p.disetujuiPada,
                petugas: p.disetujuiOleh,
                label: 'Disetujui oleh'
            },
            {
                judul: 'Dipinjam',
                tanggal: p.diserahkanPada,
                petugas: p.diserahkanOleh,
                label: 'Diserahkan oleh'
            },
            {
                judul: 'Dikembalikan',
                tanggal: p.dikembalikanPada,
                petugas: p.diterimaOleh,
                label: 'Diterima oleh'
            }
        ];

    const statusIndex = {
        'Menunggu': 0,
        'Menunggu Verifikasi': 0,
        'Disetujui': 1,
        'Dipinjam': 2,
        'Terlambat': 2,
        'Dikembalikan': 3
    };

    const tahapAktif = statusIndex[p.status] ?? 0;

    return `
        <div class="timeline">
            ${tahapan.map((t, i) => {
                let kelas = 'pending';
                let ikon = '<i class="bi bi-circle"></i>';

                if (ditolak && i === 0) {
                    kelas = 'completed';
                    ikon = '<i class="bi bi-check-lg"></i>';
                } else if (ditolak && i === 1) {
                    kelas = 'rejected';
                    ikon = '<i class="bi bi-x-lg"></i>';
                } else if (!ditolak && i < tahapAktif) {
                    kelas = 'completed';
                    ikon = '<i class="bi bi-check-lg"></i>';
                } else if (!ditolak && i === tahapAktif) {
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
                  ${p.alasanTolak || 'Tidak ada alasan yang dicatat.'}
            </div>
        ` : ''}
    `;
};

if (!p) {
    box.innerHTML = '<p>Data tidak ditemukan.</p>';
} else {
    document.getElementById('statusBadge').innerHTML = badge(p.status);

    const pertama = (p.items[0] || {}).nama || '';
    const icon = (DUMMY_BARANG.find(b => pertama.includes(b.nama)) || {}).icon;

    // Kondisi & catatan per barang hanya ada setelah barang dikembalikan
    const daftarItem = p.items.map(it => `
      <li>
        <b>${it.nama} ×${it.jumlah}</b>
        ${it.kondisi ? `<span class="kondisi ${it.kondisi === 'Baik' ? 'baik' : 'rusak'}">${it.kondisi}</span>` : ''}
        ${it.catatan ? `<small>${it.catatan}</small>` : ''}
      </li>`).join('');

    box.innerHTML = `
    <div class="detail-card">
      <div class="img">${ikonBarang(icon)}</div>
      <div class="detail-info">
        <div class="info"><small class="info-label">Barang yang Dipinjam</small><ul class="item-list">${daftarItem}</ul></div>
        ${info('Peminjam', p.peminjam)}
        ${info('OKI', p.oki || '-')}
        ${info('Tanggal Pinjam', formatTanggalJam(p.tglPinjam))}
        ${info('Tanggal Kembali', formatTanggalJam(p.tglKembali))}
        ${p.dikembalikanPada ? info('Dikembalikan Pada', formatTanggalJam(p.dikembalikanPada)) : ''}
        ${info('Diajukan Pada', p.diajukanPada ? formatTanggal(p.diajukanPada) : '-')}
        ${info('Keperluan', p.keperluan || '-', true)}
      </div>
    </div>`;

    const tracking = document.getElementById('tracking');

    tracking.innerHTML = `
        <h3>Tracking Proses</h3>
        ${buatTimeline(p)}
    `;
}
