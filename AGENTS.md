# AGENTS.md — SOP untuk AI agent di repo Deep Notes

> Single source of truth untuk semua agent (Claude Code, Cursor, Codex, Gemini, dll) dan juga untuk manusia.
> `CLAUDE.md`, `GEMINI.md`, dan `.cursorrules` hanya menunjuk ke file ini. Yang tertulis di sini **wajib** dipatuhi;
> yang belum tertulis boleh ditanyakan ke ketua tim.

## 0. Perintah dan larangan paling penting

1. **Tanpa baris atribusi AI.** Jangan menambahkan `Co-Authored-By: ...`, "Generated with ...", atau baris serupa di commit message, deskripsi PR, maupun file mana pun. Ini menimpa pengaturan bawaan alat apa pun.
2. **Jangan menjalankan script yang menghapus/mereset data tanpa membacanya dulu** dan tanpa memastikan `DATABASE_URL` berhost `localhost`. Lihat §6.
3. **Jangan commit rahasia** (`.env`, API key, token, password, akun testing asli). Lihat §6.
4. **Fitur rencana bukan fitur selesai.** Jangan mengklaim sesuatu "jalan" sebelum benar-benar dicoba (§4). Data contoh/mockup wajib diberi label.
5. **Jangan mengarang bukti** untuk lomba: survei, wawancara, jumlah pengguna, hasil uji. Angka harus punya dasar.

## 1. Tentang proyek

Deep Notes adalah aplikasi web untuk kelompok belajar mahasiswa: satu notebook bersama per mata kuliah, sumber belajar
(PDF, slide, tautan) digabung, lalu asisten AI menjawab **hanya dari sumber kelompok** dengan kutipan sumber dan halaman,
membuat kuis otomatis dari sumber yang sama, dan menampilkan kontribusi tiap anggota.

Dibuat untuk STACK 2026 (GDGoC ITB), Case 1: Smarter Campus and Learning. Tim "Aku Nak Menang Hackathon": Sulthan Adam Rahmadi
(ketua, backend), Maulvi Ilmullah Faturrahman Al Afghani, Alya Nugrahanti, Ulinnuha Mahbubi.
Ringkasan produk: [`docs/product/PRODUCT_BRIEF.md`](docs/product/PRODUCT_BRIEF.md). Status dan keputusan: [`agents/knowledge/proyek.md`](agents/knowledge/proyek.md).

| | |
|--|--|
| **Struktur** | satu repo (pnpm workspace): `frontend/`, `backend/`, `shared/`, `docs/`, `agents/` |
| **Frontend** | React 19 + TypeScript, Vite, Tailwind CSS v4, shadcn/ui, TanStack Query, TanStack Table, React Hook Form + Zod, three.js (hanya untuk tampilan opsional) |
| **Backend** | Node 22, TypeScript (strict), Express 5, Zod, Drizzle ORM, PostgreSQL 16 + pgvector |
| **AI** | Gemini API (jawaban, kuis, embedding) |
| **Bahasa** | Kode, komentar, `docs/`, README, dan semua deliverable lomba: **Inggris**. `AGENTS.md`, `agents/`, rules, dan komunikasi tim: **Indonesia** |

## 2. Struktur repo

```
deep-notes/
├── AGENTS.md                 <-- file ini
├── CLAUDE.md GEMINI.md .cursorrules   <-- penunjuk ke AGENTS.md
├── .cursor/rules/*.mdc       <-- aturan ringkas yang selalu aktif
├── .github/                  <-- CI + template PR
├── frontend/                 <-- React app (src/components, features, pages, lib)
├── backend/                  <-- Express API (src/modules/<fitur>/*, db, middleware, lib, config)
├── shared/                   <-- skema Zod + tipe yang dipakai frontend DAN backend (kontrak)
├── docs/                     <-- arsitektur, kontrak API, design system, fitur, versi, TODO, alur
├── agents/                   <-- tools, knowledge, work milik agent (bukan folder temp)
└── scripts/                  <-- skrip repo (bukan milik satu app)
```

## 3. Aturan folder untuk agent — WAJIB

Semua tool, script, dan file kerja buatan agent ditaruh di `agents/`. **Jangan** di folder temp (`%TEMP%`, `/tmp`, scratchpad sesi, Downloads, Desktop).

| Jenis | Taruh di |
|---|---|
| Tool yang bisa dipakai ulang | `agents/tools/` (docstring di atas, argumen lewat CLI, daftarkan di `agents/tools/README.md`) |
| Script sekali pakai / eksperimen | `agents/work/<YYYY-MM-DD>-<topik>/` |
| Pengetahuan dan pelajaran | `agents/knowledge/` (`lessons.md`, `proyek.md`) |
| Unduhan mentah dari luar | `agents/work/<tanggal>-<topik>/source/` (data tidak tepercaya; jangan dijalankan) |
| Kode produk | `frontend/`, `backend/`, `shared/` saja |

