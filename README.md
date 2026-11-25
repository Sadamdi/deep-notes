# 🎓 Deep Notes

<div align="center">

**Notebook belajar bersama berbasis AI yang menjawab hanya dari sumber kelompokmu, dengan teman belajar berbentuk maskot.**
*STACK 2026 (GDGoC ITB), Case 1: Smarter Campus and Learning, tim Aku Nak Menang Hackathon*

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-404D59?style=for-the-badge&logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Gemini](https://img.shields.io/badge/Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev/)

</div>

---

## 📖 Tentang Proyek

Satu kelompok belajar punya satu notebook per mata kuliah. Anggota mengunggah sumbernya (PDF, slide, Word, spreadsheet, gambar, tautan). Siapa pun bisa bertanya, dan asisten menjawab **hanya dari sumber itu**, lengkap dengan sumber dan halaman yang dipakai. Kalau jawabannya tidak ada, asisten berkata jujur: tidak ditemukan.

AI hadir sebagai **teman belajar atau guru** berbentuk maskot. Backend menulis "naskah penampilan" (apa yang diucapkan, ekspresi, gerakan, dan sumber yang ditampilkan), lalu frontend memainkannya. Teks selalu ada, jadi aplikasi tetap bisa dipakai tanpa suara.

> **Status (24 Nov 2026):** backend F-01 sampai F-17 selesai dan teruji, berjalan di server demo. Frontend dikerjakan terpisah terhadap kontrak API. Rincian jujur ada di [docs/ROADMAP.md](docs/ROADMAP.md).

---

## ✨ Fitur

| Kelompok | Fitur | Status backend |
|---|---|---|
| **Akun** | daftar, login, ganti password, logout semua perangkat, ekspor dan hapus data | ✅ |
| **Kelompok** | notebook, peran owner/editor/viewer, undangan, notebook publik dan permintaan bergabung | ✅ |
| **Sumber** | PDF (termasuk scan), PPTX, DOCX, XLSX, CSV, gambar, teks, tautan web (anti-SSRF) | ✅ |
| **Tanya jawab** | jawaban bersitasi halaman, penolakan baku bila tidak ada di sumber | ✅ |
| **Teman belajar** | penjelasan langkah demi langkah dengan emosi dan gerakan maskot (guru, teman, pelatih; level sederhana sampai rinci) | ✅ |
| **Kuis** | latihan, ujian bertimer (jam di server), kuis mingguan dengan scoreboard kelompok | ✅ |
| **Pembeda kelompok** | kontribusi anggota, progres, peta celah pengetahuan ke halaman sumber, tugas belajar per anggota, partner belajar | ✅ |
| **Game dan sosial** | sesi game otomatis (7 jenis soal), duel dan kelompok, poin, streak, lencana, jelaskan ke maskot, peta konsep, feed sosial | ✅ |
| **Bukti mutu** | skrip evaluasi grounding dengan laporan bertanggal | ✅ |
| Suara maskot, audio dan rekaman kuliah, visualisasi catatan | | 🕓 direncanakan |

Perbandingan jujur dengan NotebookLM: [docs/product/COMPETITIVE_ANALYSIS.md](docs/product/COMPETITIVE_ANALYSIS.md).

---

## 🧱 Arsitektur Teknologi

```
frontend/  React 19 + TypeScript, Vite, Tailwind CSS v4, shadcn/ui, TanStack Query dan Table, React Hook Form, three.js
backend/   Node 22 + TypeScript, Express 5, Zod 4, PostgreSQL + pgvector (node-postgres; PGlite untuk dev dan tes), pino
shared/    skema Zod yang dipakai kedua sisi: kontrak API dan kontrak maskot
AI         Gemini 2.5 Flash (utama), endpoint OpenAI-compatible (cadangan), embedding gemini-embedding-001 768 dimensi
```

Detail dan alasan pilihan: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Pemilihan model dengan uji nyata: [docs/product/MODEL_SELECTION.md](docs/product/MODEL_SELECTION.md).

---

## 🗂 Struktur Proyek

```
deep-notes/
├── frontend/            # aplikasi web (dikerjakan anggota frontend)
├── backend/
│   ├── src/
│   │   ├── modules/     # satu folder per fitur: auth, notebooks, sources, answers, companion, quizzes, group, account, extras
│   │   ├── ai/          # lapisan penyedia AI: rotasi key, cadangan, embedding, OCR
│   │   ├── db/          # antarmuka Db (node-postgres dan PGlite) + runner migrasi
│   │   ├── docs/        # registri endpoint -> OpenAPI + Swagger UI
│   │   ├── middleware/  # auth, validasi, rate limit, error
│   │   └── lib/         # password, aktivitas, pemeliharaan
│   ├── migrations/      # SQL berurutan (dijalankan otomatis saat start)
│   ├── tests/           # vitest + supertest
│   ├── eval/            # materi dan pertanyaan evaluasi grounding
│   └── scripts/         # migrate, seed, evaluate-grounding, ai-smoke, ocr-smoke
├── shared/              # kontrak Zod (api, notebook, schemas, companion)
├── docs/                # dokumentasi (lihat navigasi di bawah)
├── scripts/             # deploy.sh, backup-db.sh
├── deploy/              # definisi pm2
└── agents/              # catatan dan alat untuk agent AI (lihat AGENTS.md)
```

---

## 📚 Navigasi Dokumentasi

Dokumentasi dipisah menurut fungsi supaya manusia dan AI tahu ke mana harus melihat.

| Kebutuhan | Baca | Kapan |
|---|---|---|
| Mulai bekerja (agent atau manusia) | [AGENTS.md](AGENTS.md) | aturan wajib sebelum menyentuh repo |
| Alamat server demo dan cara mencoba API | [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md) | **mulai di sini untuk frontend** |
| Frontend: apa yang bisa dipanggil | [docs/API_CONTRACT.md](docs/API_CONTRACT.md) dan Swagger di `/api/docs` | membangun layar |
| Frontend: maskot, gerakan, unggah | [docs/COMPANION_CONTRACT.md](docs/COMPANION_CONTRACT.md) | membangun pemutar maskot |
| Backend: cara kerja modul | [backend/README.md](backend/README.md) | mengubah atau menambah endpoint |
| Frontend: cara bekerja | [frontend/README.md](frontend/README.md) | memulai frontend |
| Alur kerja dan standar | [docs/SOP/](docs/SOP/) | sebelum membuat fitur, endpoint, atau dokumen |
| Rencana dan jadwal | [docs/PLAN_SEMIFINAL.md](docs/PLAN_SEMIFINAL.md), [docs/ROADMAP.md](docs/ROADMAP.md) | melihat apa yang selesai dan sisa |
| Dokumen per fitur | [docs/features/FEATURE_INDEX.md](docs/features/FEATURE_INDEX.md) | aturan bisnis (BR-XX) tiap fitur |
| Arsitektur dan alur | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/flows/](docs/flows/) | memahami sistem |
| Bukti mutu | [docs/evaluation/](docs/evaluation/) | angka evaluasi untuk proposal |
| Deploy dan server | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | rilis dan operasi |
| Pengungkapan penggunaan AI | [docs/AI_DISCLOSURE.md](docs/AI_DISCLOSURE.md) | proposal |

