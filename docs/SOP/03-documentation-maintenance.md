# SOP 03: Menjaga dokumentasi tetap benar

Dokumentasi hanya berguna kalau cocok dengan kode. Aturannya sederhana: **kode yang berubah, dokumennya berubah di pull request yang sama.**

## Peta dokumen dan siapa yang memperbaruinya

| Perubahan | Dokumen yang wajib diperbarui |
|---|---|
| Endpoint baru atau berubah | `backend/src/docs/endpoints.ts` (Swagger otomatis ikut), [../API_CONTRACT.md](../API_CONTRACT.md) |
| Bentuk maskot, gerakan, unggahan | `shared/src/companion.ts`, [../COMPANION_CONTRACT.md](../COMPANION_CONTRACT.md) |
| Aturan bisnis fitur | `docs/features/<area>/<nama>.md` (nomor BR-XX) dan [../features/FEATURE_INDEX.md](../features/FEATURE_INDEX.md) |
| Status pekerjaan | [../ROADMAP.md](../ROADMAP.md), hanya setelah ada tes, dokumen, dan hasil jalan nyata |
| Pilihan arsitektur atau model | [../ARCHITECTURE.md](../ARCHITECTURE.md), [../product/MODEL_SELECTION.md](../product/MODEL_SELECTION.md) |
| Angka evaluasi | jalankan `eval:grounding`; laporan bertanggal tersimpan di `docs/evaluation/` |
| Server atau deploy | [../DEPLOYMENT.md](../DEPLOYMENT.md) |
| Gambaran umum | [../../README.md](../../README.md), README di `backend/` dan `frontend/` |

## Aturan penulisan
- Tulis apa adanya. Bila belum diverifikasi, tulis "belum diverifikasi"; jangan memberi contoh palsu.
- Angka dalam dokumen berasal dari hasil jalan nyata, lengkap dengan tanggal dan batasannya.
- Fitur yang belum dibuat ditandai `planned`, bukan ditulis seolah sudah ada.
- Tidak ada rahasia, kata sandi, atau data pribadi anggota di dokumen.
- Dokumen untuk agent AI (`AGENTS.md`, `agents/knowledge/`) memakai bahasa yang sama dengan dokumen manusia; satu sumber kebenaran.

## Pemeriksaan sebelum merge
- `pnpm test` menjalankan `docs.test.ts`: dokumen endpoint dan server tidak boleh berbeda.
- Cari janji yang usang: `grep -rn "planned" docs/` dan cocokkan dengan kode.
