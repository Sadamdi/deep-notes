# Lessons — jebakan yang sudah pernah kena

Ditulis manual atau lewat `python agents/tools/record_lesson.py "..." --tag <tag>`. Baca seluruh file ini sebelum mulai kerja.

## [data] Script test/seed yang menghapus data bisa mengenai database bersama
Skrip yang menghapus tabel berbahaya bila `DATABASE_URL` menunjuk database bersama. Seed (hanya menambah) dan cleanup (menghapus) dipisah, dan cleanup menolak jalan kecuali host `localhost` (`backend/scripts/guard.ts`). Baca script sebelum menjalankannya.

## [lomba] Keunikan ide
Ide "notebook AI + sosial" mudah kembar dengan tim lain. Pembeda kami: sumber kelompok saja, jawaban selalu bersitasi sumber dan halaman, kuis dari sumber yang sama, kontribusi terlihat. Pertahankan pembeda itu di setiap keputusan fitur.

## [lomba] Bukti tidak boleh dikarang
Survei, wawancara, jumlah pengguna, dan hasil uji harus asli; estimasi diberi label. Fitur rencana tidak boleh disajikan sebagai fitur selesai.

## [tooling] Versi paket terbaru bisa membawa API baru
TanStack Table v9 memakai `useTable` + `tableFeatures` (bukan API v8); Prisma 8 masih RC saat repo dibuat (karena itu Drizzle dipakai). Periksa `dist-tags` dan baca README/skills paket di `node_modules` sebelum menulis kode untuk versi mayor baru.

## [tooling] Pemisah heredoc di shell
Menulis banyak file sekaligus dengan heredoc panjang bisa gagal parse. Untuk file kode, pakai alat tulis file satu per satu.

## [keamanan] Rahasia yang ditempel di chat dianggap bocor
Kunci API, password server, dan password database pernah ditempel ke chat saat perencanaan (23 Nov 2026). Semuanya harus di-rotate (lihat `docs/DEPLOYMENT.md` bagian 1). Simpan rahasia hanya di `.env` (gitignored, `chmod 600` di server). Agent tidak login dengan password; login pertama dilakukan manusia, lalu pakai SSH key.

## [produk] Sitasi dan kuis dari sumber bukan pembeda
NotebookLM sudah punya jawaban bersitasi, kuis/flashcard dari sumber, dan berbagi notebook. Juri preliminary menilai pembeda kami lemah (3/5). Pembeda yang masuk akal ada di tingkat kelompok: kontribusi per anggota, kemajuan kelompok, notebook publik per mata kuliah, penjelasan teks dengan karakter. Bangun dan buktikan dulu sebelum diklaim di proposal.

## [frontend] Warna subtipe mobile #607882 (4.35:1) dan border input #afc2c2 (1.86:1) pada kan
Warna subtipe mobile #607882 (4.35:1) dan border input #afc2c2 (1.86:1) pada kanvas Figma sedikit di bawah ambang WCAG 2.2 AA. Pakai token #45616b (6.18:1) untuk teks sekunder dan #647d86 (4.36:1) untuk border input di index.css agar nada warna tetap sesuai desain tetapi lulus kontras 4.5:1 dan 3:1.
(dicatat 2026-11-25)
