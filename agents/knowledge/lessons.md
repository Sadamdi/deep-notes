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

## [tooling] Resolve workspace verification executables from the package that owns them; Vite
Resolve workspace verification executables from the package that owns them; Vite is linked under frontend/node_modules/.bin while the shared TypeScript binary is linked at the repository root.
(dicatat 2026-11-26)

## [ai] Model asli bisa mengosongkan citations untuk tugas yang menghasilkan daftar; min
Model asli bisa mengosongkan citations untuk tugas yang menghasilkan daftar; minta nomor sumber per item. Periksa balasan mentah model sebelum menyimpulkan akar bug, fake AI di tes tidak meniru perilaku ini.
(dicatat 2026-11-26)

## [frontend] Retry-safe local data import should preserve the browser copy and reuse stable I
Retry-safe local data import should preserve the browser copy and reuse stable IDs so a partial failure can be retried without duplicates. Check the deployed OpenAPI document before treating a local API route as available on the shared server.
(dicatat 2026-11-26)

## [ai] Automatic source suggestions have no search phrase, so sample passages directly
Automatic source suggestions have no search phrase, so sample passages directly from ready sources inside the authorized notebook scope and require each suggested question to cite one of those passages. A generic search phrase can silently bias suggestions toward unrelated material.
(dicatat 2026-11-26)

## [tooling] Use the explicit package script form pnpm run ci; the bare pnpm ci alias may run
Use the explicit package script form pnpm run ci; the bare pnpm ci alias may run package installation instead of the repository CI script.
(dicatat 2026-11-26)

## [game] Mark a round complete as soon as the answer API accepts it
Mark a round complete as soon as the answer API accepts it. A later session poll can still return stale progress while the player can already continue.
(dicatat 2026-11-27)

## [frontend] Compare fresh pre-finish stats with the completed session response before celebr
Compare fresh pre-finish stats with the completed session response before celebrating a streak; repeating a session on the same UTC day must not trigger the celebration again.
(dicatat 2026-11-27)

## [game] Versi scoring item pasangan harus tersimpan di ronde agar soal baru mendapat poi
Versi scoring item pasangan harus tersimpan di ronde agar soal baru mendapat poin proporsional tanpa mengubah penilaian ronde lama. Uji pointer drag dan keyboard drag secara terpisah.
(dicatat 2026-11-27)

## [frontend] Quiz content from AI may use Markdown code spans; render those spans semanticall
Quiz content from AI may use Markdown code spans; render those spans semantically so programming terms stay readable without exposing delimiters.
(dicatat 2026-11-27)
