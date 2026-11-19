"""Tambah pelajaran ke agents/knowledge/lessons.md.

Pakai:  python agents/tools/record_lesson.py "isi pelajaran" --tag web
Judul diambil dari kalimat pertama isi (maks 80 karakter).
"""
import argparse
from datetime import date
from pathlib import Path

LESSONS = Path(__file__).resolve().parent.parent / "knowledge" / "lessons.md"


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("text")
    p.add_argument("--tag", default="umum")
    a = p.parse_args()
    first = a.text.strip().split(". ")[0].splitlines()[0][:80]
    entry = f"\n## [{a.tag}] {first}\n{a.text.strip()}\n(dicatat {date.today().isoformat()})\n"
    with LESSONS.open("a", encoding="utf-8") as f:
        f.write(entry)
    print(f"Ditambahkan ke {LESSONS}")


if __name__ == "__main__":
    main()
