# Game contract (sesi otomatis, minigame, poin, feed)

Untuk frontend. Schema di kode: [`shared/src/game.ts`](../shared/src/game.ts). Dokumentasi interaktif: `/api/docs` (tag **Game**, **Feed**). Layar yang memakainya: halaman 05 dan 08 di [design/](design/).

## 1. Ide
Server memilih jenis game tiap ronde (aturan, bukan tebakan AI), AI hanya menulis isi soal dari sumber workspace. Frontend memainkan ronde dan mengirim jawaban. Jawaban benar tidak pernah dikirim sebelum pemain menjawab.

```
POST /notebooks/:id/sessions   { mode, rounds, focusTopic?, gameTypes?, sourceIds? }
  → { id, status, rounds: [ { index, type, topic, timeLimitSec, items[], cue } ], participants, ... }
POST /notebooks/:id/sessions/:sid/rounds/:n/answer   { answers[], elapsedMs? }
  → { results[], correctCount, total, points, reaction, scoreboard }
POST /notebooks/:id/sessions/:sid/finish
  → { points, accuracyPercent, streak, badgesEarned[], weakTopics[], recoveryTopics[], rank, reaction }
```

## 2. Otomatis atau pilih sendiri
- **Otomatis:** kirim `{}`. Solo memakai urutan 6 ronde: pilihan ganda (pemanasan), isian, urutan, pasangan, benar/salah, lalu **jelaskan ke maskot**. Duel dan kelompok hanya memakai game singkat (pilihan ganda, benar/salah, tebak halaman, isian) supaya pemain tetap sinkron.
- **Pilih sendiri:** kirim `gameTypes: ["tf","fill"]`. Hanya jenis itu yang dipakai (ronde terakhir solo tetap boleh teach).
- **Misi pemulihan:** kirim `focusTopic` (ambil dari `recoveryTopics` hasil sesi atau dari `GET /gaps`).
- Bila materi tidak cukup untuk satu jenis (misalnya tidak ada proses berurutan untuk "urutan"), server menggantinya dengan pilihan ganda. Bila sama sekali tidak cukup, `409` dan frontend mengajak unggah sumber.
- `sourceIds` membatasi ke sumber acuan yang dipilih pemain (juga tersedia di `/ask`, `/explain`, `/companion/explain`, dan pembuatan kuis).

## 3. Jenis soal dan bentuk jawaban
`answers` selalu array sepanjang `items` pada ronde itu.

| `type` | Item yang dilihat pemain | Jawaban per item |
|---|---|---|
| `mcq` | `prompt`, `options[4]` | indeks 0 sampai 3 |
| `fill` | `prompt` berisi `____`, `firstLetter`, `length` | teks; tidak peka huruf besar, tanda baca, dan aksen |
| `tf` | `prompt` (pernyataan) | `true` atau `false` |
| `order` | `prompt`, `steps: [{id, text}]` (sudah diacak) | array `id` dalam urutan pilihan pemain |
| `match` | `lefts[]`, `rights[]` (diacak) | array: untuk tiap `lefts[i]`, indeks pasangannya di `rights` |
| `guess_page` | `prompt` (kutipan), `options[4]` `{sourceTitle, page}` | indeks 0 sampai 3 |
| `teach` | `prompt`, `topic` | teks penjelasan pemain (10 sampai 4000 karakter) |

Hasil per item: `{ index, type, correct, fraction, correctAnswer, explanation, topic, ref: {sourceId, sourceTitle, page} }`. `ref` dipakai untuk tombol "buka halaman asal". Untuk `teach` ada juga `teach: { understood, score, covered[], missing[], wrong[], reply, animation, emotion, citations[] }`.

## 4. Poin, streak, lencana
- Tiap jawaban benar 100 poin; `teach` memberi sampai 200 poin menurut skor. Bonus kecepatan sampai 50 poin per ronde bila `elapsedMs` dikirim (makin cepat makin besar, sebanding dengan akurasi).
- **Streak:** hari berturut-turut ada sesi yang diselesaikan (UTC). `GET /me/stats` mengembalikan `streak` 0 bila kemarin dan hari ini tidak main.
- **Lencana:** `first_session`, `perfect` (semua benar), `speedster` (rata-rata di bawah separuh waktu dan akurasi minimal 80%), `streak_3`, `streak_7`, `gap_guardian` (misi pemulihan dengan akurasi minimal 80%), `teammate` (selesai bersama pemain lain). Daftar nama ada di `GET /me/stats` (`allBadges`).
- Poin dan streak dihitung sekali per sesi; memanggil `finish` lagi tidak menggandakannya.

