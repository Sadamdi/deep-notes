# Backend Deep Notes

API Express 5 + TypeScript. Dokumentasi interaktif: `/api/docs` (Swagger UI) dan `/api/docs/openapi.json`. Kontrak yang bisa dibaca manusia: [../docs/API_CONTRACT.md](../docs/API_CONTRACT.md) dan [../docs/COMPANION_CONTRACT.md](../docs/COMPANION_CONTRACT.md).

## Arsitektur berlapis

```
request → middleware (helmet, cors, cookie, attachUser) → route (validate Zod) → handler → Db (SQL)
                                                                         └→ ai/ (Gemini, cadangan, embedding, OCR)
```

| Lapisan | Lokasi | Aturan |
|---|---|---|
| Route dan handler | `src/modules/<fitur>/*.routes.ts` | validasi dengan skema Zod dari `shared/`; semua handler dibungkus `asyncHandler`; respons selalu `{ success, data }` atau `{ success:false, error }` |
| Akses data | `src/db/index.ts` | satu antarmuka `Db` (`query`, `exec`); node-postgres di server, PGlite untuk dev dan tes; migrasi SQL di `migrations/` |
| AI | `src/ai/index.ts` | satu pintu: `generateJson`, `embed`, `ocr`; rotasi key, cadangan, retry JSON; tes memakai AI palsu |
| Keamanan | `src/middleware/auth.ts` | `attachUser`, `requireAuth`, `notebookAccess(minRole)` |
| Dokumentasi | `src/docs/endpoints.ts` | registri endpoint; OpenAPI dibuat darinya |

## Modul

| Modul | Isi | Fitur |
|---|---|---|
| `auth`, `account` | akun, sesi, ganti password, ekspor dan hapus | F-01 |
| `notebooks` | notebook, anggota, undangan, publik, permintaan bergabung | F-02, F-11 |
| `sources` | unggah, ekstraksi per halaman, potongan, embedding, status | F-03, F-12 |
| `answers` | tanya jawab bersitasi, penjelasan berlangkah | F-04, F-10 |
| `companion` | katalog maskot, penampilan (beats) | F-10 |
| `quizzes` | pembuatan soal, percobaan, ujian, kuis mingguan, scoreboard | F-05, F-09, F-15 |
| `group` | kontribusi, progres, peta celah, tugas, partner | F-06, F-08, F-14, F-16, F-17 |
| `extras` | hapus kuis dan pertanyaan, kelola undangan | |

## Menambah endpoint (urutan kerja)
1. Skema request dan respons di `shared/src/` bila baru.
2. Handler di modul terkait; pakai `notebookAccess("viewer"|"editor"|"owner")` untuk route notebook.
3. Daftarkan di `src/docs/endpoints.ts`. Tes `docs.test.ts` gagal bila route terdaftar tapi tidak ada di server.
4. Tes di `tests/` (isolasi antar grup wajib untuk route notebook).
5. Perbarui `docs/API_CONTRACT.md`, dokumen fitur, dan `docs/features/FEATURE_INDEX.md`.
6. Jalankan `pnpm lint && pnpm type-check && pnpm test && pnpm build`.

## Tes

`pnpm --filter @deep-notes/backend test`. Tes memakai PGlite di memori dan penyedia AI palsu yang deterministik, jadi tidak butuh jaringan atau key. Hasil nyata dengan model sungguhan: `pnpm eval:grounding` dan `pnpm ai:smoke`.

## Migrasi

File `migrations/NNNN_nama.sql` dijalankan berurutan dan dicatat di tabel `_migrations` saat server start. Migrasi bersifat menambah; tidak ada rollback otomatis. Cadangkan database sebelum migrasi berisiko: `bash ../scripts/backup-db.sh`.

## Batasan yang diketahui
Rate limit di memori satu proses; password scrypt (bukan argon2id); SSRF belum menutup DNS rebinding; tidak ada reset password lewat email; file asli tidak disimpan (hanya teks dan embedding).
