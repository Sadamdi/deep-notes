# Lingkungan dan server demo

Untuk tim frontend dan siapa pun yang menguji. Semua kontrak ada di docs; halaman ini menjawab: *ke mana saya memanggil API, dan bagaimana mengujinya?*

## 1. Server demo (backend sudah berjalan)

<!-- server-url:start -->
**https://ann-robert-run-european.trycloudflare.com**

Terakhir diverifikasi: 2026-11-25 14:12 UTC (`GET /api/v1/health` menjawab 200).
<!-- server-url:end -->

| Apa | Alamat |
|---|---|
| Cek hidup | `<alamat>/api/v1/health` |
| Dokumentasi interaktif (Swagger UI) | `<alamat>/api/docs` |
| OpenAPI (JSON, bisa diimpor ke Postman atau Insomnia) | `<alamat>/api/docs/openapi.json` |
| Katalog maskot, tanpa login | `<alamat>/api/v1/companion/catalog` |
| Contoh penampilan maskot, tanpa login | `<alamat>/api/v1/companion/demo` |

> **Penting: alamat ini sementara.** Server memakai Cloudflare *quick tunnel*; alamatnya **berubah setiap tunnel di-restart** (misalnya server reboot atau deploy ulang proses tunnel). Kalau alamat di atas tidak menjawab, tarik versi terbaru repo ini (alamat baru ditulis di sini) atau minta Adam. Alamat tetap menunggu keputusan domain. Jangan menulis alamat ini di kode: pakai variabel lingkungan (bagian 3).

Siapa yang memperbarui alamat: pemilik server menjalankan `node scripts/update-server-url.mjs` lalu commit. Skrip itu membaca alamat dari server, memastikan `/health` menjawab, dan menulisnya di blok di atas.

## 2. Mencoba cepat dengan curl

Semua perintah di bawah memakai `API` sebagai alamat server dan menyimpan cookie sesi di `cookies.txt`.

```bash
API=https://ann-robert-run-european.trycloudflare.com/api/v1

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
  $env:VITE_API_TARGET = "https://ann-robert-run-european.trycloudflare.com"; pnpm --filter @deep-notes/frontend dev
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
- Server kecil (1 GB RAM, dipakai bersama proyek lain): jangan menjalankan uji beban.
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