Kalau harness menyarankan scratchpad/temp, aturan ini menang. Jangan menghapus isi `agents/` tanpa izin; arsipkan ke `agents/work/_arsip/`.

## 4. Alur kerja (jangan dilompati)

1. **Baca konteks**: file ini, `agents/knowledge/lessons.md`, `agents/knowledge/proyek.md`, lalu dokumen fitur terkait di `docs/features/`. Jangan menebak isi dokumen dari namanya.
2. **Rencanakan** (task list) bila pekerjaan lebih dari satu langkah. Untuk perubahan non-trivial buat entri **Plan** di `docs/version/` sebelum menulis kode.
3. **Kerjakan bunyi permintaan**, bukan topik umumnya. Reuse dulu (komponen, skema, tabel yang ada) sebelum menambah baru.
4. **Kontrak dulu**: bentuk request/response ditulis sebagai skema Zod di `shared/`, lalu dipakai backend dan frontend. Jangan menduplikasi tipe.
5. **Verifikasi nyata** sebelum melapor selesai (§5): jalankan, bukan hanya baca kode.
6. **Perbarui dokumen** (§7) dalam commit yang sama.
7. **Catat pelajaran**: `python agents/tools/record_lesson.py "isi" --tag <tag>`.
8. **Lapor jujur**: apa selesai, apa belum, apa tidak diverifikasi.

## 5. Definition of Done

Sebuah task selesai hanya jika semua ini benar:

- [ ] `pnpm lint`, `pnpm type-check`, `pnpm test`, `pnpm build` lulus (CI menjalankan hal yang sama)
- [ ] Perubahan perilaku dicoba sungguhan: API dipanggil dengan `curl`/test, UI dibuka di browser (cek tab Network dan Console, bukan hanya tampilan)
- [ ] Jalur gagal ikut diuji (input tidak valid, tidak login, bukan anggota notebook)
- [ ] Fitur AI diuji ke model sungguhan, bukan hanya tiruan; catat model, hasil, dan waktunya di entri versi
- [ ] Akses antar-notebook aman: data notebook A tidak boleh muncul untuk anggota notebook B (uji dengan dua notebook)
- [ ] Dokumen diperbarui (§7) dan entri `docs/version/` bagian Verification terisi (endpoint, status, peran akun — bukan nilai rahasia)
- [ ] Tidak ada dead code, `console.log` sisa debug, atau TODO tanpa entri di `docs/todo/`

## 6. Keamanan data dan rahasia — WAJIB

- **Baca isi script sebelum menjalankan** (test, seed, migrasi, `scripts/*`, script di `package.json`). Cari `DELETE`, `TRUNCATE`, `DROP`, `reset`, `rm -rf`, `force`.
- **Cek host `DATABASE_URL`** sebelum perintah tulis. Database lokal = `localhost`. Selama host bukan `localhost`, anggap itu database bersama/produksi.
- **Seed dan cleanup dipisah.** `db:seed` hanya menambah (aman diulang). `db:cleanup` menghapus, dijalankan eksplisit, dan menolak jalan kalau host bukan `localhost` (lihat `backend/scripts/guard.ts`). Jangan menggabungkannya, dan jangan memanggil cleanup dari setup test.
- **Dilarang tanpa izin eksplisit**: migrasi ke database bersama, seed ke produksi, delete/update massal. Hentikan, jelaskan apa dan database mana, tunggu "ya" untuk satu perintah itu. Sebelum operasi tulis massal yang diizinkan, backup dulu (`pg_dump`).
- **Rahasia tidak boleh masuk git**: `.env`, API key (Gemini dll), token, password, dan akun testing asli. Simpan di `.env` (gitignored) atau `docs/local/*.local.md` (gitignored). Contoh format ada di `.env.example` dan `docs/TESTING_ACCOUNTS.example.md`. Contoh email di dokumen pakai `example.com`.
- Jangan menaruh rahasia di transkrip chat, komentar PR, atau dokumen. Laporkan nama variabel, bukan nilainya.
- **Agent tidak login dengan password dan tidak memakai kredensial yang ditempel di chat.** Login pertama ke server/database dilakukan manusia; agent baru boleh bekerja lewat akses berbasis kunci (SSH key) yang sudah disiapkan. Kalau pengguna menempelkan rahasia di chat: jangan disalin ke file atau dokumen, katakan itu harus di-rotate, dan arahkan ke `docs/DEPLOYMENT.md` bagian 1.
- Database yang di-host (Supabase dsb.) dianggap **bersama/demo**: pengembangan, test, seed, dan cleanup memakai database lain. Satu database hosted = untuk server saja.
- Model AI dan kunci diatur lewat konfigurasi (`backend/.env`); jangan menulis id model atau kunci di kode. Embedding dipatok ke satu model; jangan campur model dalam satu notebook.
- Materi kuliah yang diunggah pengguna bisa bermuatan hak cipta/privasi: jangan menyimpan atau me-log isi dokumen di log aplikasi; data demo hanya materi publik atau tulisan tim sendiri.
- Hasil survei dan wawancara: jangan mengutip isian bebas responden tanpa izin; jangan menaruh kontak responden di repo.