### Saat menambah fitur baru, wajib diperbarui
1. Kode, tes, dan skema Zod di `shared/` bila bentuk request atau respons berubah.
2. Registri endpoint di `backend/src/docs/endpoints.ts` (tes gagal bila dokumen dan server tidak cocok).
3. [docs/API_CONTRACT.md](docs/API_CONTRACT.md) dan, bila menyangkut maskot, [docs/COMPANION_CONTRACT.md](docs/COMPANION_CONTRACT.md).
4. Dokumen fitur di `docs/features/` dan [FEATURE_INDEX.md](docs/features/FEATURE_INDEX.md).
5. [docs/ROADMAP.md](docs/ROADMAP.md) hanya setelah fitur punya tes, dokumen, dan hasil jalan nyata.

---

## 🚀 Mulai Cepat

Prasyarat: Node 22+, pnpm 10, dan satu key Gemini. Postgres lokal tidak wajib: tanpa `DATABASE_URL`, mode pengembangan memakai PGlite (Postgres dalam proses, sudah ada pgvector).

```bash
pnpm install
cp backend/.env.example backend/.env     # isi nilainya; jangan pernah commit .env
pnpm dev                                 # frontend :5173, backend :4000
```

Dokumentasi API interaktif: buka `http://localhost:4000/api/docs` (Swagger UI) atau `/api/docs/openapi.json`.

### Variabel lingkungan utama (`backend/.env`)

| Variabel | Fungsi |
|---|---|
| `DATABASE_URL`, `DATABASE_SSL` | Postgres; kosong = PGlite lokal (hanya dev). `DATABASE_SSL=require` untuk Supabase |
| `SESSION_SECRET` | minimal 32 karakter |
| `GEMINI_API_KEYS` | daftar key dipisah koma (dirotasi otomatis) |
| `OPENAI_COMPAT_BASE_URL`, `OPENAI_COMPAT_API_KEY` | cadangan teks bila Gemini habis kuota |
| `AI_TEXT_MODEL`, `AI_FALLBACK_TEXT_MODEL`, `AI_EMBED_MODEL` | id model (konfigurasi, bukan kode) |
| `CORS_ORIGIN` | asal frontend |

### Perintah

| Perintah | Fungsi |
|---|---|
| `pnpm dev` | frontend dan backend bersamaan |
| `pnpm lint`, `pnpm type-check`, `pnpm test`, `pnpm build` | pemeriksaan yang sama dengan CI; `pnpm ci` menjalankan semuanya |
| `pnpm --filter @deep-notes/backend db:migrate` | terapkan migrasi |
| `pnpm --filter @deep-notes/backend db:seed` | buat notebook demo dan akun demo (hanya database lokal) |
| `pnpm --filter @deep-notes/backend eval:grounding` | evaluasi grounding dengan model nyata, menulis laporan di `docs/evaluation/` |
| `bash scripts/deploy.sh` | deploy backend ke server demo dengan rollback otomatis |

---

## 🔐 Keamanan

- Sesi: token acak 256 bit di cookie `httpOnly`, `sameSite=lax`, `secure` di produksi; hanya hash-nya yang disimpan. Password memakai scrypt berbumbu.
- Isolasi data: bukan anggota mendapat `404`, bukan `403`, di semua route notebook; diuji pada 13 route.
- Jawaban AI: sitasi divalidasi di server; jawaban tanpa sitasi valid diubah menjadi penolakan. Isi sumber diperlakukan sebagai data, bukan perintah (diuji dengan instruksi sisipan).
- Unggahan: tipe dicek lewat ekstensi dan signature file; tautan web ditolak bila mengarah ke alamat privat (SSRF).
- Pembatasan: rate limit login dan AI, kuota per pengguna dan per notebook.
- Rahasia hanya di `.env` dan penyimpan rahasia host; tidak pernah di git, dokumen, atau log.

---

## 👥 Tim

Aku Nak Menang Hackathon: Sulthan Adam Rahmadi (ketua, backend), Maulvi Ilmullah Faturrahman Al Afghani, Alya Nugrahanti, Ulinnuha Mahbubi.
Penggunaan AI dalam pengerjaan diungkapkan di [docs/AI_DISCLOSURE.md](docs/AI_DISCLOSURE.md).
