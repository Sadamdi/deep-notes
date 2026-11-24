# Minigame dan alur UX (konsep)

Wireframe: [../design/wireframes/](../design/wireframes/) (PNG dan file FigCraft `deep-notes-ui-ux.figcraft`). Dibuat dengan FigCraft lewat `figcraft-cli run`; skrip pembuatnya ada di workspace `agents/work/2026-11-24-figcraft/`. Ini wireframe, bukan desain akhir: tim desain bebas mengubah gaya.

## Alur layar
1. **Beranda:** feed sosial seperti thread (posting teks, lampiran workspace, bagikan hasil kuis, suka dan balas).
2. **Jelajah:** kartu workspace dengan judul, deskripsi, preview sumber, dan daftar anggota; tombol minta bergabung.
3. **Workspace:** tiga panel. Kiri sumber (unggah banyak materi, pilih satu sebagai acuan atau semua). Tengah maskot dengan gelembung bicara, langkah penjelasan, pilihan gaya dan level. Kanan preview halaman yang dikutip dan visualisasi.
4. **Game, hasil ronde, papan kelompok.**

## Delapan minigame
Semua soal diturunkan dari sumber workspace dan membawa sumber serta halamannya, sehingga setelah menjawab pemain bisa membuka halaman asalnya.

| # | Game | Cara main | Kebutuhan backend |
|---|---|---|---|
| 1 | Duel Kilat | 1 lawan 1, pilihan ganda, bar waktu, siapa cepat | soal pilihan ganda sudah ada; sinkronisasi dua pemain belum (polling cukup untuk demo) |
| 2 | Isi yang Hilang | ketik kata yang dihilangkan dari kalimat sumber, ada petunjuk huruf | tipe soal isian baru, penilaian cocok persis atau oleh AI |
| 3 | Geser Benar/Salah | geser kartu: pernyataan asli atau yang diubah | tipe soal benar/salah baru |
| 4 | Urutkan Langkah | seret untuk menyusun urutan proses (misalnya DORA pada DHCP) | tipe soal urutan baru |
| 5 | Pasangkan Istilah | memori istilah dan definisi | tipe soal pasangan baru |
| 6 | Tebak Halaman | dari kutipan, tebak sumber dan halaman | memakai data sitasi yang sudah ada |
| 7 | Balapan Kelompok | satu kelompok melawan waktu, jawaban benar menggerakkan tim | memakai kuis mingguan; butuh status bersama |
| 8 | Jelaskan ke Maskot | pemain mengajar maskot yang pura-pura bingung, AI menilai terhadap sumber | penilaian penjelasan baru (butuh evaluasi kecil seperti F-07) |

Setelah ronde: skor, topik yang meleset dengan halaman sumber (peta celah sudah ada), tombol "misi pemulihan", poin, lencana, streak, dan bagikan ke feed.

## Yang sudah dan belum didukung backend
- Sudah: unggah banyak jenis file, sumber acuan, tanya jawab dan penjelasan maskot, kuis pilihan ganda, scoreboard mingguan, peta celah, notebook publik.
- Belum: feed sosial (posting, suka, balas, ikuti), tipe soal baru (isian, benar/salah, urutan, pasangan), duel dan balapan real-time, poin dan lencana dan streak, visualisasi dari sumber, suara maskot.
