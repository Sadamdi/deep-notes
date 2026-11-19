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
