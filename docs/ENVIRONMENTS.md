# Lingkungan dan server demo

Untuk tim frontend dan siapa pun yang menguji. Semua kontrak ada di docs; halaman ini menjawab: *ke mana saya memanggil API, dan bagaimana mengujinya?*

## 1. Alamat API (tetap)

**https://deepnotes-api.vercel.app**

Alamat ini **tetap** dan gratis (gerbang di Vercel yang meneruskan `/api/*` ke server demo). Pakai alamat ini di mana pun: Postman, Vite proxy, `vercel.json` frontend, dan dokumen.

| Apa | Alamat |
|---|---|
| Cek hidup | https://deepnotes-api.vercel.app/api/v1/health |
| Dokumentasi interaktif (Swagger UI) | https://deepnotes-api.vercel.app/api/docs |
| OpenAPI (JSON, bisa diimpor ke Postman atau Insomnia) | https://deepnotes-api.vercel.app/api/docs/openapi.json |
| Katalog maskot, tanpa login | https://deepnotes-api.vercel.app/api/v1/companion/catalog |
| Contoh penampilan maskot, tanpa login | https://deepnotes-api.vercel.app/api/v1/companion/demo |

Diuji lewat gerbang ini: pendaftaran dan cookie sesi, seluruh alur (19 dari 19 pemeriksaan `agents/e2e-live.mjs`), serta unggah file 1 MB dan 4 MB.

### Batas yang perlu diketahui
- **Unggah file maksimal sekitar 4,5 MB per permintaan lewat gerbang** (batas Vercel). File 6 MB atau 12 MB ditolak dengan `413 Request Entity Too Large`. Server sendiri menerima sampai 15 MB. Untuk menguji file besar, arahkan Vite proxy ke alamat langsung di bawah (bukan gerbang). Bagian UI unggah sebaiknya menampilkan batas 4 MB selama server memakai gerbang ini.
- Gerbang menambah sekitar 0,2 sampai 1 detik per permintaan; cukup untuk demo.
- Gerbang membaca alamat server dari berkas publik `deploy/server-url.json` di cabang `main`. Artinya **siapa pun yang bisa push ke `main` dapat mengarahkan gerbang ke server lain**, dan cookie serta kata sandi lewat gerbang. Hanya beri akses push ke anggota tim yang dipercaya.

### Alamat langsung (cadangan dan untuk file besar)
Server asli berada di belakang Cloudflare quick tunnel; alamatnya **berubah setiap tunnel di-restart**. Gerbang menyesuaikan diri otomatis setelah alamat baru ditulis ke repo, jadi frontend tidak perlu berubah.

<!-- server-url:start -->
**https://ann-robert-run-european.trycloudflare.com**

Terakhir diverifikasi: 2026-11-25 (`GET /api/v1/health` menjawab 200).
<!-- server-url:end -->

Pemilik server menjalankan `node scripts/update-server-url.mjs` (butuh `DEPLOY_HOST`) setelah tunnel di-restart; skrip itu memperbarui blok di atas dan `deploy/server-url.json`, lalu commit dan push. Gerbang memakai alamat baru dalam sekitar setengah menit.

## 2. Mencoba cepat dengan curl

Semua perintah di bawah memakai `API` sebagai alamat server dan menyimpan cookie sesi di `cookies.txt`.

```bash
API=https://deepnotes-api.vercel.app/api/v1

curl $API/health

# daftar (akun uji milik sendiri), lalu cek sesi
curl -c cookies.txt -H "content-type: application/json" -d '{"email":"nama-kamu@example.com","name":"Nama Kamu","password":"minimal-8-karakter"}' $API/auth/register
curl -b cookies.txt $API/auth/me

# buat workspace, tambah materi, tunggu siap, lalu tanya
curl -b cookies.txt -H "content-type: application/json" -d '{"title":"Uji Frontend"}' $API/notebooks
curl -b cookies.txt -H "content-type: application/json" -d '{"title":"Catatan","text":"Topologi bintang menghubungkan semua perangkat ke satu switch pusat sehingga kerusakan satu kabel hanya memutus satu perangkat."}' $API/notebooks/<id-notebook>/sources/text
curl -b cookies.txt $API/notebooks/<id-notebook>/sources            # tunggu status "ready"
curl -b cookies.txt -H "content-type: application/json" -d '{"question":"Apa kelemahan topologi bintang?"}' $API/notebooks/<id-notebook>/ask
```