## 5. Reaksi maskot
Setiap ronde membawa `cue` (kalimat pembuka, `introAnimation`, `introEmotion`). Setiap jawaban dan hasil akhir membawa `reaction: { animation, emotion }` dari daftar 22 klip di [COMPANION_CONTRACT.md](COMPANION_CONTRACT.md): sempurna `celebrate` dengan ekspresi `semangat`, minimal separuh benar `nod` dengan ekspresi `senang`, dan jawaban lain memakai `sad` dengan ekspresi `semangat`. Tampilkan teks juga, bukan hanya animasi.

## 6. Duel dan kelompok (polling)
1. Pembuat: `POST /sessions` dengan `mode: "duel"` atau `"group"` → `status: "waiting"`, `rounds: []`.
2. Pemain lain (anggota notebook): `POST /sessions/:sid/join`. Duel maksimal 2 pemain, kelompok 12.
3. Pembuat: `POST /sessions/:sid/start` → `status: "running"`, soal terbuka.
4. Semua pemain menjawab ronde sendiri-sendiri; frontend **polling `GET /sessions/:sid/scoreboard` tiap 1 detik** untuk papan skor langsung dan `GET /sessions/:sid` untuk status.
5. Tiap pemain `finish`; sesi `finished` bila semua selesai.
Belum ada WebSocket; polling cukup untuk demo.

The session response includes a stable `hostId`, independent of current score ordering. Only the host can start a shared session, and the API rejects the start until at least two participants have joined. Duel capacity is two players; group capacity is twelve. Session routes remain restricted to notebook members.

## 7. Jelaskan ke maskot dan peta konsep
- `POST /notebooks/:id/companion/teach-back { topic, explanation, sourceIds? }` mengembalikan `evaluation` dan satu `performance` (format yang sama dengan penjelasan maskot): maskot membalas sebagai murid yang bingung, lalu menyebut poin yang kurang dengan sitasi. Bila topik tidak ada di sumber, `checkable: false` dan maskot `shrug`.
- `GET /notebooks/:id/sources/:sourceId/visual?kind=mindmap` mengembalikan `{ nodes: [{id, label, level, page}], edges: [{from, to, label}] }`. Halaman yang tidak ada dibuang; hasil disimpan sehingga panggilan kedua cepat (`cached: true`).

## 8. Feed sosial
| Endpoint | Fungsi |
|---|---|
| `POST /posts` `{ body, attach? }` | posting maks 500 karakter; `attach`: `{type:"notebook", notebookId}` (hanya workspace publik) atau `{type:"result", sessionId}` (hanya sesi yang sudah kamu selesaikan) |
| `GET /feed?scope=all\|following&limit&before` | terbaru dulu; `nextBefore` untuk halaman berikutnya |
| `POST/DELETE /posts/:id/like` | suka (idempoten) |
| `GET/POST /posts/:id/comments`, `DELETE /posts/:id/comments/:commentId` | komentar maks 300 karakter |
| `POST/DELETE /users/:userId/follow`, `GET /users/:userId` | ikuti dan profil publik (tanpa email) |

Tiap posting punya `card` (kartu workspace atau hasil sesi). Workspace yang kemudian menjadi privat tampil sebagai `{ type: "notebook", unavailable: true }` tanpa detail.

## 9. Belum ada
Suara maskot (`voiceNoteId` selalu `null`), audio dan rekaman kuliah sebagai sumber, WebSocket, notifikasi, reset password lewat email.

## 10. Batas dan kuota
20 permintaan AI game per 10 menit per pengguna; 20 posting atau komentar per 10 menit; sesi 3 sampai 10 ronde. Pengecekan jawaban tidak memanggil AI kecuali `teach`.