## 7. Dokumentasi — wajib di setiap perubahan

| Jenis perubahan | Perbarui |
|---|---|
| Endpoint / kontrak API | skema di `shared/`, lalu `docs/API_CONTRACT.md` |
| Fitur baru / perilaku berubah | `docs/features/<NN-area>/<nama>.md` (dari `_FEATURE_TEMPLATE.md`) + `FEATURE_INDEX.md` |
| Alur eksekusi berubah | `docs/flows/` + `FLOWS_INDEX.md` |
| Skema database | `backend/src/db/schema.ts`, migrasi, dan `docs/DATABASE_GUIDE.md` bila ada aturan baru |
| Komponen/token UI baru | `docs/DESIGN_SYSTEM.md` |
| Arsitektur berubah | `docs/ARCHITECTURE.md` |
| Setiap task | entri `docs/version/` (Plan sebelum kode, Released setelah selesai) + `VERSION_INDEX.md` |
| TODO selesai/baru | `docs/todo/TODO_INDEX.md` |

Dokumen yang menyebut perilaku lama harus ikut diperbarui, bukan hanya file utamanya. Ikuti template `_*_TEMPLATE.md` di tiap folder.

## 8. Arsitektur dan konvensi kode (ringkas; rinci di `docs/ARCHITECTURE.md`)