Contoh skrip lengkap yang menjalankan seluruh alur (daftar, unggah, tanya, sesi game, jelaskan ke maskot, feed) ada di workspace tim: `agents/e2e-live.mjs` dan `agents/e2e-play.mjs` (`node e2e-play.mjs <alamat>`). Keduanya membuat satu akun dan notebook sementara lalu menghapusnya.

## 3. Memanggil dari frontend

- **Jangan memanggil alamat server langsung dari browser.** Server hanya mengizinkan asal `https://deep-notes.vercel.app` (CORS) dan cookie sesi bertanda `Secure` dan `SameSite=Lax`, jadi panggilan lintas situs dari `localhost` tidak membawa cookie.
- **Pakai proxy Vite** supaya browser melihat satu asal: `vite.config.ts` meneruskan `/api` ke alamat di `VITE_API_TARGET` (bawaan `http://localhost:4000`, yaitu backend lokal).
  ```bash
  # PowerShell: pakai server demo alih-alih backend lokal
  $env:VITE_API_TARGET = "https://deepnotes-api.vercel.app"; pnpm --filter @deep-notes/frontend dev
  ```
  Atau buat `frontend/.env.local` (tidak di-commit) berisi `VITE_API_TARGET=<alamat server>`.
- Semua `fetch` memakai `credentials: "include"`. Respons selalu `{ success, data }` atau `{ success: false, error: { code, message } }`.
- Di produksi (Vercel) frontend meneruskan `/api/*` ke server lewat *rewrite*, jadi kodenya sama: selalu panggil path relatif `/api/v1/...`.
- Cookie bertanda `Secure` diterima di `http://localhost` oleh Chrome, Edge, dan Firefox; Safari tidak. Kalau menguji di Safari, jalankan backend lokal.

## 4. Backend lokal (tanpa server demo)

```bash
pnpm install
cp backend/.env.example backend/.env      # isi GEMINI_API_KEYS bila ingin AI sungguhan
pnpm dev:backend                          # http://localhost:4000, database tertanam (PGlite), tanpa instalasi Postgres
```
Tanpa `GEMINI_API_KEYS`, endpoint yang butuh AI (tanya jawab, unggah, kuis, game) tidak akan berfungsi; endpoint lain (akun, notebook, feed, katalog maskot, demo penampilan) tetap bisa dicoba. Isi demo: `pnpm --filter @deep-notes/backend db:seed`.

## 5. Aturan memakai server demo bersama

- Database server adalah **satu database bersama** untuk semua penguji. Jangan memasukkan data pribadi atau materi berhak cipta; pakai teks contoh.
- Daftar dengan email contoh milik sendiri. Bersihkan setelah selesai: `DELETE /api/v1/me` dengan `{ "password": "..." }` (hapus dulu workspace yang kamu miliki).
- Pembatasan: pendaftaran dan login 20 per 15 menit; permintaan AI 40 per 10 menit per pengguna (game 20); posting dan komentar 20 per 10 menit. `429 RATE_LIMITED` berarti tunggu sebentar.
- Server kecil (1 GB RAM, dipakai bersama proyek lain): jangan menjalankan uji beban. Server demo ini tidak punya jaminan waktu aktif.
- Kunci API dan kata sandi tidak pernah ada di repo; jangan meminta atau menempelkannya di chat.

## 6. Dokumen yang perlu dibaca (semua sudah ada)

| Kebutuhan | Dokumen |
|---|---|
| Daftar endpoint dan bentuk respons | [API_CONTRACT.md](API_CONTRACT.md) dan Swagger di `/api/docs` |
| Maskot, 22 gerakan, bentuk penampilan, unggahan | [COMPANION_CONTRACT.md](COMPANION_CONTRACT.md) |
| Sesi game, jenis soal, poin, duel, feed | [GAME_CONTRACT.md](GAME_CONTRACT.md) |
| Desain layar, state, animasi, handoff | [design/README.md](design/README.md) (file FigCraft) |
| Skema tipe (Zod) untuk diimpor | `shared/src/` (paket `@deep-notes/shared`) |
| Peta layar ke endpoint, dan apa yang belum ada | [design/overview/halaman-11.png](design/overview/halaman-11.png) dan bagian "Belum ada" di GAME_CONTRACT |
| Cara kerja dan standar | [SOP/](SOP/) |

## 7. Yang belum ada di server (jangan dibangun dulu di frontend)
Suara maskot (`voiceNoteId` selalu `null`), audio dan rekaman kuliah sebagai sumber, WebSocket (pakai polling untuk duel), notifikasi, moderasi feed, reset password lewat email, dan domain tetap.
