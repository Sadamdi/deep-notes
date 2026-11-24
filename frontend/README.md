# Frontend Deep Notes

Untuk tim frontend dan desain. Aplikasi web React 19 + TypeScript (Vite, Tailwind CSS v4, shadcn/ui, TanStack Query dan Table, React Hook Form + Zod, three.js).

## Mulai dari mana

1. Baca [../docs/API_CONTRACT.md](../docs/API_CONTRACT.md) untuk semua endpoint, atau buka Swagger UI di `http://localhost:4000/api/docs` saat backend jalan.
2. Baca [../docs/COMPANION_CONTRACT.md](../docs/COMPANION_CONTRACT.md) untuk maskot: daftar gerakan, bentuk "penampilan", reaksi, dan unggahan.
3. Coba tanpa login dan tanpa menunggu AI: `GET /api/v1/companion/catalog` dan `GET /api/v1/companion/demo`.
4. Tipe dan skema form diimpor dari `@deep-notes/shared`; jangan menulis ulang tipe respons secara manual.

## Aturan penting dari kontrak
- Semua panggilan memakai cookie sesi: kirim dengan `credentials: "include"`. Dalam produksi frontend dan API satu asal lewat rewrite `/api/*`, jadi tidak perlu CORS.
- Respons selalu `{ success, data }` atau `{ success: false, error: { code, message } }`. Tampilkan `message` dan tangani `UNAUTHORIZED`, `NOT_FOUND`, `RATE_LIMITED`, `VALIDATION`.
- Unggah file: kirim `multipart/form-data`, terima `202`, lalu polling daftar sumber tiap 2 detik sampai `ready` atau `failed`.
- Teks selalu ada. Suara dan animasi adalah tambahan, jangan jadikan satu-satunya cara memahami jawaban.
- Daftar gerakan maskot tertutup. Kalau butuh gerakan baru, minta backend menambahnya di `shared/src/companion.ts` lewat satu pull request.

## Perintah

```bash
pnpm --filter @deep-notes/frontend dev          # http://localhost:5173
pnpm --filter @deep-notes/frontend type-check
pnpm --filter @deep-notes/frontend build
```

Proxy pengembangan ke backend `:4000` diatur di `vite.config.ts`. Desain dan komponen: [../docs/DESIGN_SYSTEM.md](../docs/DESIGN_SYSTEM.md).

Catatan: dokumentasi tambahan khusus frontend (halaman, komponen, state) ditulis oleh tim frontend di folder ini atau di `../docs/features/`, dengan format yang sama seperti dokumen fitur backend.
