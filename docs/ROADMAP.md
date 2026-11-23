# Roadmap

Detailed plan with owners, priorities and dates: [PLAN_SEMIFINAL.md](PLAN_SEMIFINAL.md). This file is the status view; update the status column when an item is verified.

Key dates (from the official handbook; they may change): semifinal submission **30 Nov 2026** (proposal PDF and a video of at most 2 minutes), Top 10 announcement 7 Dec, Final Day **16 Dec** (working prototype, 10 minute demo, Q&A).

Status legend: `done` (exists in the code, tested, verified), `in progress`, `next`, `later`.

| Phase | Item | Status |
|---|---|---|
| Foundation | repo, workspace, CI, shared contract, health endpoint, base UI, docs and agent rules | done (scaffold) |
| P0 to P4 backend (done 24 Nov, ahead of plan) | F-01..F-07 accounts, notebooks, ingestion (PDF, text, DOCX, PPTX, links), cited answers, quizzes, contributions, grounding evaluation | done on the backend: 44 automated tests, live check 15 of 15 against real models and database |
| P5 backend (done 24 Nov) | F-08, F-09, F-10, F-11, F-14, F-15, F-16, F-17 | done on the backend, same tests |
| Server | API on the shared VPS behind a Cloudflare quick tunnel, Supabase database | running; tunnel URL changes on restart, stable domain still to decide |
| Next (Adam) | rotate exposed secrets; enlarge evaluation with real course material; survey to 30 or more answers; proposal and video | next |
| Next (frontend, other members) | screens for every endpoint in API_CONTRACT.md; companion animation using `emotion`; F-13 voice with browser speech APIs | next |
| P4 (28 to 30 Nov) | F-05 quizzes; F-06 contributions; demo notebook; proposal and video submitted | next |
| P5 frontend (1 to 10 Dec) | screens and companion for F-08..F-17; trial with real students | later |
| P6 (10 to 15 Dec) | hardening, quotas, backups, demo rehearsal | later |
| Beyond | F-12 PPTX/DOCX/links, F-13 voice, F-14 study partners | later |

Move an item to `done` only when it has a test, a feature doc, and a verified run.
