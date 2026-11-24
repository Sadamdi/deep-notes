# SOP 02: Desain API dan penanganan error

## Bentuk
- Semua path di bawah `/api/v1`. Sumber daya jamak, huruf kecil, bertingkat di bawah notebook: `/notebooks/:id/quizzes`.
- Respons sukses: `{ "success": true, "data": … }`. Gagal: `{ "success": false, "error": { "code", "message", "details?" } }`.
- Kode error tetap: `VALIDATION` 400, `UNAUTHORIZED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `CONFLICT` 409, `RATE_LIMITED` 429, `INTERNAL` 500.
- Pembuatan mengembalikan `201`; pekerjaan latar (unggah sumber) mengembalikan `202` dengan status yang bisa dipantau.

## Aturan
1. Validasi semua masukan dengan Zod lewat middleware `validate`; jangan percaya `req.body`.
2. Bukan anggota notebook mendapat `404`, bukan `403`, agar keberadaan data grup lain tidak bocor. `403` hanya untuk anggota dengan peran kurang.
3. Kesalahan tak terduga menjadi `INTERNAL` tanpa jejak tumpukan; detail masuk log.
4. Pesan error untuk pengguna: jelas, tidak membocorkan internal, tidak membedakan "email tidak ada" dari "password salah".
5. Endpoint yang memanggil AI wajib punya rate limit dan tidak boleh mengembalikan jawaban tanpa sitasi tervalidasi yang ditandai `grounded: true`.
6. Perubahan yang merusak kontrak (nama field, bentuk respons) harus diumumkan ke tim frontend di pull request yang sama dan dicatat di [../API_CONTRACT.md](../API_CONTRACT.md).
7. Daftar nama gerakan maskot adalah kontrak: tambah lewat `shared/src/companion.ts`, jangan kirim nama di luar daftar.
