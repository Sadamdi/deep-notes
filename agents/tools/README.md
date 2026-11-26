# agents/tools — alat yang bisa dipakai ulang

Semua tool baru ditaruh di sini dan didaftarkan di tabel ini. Jalankan dari root repo: `python agents/tools/<nama>.py ...`.

| Tool | Fungsi |
|---|---|
| `record_lesson.py` | tambah catatan pelajaran ke `knowledge/lessons.md` (`python agents/tools/record_lesson.py "isi" --tag backend`) |

Aturan tool baru: docstring di baris atas, argumen via CLI, tanpa kredensial hardcode, pakai library standar bila bisa.
| `create_demo_accounts.mjs` | buat 4 akun demo + 1 workspace bersama lewat API (dijalankan manusia): `node agents/tools/create_demo_accounts.mjs` |
| `make_demo_video.py` | draf video semifinal dari aplikasi lokal (butuh backend+frontend lokal, Playwright, ffmpeg): `python agents/tools/make_demo_video.py <keluaran.mp4>` |
