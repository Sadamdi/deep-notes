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

## [frontend] Layar desain tanpa API harus menjadi handoff yang jelas
Jika layar desain belum punya API terverifikasi, beri label bahwa data hanya tersimpan di browser dan catat kebutuhan backend. Kelompokkan cakupan route secara jujur; jangan mengklaim semua frame sudah dibandingkan piksel demi piksel.
(dicatat 2026-11-25)

## [frontend] Figma SVG exports flatten Bubi variants but use expression-specific part ids
Figma SVG exports flatten Bubi variants but use expression-specific part ids. Map and verify the moving head and arm ids for all six faces so a pose cannot silently animate the wrong group.
(dicatat 2026-11-25)
