# SOP 01: Alur kerja pengembangan

Berlaku untuk manusia dan agent AI. Ringkas, supaya benar-benar dibaca.

## Cabang dan pull request
1. Jangan bekerja langsung di `main`. Buat cabang `<nama>/<fitur>` (contoh `adam/f-18-tutor-matching`).
2. Satu pull request, satu unit kerja. Judul commit: `feat|fix|docs|test|chore(area): ringkas`.
3. **Tidak ada atribusi AI** di commit, PR, atau dokumen (tidak ada `Co-Authored-By` AI, tidak ada "Generated with"). Hook git global menolaknya.
4. Merge ke `main` hanya setelah CI hijau dan tes jalan lokal.

## Urutan kerja untuk fitur backend
1. Baca [../PLAN_SEMIFINAL.md](../PLAN_SEMIFINAL.md) dan dokumen fitur terkait.
2. Tulis atau ubah skema Zod di `shared/` (kontrak lebih dulu).
3. Implementasi di `backend/src/modules/<fitur>/`.
4. Tes: jalur sukses, validasi, peran, dan **isolasi antar grup** untuk route notebook.
5. Daftarkan di `backend/src/docs/endpoints.ts`.
6. Perbarui dokumen (daftar di [03-documentation-maintenance.md](03-documentation-maintenance.md)).
7. `pnpm lint && pnpm type-check && pnpm test && pnpm build`.
8. Bila menyentuh AI: jalankan `pnpm --filter @deep-notes/backend eval:grounding` dan laporkan angkanya apa adanya.
9. Deploy dengan `bash scripts/deploy.sh`, lalu cek langsung (`agents/e2e-live.mjs <url>` di workspace hackathon).

## Rahasia
Hanya di `.env` dan penyimpan rahasia host. Jangan tempel di chat, dokumen, atau log. Bila bocor: putar segera.

## Definisi selesai
Sebuah fitur `implemented` hanya bila punya tes, dokumen fitur, entri di registri endpoint, dan sudah dijalankan nyata sekali. Selain itu statusnya `planned`.
