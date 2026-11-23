# Status proyek — Deep Notes (diperbarui 23 Nov 2026)

## Tim
Aku Nak Menang Hackathon: Sulthan Adam Rahmadi (ketua; backend dan setup repo), Maulvi Ilmullah Faturrahman Al Afghani, Alya Nugrahanti, Ulinnuha Mahbubi (frontend/desain dibagi di antara anggota lain). Data pribadi anggota tidak disimpan di repo.

## Keputusan
- Satu repo, tiga paket: `frontend/`, `backend/`, `shared/` (pnpm workspace). Dokumentasi di `docs/`, alat agent di `agents/`.
- Frontend (usulan Maulvi): React + TypeScript, Tailwind terbaru, shadcn, three.js, React Hook Form, TanStack Table, TanStack Query, Zod.
- Backend (diputuskan Adam): Node 22 + TypeScript, Express 5, Zod, Drizzle ORM, PostgreSQL + pgvector, Gemini API. Alasan: satu bahasa dan satu kontrak Zod dengan frontend, pgvector lewat satu database.
- Case: Case 1 Smarter Campus and Learning. Konsep: notebook belajar kelompok yang menjawab hanya dari sumber kelompok dengan sitasi sumber dan halaman, kuis otomatis, kontribusi terlihat.

## Tanggal (dari handbook; bisa berubah)
Semifinal (proposal + video) 30 Nov · pengumuman Top 10 7 Des · Final Day 16 Des (prototipe bekerja + demo 10 menit).

## Hasil preliminary (23 Nov 2026)
Skor 69/100 (satu juri): masalah 3/5, kecocokan case 4/5, nilai dan orisinalitas 3/5, kelayakan 4/5, kejelasan abstrak 4/5. Keluhan: survei hanya 6 orang, perbandingan fitur dengan NotebookLM tidak ada, model belum dipilih. Rinci dan respons: `docs/product/PRELIM_FEEDBACK.md`.

## Rencana aktif
`docs/PLAN_SEMIFINAL.md` (fitur F-01..F-17; F-15..F-17 = kuis kelompok mingguan, peta celah pengetahuan, tugas belajar per anggota, fase P0..P6, validasi). Semifinal dikumpulkan 30 Nov (proposal maks 10 halaman isi + video maks 2 menit). Deploy: `docs/DEPLOYMENT.md` (dirancang, belum dijalankan). Backend: Express + Drizzle + Supabase (pgvector) + penyedia AI berlapis (Gemini utama, endpoint OpenAI-compatible sebagai cadangan teks).

## Status teknis
- Scaffold selesai: lint, type-check, test (2), build lulus lokal. Belum ada migrasi database, belum ada endpoint selain `/health`, belum ada panggilan AI.
- Belum dijalankan terhadap database nyata. Rencana, desain deploy, dan skema env sudah ditulis (PR `adam/semifinal-plan`); server belum disiapkan; rahasia yang bocor di chat belum di-rotate (T-015).

## Risiko
- Jawaban tanpa dasar (mitigasi: wajib sitasi, fallback "tidak ditemukan").
- Hak cipta materi unggahan; biaya dan kuota AI; ruang lingkup terlalu besar untuk waktu yang ada.
- Bukti masalah baru dari survei kecil (6 responden); tambah responden dan perbarui angka dari data asli.