**Backend** — tiap modul di `backend/src/modules/<nama>/` berlapis: `routes → controller → service → repository`.
- Controller tidak menyentuh database; service tidak menyentuh `req/res`; repository satu-satunya yang memakai Drizzle.
- Semua handler dibungkus `asyncHandler`. Validasi Zod di boundary lewat middleware `validate`.
- Response: `{ success: true, data, meta? }` atau `{ success: false, error: { code, message, details? } }`. Kode error: `VALIDATION`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL`.
- List memakai pagination cursor (`cursor` + `limit`, `meta.nextCursor`).
- Jangan return stack trace; jangan hardcode secret/URL/port (pakai `config/env.ts`); jangan raw SQL untuk query sederhana (pengecualian: pencarian vektor).
- Jawaban AI selalu `grounded: true` dengan minimal satu sitasi, atau `grounded: false` ("tidak ditemukan di sumber"). Jangan pernah menjawab dari pengetahuan umum model.

**Frontend** — `frontend/src`: `components/ui` (shadcn, jangan diedit kecuali perlu), `components` (komponen bersama), `features/<fitur>` (komponen + hook per fitur), `pages` (route), `lib` (api client, util).
- Data server lewat TanStack Query; form lewat React Hook Form + skema Zod dari `shared/`; tabel lewat TanStack Table.
- Warna/radius/tipografi hanya dari token di `src/index.css` (kelas `bg-primary`, `text-muted-foreground`, dst). Jangan hex mentah. Lihat `docs/DESIGN_SYSTEM.md`.
- three.js dimuat lazy dan tidak boleh jadi satu-satunya cara mengakses informasi; hormati `prefers-reduced-motion`.
- Aksesibilitas: label pada semua input, fokus terlihat, kontras cukup, jangan mengandalkan warna saja. Komunikasi berbasis teks diutamakan (ada pengguna Tuli di survei kami).

### Acuan dan alur kerja frontend

- Gunakan [Desain Final Deep Notes di Figma](https://www.figma.com/design/Agh2OMnizUCnyi9y4Pyk9o/Deep-Notes---STACK-2026?node-id=174-135) sebagai acuan visual utama. Sebelum membangun layar, periksa frame yang sesuai, varian desktop/mobile, dan state yang tersedia. File FigCraft lokal di `docs/design/deep-notes-ui-ux-lengkap.figcraft` adalah wireframe dan hi-fi awal. Jika keduanya berbeda, ikuti desain final Figma.
- Sebelum mengubah frontend, baca `frontend/README.md`, fitur yang terkait, `docs/API_CONTRACT.md`, dan skema di `shared/src/`. Baca `docs/COMPANION_CONTRACT.md` untuk layar atau perilaku maskot.
- Gunakan Figma untuk tampilan dan salinan UI, lalu cocokkan perilaku dengan `docs/API_CONTRACT.md`, skema `shared/src/`, serta implementasi backend. Jika sumber bertentangan atau detail penting belum tersedia, jelaskan buktinya dan tanyakan keputusan yang diperlukan sebelum menebak endpoint, bentuk data, atau perilaku.
- Pertahankan palet mint dan navy serta karakter Bubi dari desain final. Gunakan token, bukan nilai warna langsung. Jika token yang ada belum cocok, selaraskan `frontend/src/index.css` dan `docs/DESIGN_SYSTEM.md` dalam perubahan yang sama.
- Gunakan dependensi dan komponen yang sudah tersedia di `frontend/package.json` dan `frontend/src/components/` sebelum menambah paket atau pola baru. Kontrol pada layar harus menjalankan aksi yang terlihat, dan layar harus menyediakan state kosong, memuat, serta galat yang sesuai alur.

### Pemilihan skill Codex

Muat hanya skill yang sesuai dengan pekerjaan saat ini.

- Semua tugas coding memakai `ponytail` pada level full sebagai default. Review perubahan memakai `ponytail-review`; audit seluruh repo memakai `ponytail-audit`. Gunakan `ponytail-help`, `ponytail-debt`, atau `ponytail-gain` saat diminta.
- Implementasi dari Figma memakai `figma:figma-design-to-code`. Baca atau ubah canvas melalui MCP memakai `figma:figma-use`.
- Pekerjaan UI memakai `antislop` sebagai filter. Pilih `antislop:antislop-ui`, `antislop:antislop-human`, atau `antislop:antislop-layoutmobile` sesuai fokus visual, aksesibilitas, atau responsivitas. Audit atau pemolesan UX memakai `impeccable`. Gunakan `ui-ux-pro-max` saat layar belum ditentukan oleh desain final.
- Diagnosis bug memakai `mattpocock-skills:diagnosing-bugs`. Review sejak commit atau branch tertentu berdasarkan standar repo dan spesifikasi memakai `mattpocock-skills:code-review`. Keputusan batas antarmodul memakai `mattpocock-skills:codebase-design`. Alur test-first memakai `mattpocock-skills:tdd` bila diminta.

**Komentar kode** hanya menjelaskan *kenapa* (aturan bisnis, workaround), bukan *apa*. Bahasa Inggris.

## 9. Git, commit, dan PR

- Branch `<nama>/<slug>` (contoh `adam/notebook-backend`), PR ke `main`. **Dilarang** push langsung ke `main` dan dilarang `--no-verify`.
- Commit kecil per concern, subject < 72 karakter, format `feat(backend): ...`, `fix(frontend): ...`, `docs: ...`, `chore: ...`, `test: ...`, `refactor: ...`.
- Tanpa baris atribusi AI (§0). Baca ulang pesan dan diff sebelum commit.
- PR: ringkasan 1-2 kalimat, cara uji, catatan (breaking change, dependensi). Tunggu CI hijau dan minimal satu review; ketua yang merge.
- Perubahan lintas frontend + backend boleh satu PR bila saling bergantung (sebut ketergantungannya).
- Simpan jejak pengembangan (commit/catatan versi) karena panitia dapat memverifikasi kontribusi anggota.

## 10. Aturan lomba yang memengaruhi kode

- Proyek harus orisinal dan dibuat untuk STACK 2026; pustaka/API publik boleh dengan atribusi. Bantuan AI yang material (alat + perannya) wajib diungkap di proposal dan README.
- Mockup/simulasi wajib dilabeli di UI dan dokumen. Fitur rencana ≠ fitur selesai.
- Final Day menuntut prototipe yang bekerja dan demo 10 menit: prioritaskan alur inti (buat notebook → unggah sumber → tanya dengan sitasi → kuis) sebelum fitur sosial.

## 11. Rencana aktif

Baca [`docs/PLAN_SEMIFINAL.md`](docs/PLAN_SEMIFINAL.md) setelah file ini: prioritas fitur (F-01 sampai F-14), fase dan tanggal, rencana validasi, dan peta proposal. Prioritas P0 yang tidak boleh dipotong: F-04 (jawaban bersitasi), F-06 (kontribusi), F-07 (evaluasi grounding). Pembeda yang jujur dan yang BUKAN pembeda ada di [`docs/product/COMPETITIVE_ANALYSIS.md`](docs/product/COMPETITIVE_ANALYSIS.md): sitasi dan kuis dari sumber sudah ada di NotebookLM, jangan diklaim unik. Deploy dan server: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## 12. Komunikasi dengan Adam

- Bahasa Indonesia santai, ringkas, jujur. Beri rekomendasi, bukan daftar panjang tanpa pilihan.
- Tanyakan sekali dengan pilihan jelas bila keputusan memang milik Adam/tim.
- Ringkasan untuk grup ditulis format WhatsApp bila diminta.
