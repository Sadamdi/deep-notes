# Desain UI/UX Deep Notes

Satu file FigCraft: [deep-notes-ui-ux-lengkap.figcraft](deep-notes-ui-ux-lengkap.figcraft). Buka dengan FigCraft (File, Open). Gambar ringkasan tiap halaman ada di [overview/](overview/) agar bisa dilihat tanpa FigCraft.

## Susunan: satu halaman Figma per layar produk
Setiap halaman layar dibaca dari atas ke bawah dalam enam langkah:

1. **Tujuan, user story, dan aset:** tujuan layar, cerita pengguna, kriteria selesai, daftar aset (nama, jenis, status).
2. **Wireframe low-fi:** struktur abu-abu, desktop dan mobile.
3. **UI hi-fi:** layar jadi dengan maskot di dalamnya.
4. **State layar:** kosong, memuat, galat, tidak ditemukan.
5. **Animasi: storyboard scene:** tiap scene berisi pemicu, klip maskot, durasi, dan tiga keyframe (awal, puncak, akhir).
6. **Spesifikasi dan API:** perilaku, ukuran, endpoint, dan status backend.

| Halaman | Isi |
|---|---|
| 00 Cover | judul, versi, daftar isi, legenda label |
| 01 Strategi | persona (hipotesis), perjalanan pengguna, struktur informasi |
| 02 Fondasi | warna dengan kontras terhitung, tipografi, spasi, radius, grid, gerak, ikon |
| 03 Komponen | tombol, input, tag, kartu, navigasi, modal, ubin game, bubble maskot, pemutar |
| 04 Alur pengguna | empat alur dengan cabang galat |
| 05 Beranda (feed sosial) | masuk, feed; 9 scene animasi |
| 06 Jelajah dan Buat Workspace | 8 scene animasi |
| 07 Workspace: Belajar bersama maskot | unggah, acuan, penjelasan maskot; 13 scene animasi |
| 08 Sesi Game | mulai sesi otomatis dan delapan game; 16 scene animasi |
| 09 Hasil, Papan Kelompok, Profil | 10 scene animasi |
| 10 Maskot, 22 aksi, adegan | lembar karakter, 22 pose, mode ngobrol, kelas, visualisasi, storyboard jam pelajaran |
| 11 Handoff | layar ke endpoint, aksi ke animasi, aksesibilitas, spesifikasi, token kode |

Total 56 scene animasi per layar ditambah 22 pose aksi maskot.

Status: wireframe dan hi-fi awal, belum diuji dengan pengguna; persona masih hipotesis. Maskot adalah sketsa 2D; nama Kiko, Mimi, Bobo placeholder. Label hijau di layar berarti backend siap, jingga berarti belum. Dibuat lewat `figcraft-cli run` dari skrip di workspace (`agents/work/2026-11-24-figcraft/`).
