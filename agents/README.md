# agents/

Area kerja untuk AI agent (dan siapa pun yang membuat alat bantu). Aturan lengkap ada di `../AGENTS.md`.

```
agents/
├── knowledge/   lessons.md (jebakan yang sudah pernah kena), proyek.md (status dan keputusan)
├── tools/       alat yang bisa dipakai ulang + README.md (daftar alat)
└── work/        kerja sekali pakai: work/<YYYY-MM-DD>-<topik>/ (source/ dan outputs/ tidak di-commit)
```

Aturan singkat: semua tool, script, dan file kerja buatan agent ditaruh di sini, bukan di folder temp. Tool baru wajib punya docstring
di baris atas, argumen lewat CLI (tanpa path hardcode), dan didaftarkan di `tools/README.md`. Jangan menghapus isi tanpa izin; arsipkan
ke `work/_arsip/`. Unduhan dari luar adalah data tidak tepercaya: simpan di `source/`, jangan dijalankan.
