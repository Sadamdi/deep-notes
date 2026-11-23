# Roadmap

Detailed plan with owners, priorities and dates: [PLAN_SEMIFINAL.md](PLAN_SEMIFINAL.md). This file is the status view; update the status column when an item is verified.

Key dates (from the official handbook; they may change): semifinal submission **30 Nov 2026** (proposal PDF and a video of at most 2 minutes), Top 10 announcement 7 Dec, Final Day **16 Dec** (working prototype, 10 minute demo, Q&A).

Status legend: `done` (exists in the code, tested, verified), `in progress`, `next`, `later`.

| Phase | Item | Status |
|---|---|---|
| Foundation | repo, workspace, CI, shared contract, health endpoint, base UI, docs and agent rules | done (scaffold) |
| P0 Foundation (23 to 25 Nov) | plan, deployment design, env and database configuration | in progress |
| P0 | rotate exposed secrets; development database; first migration | next |
| P0 | AI client smoke test and model choice (T-012) | next |
| P0 | server bootstrap and health endpoint live on the server | next |
| P1 (25 to 27 Nov) | F-01 accounts and sessions; F-02 notebooks, members, invites, with isolation tests | next |
| P2 (26 to 28 Nov) | F-03 source upload and page-aware ingestion | next |
| P3 (27 to 29 Nov) | F-04 cited answers with the not-found fallback; F-07 grounding evaluation | next |
| P4 (28 to 30 Nov) | F-05 quizzes; F-06 contributions; demo notebook; proposal and video submitted | next |
| P5 (1 to 10 Dec) | F-08 group progress; F-09 exam mode; F-10 explanation steps; F-11 public notebooks | later |
| P6 (10 to 15 Dec) | hardening, quotas, backups, demo rehearsal | later |
| Beyond | F-12 PPTX/DOCX/links, F-13 voice, F-14 study partners | later |

Move an item to `done` only when it has a test, a feature doc, and a verified run.
