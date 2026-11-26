# TODO index

Open work lives here. One line per item; link a doc if it needs more than a line. Items without an owner are up for grabs. Copy [_TODO_TEMPLATE.md](_TODO_TEMPLATE.md) for items that need detail. Feature IDs (F-xx) come from [../PLAN_SEMIFINAL.md](../PLAN_SEMIFINAL.md).

| ID | Area | Item | Owner | Priority | Status |
|---|---|---|---|---|---|
| T-001 | backend | F-01 accounts and sessions (register, login, logout, me), rate limits | Adam | high | open |
| T-002 | backend | F-02 notebooks, membership, invites, with two-notebook isolation tests | Adam | high | open |
| T-003 | backend | F-03 source upload, page-aware chunking, embeddings, status | Adam | high | open |
| T-004 | backend | F-04 cited question answering with the not-found fallback | Adam | high | open |
| T-005 | backend | F-05 quizzes and attempts | Adam | high | open |
| T-006 | backend | generate the first Drizzle migration; apply it to the development database | Adam | high | open |
| T-007 | frontend | auth screens and notebook list | team | high | open |
| T-008 | frontend | notebook workspace: sources, ask, answer card with citation chips | team | high | open |
| T-009 | shared | schemas for accounts, invites, sources, quizzes, contributions, progress | Adam | high | open |
| T-010 | infra | server bootstrap and first deploy ([DEPLOYMENT.md](../DEPLOYMENT.md)); health live | Adam | high | open |
| T-011 | product | collect many more survey responses (target 30 or more) and update the evidence | team | high | open |
| T-012 | backend | AI provider layer; list available models with a real call; choose and record text and fallback models | Adam | high | open |
| T-013 | backend | F-06 contributions endpoint | Adam | high | open |
| T-014 | backend | F-07 grounding evaluation script and report (`backend/scripts/eval-grounding.ts`) | Adam | high | open |
| T-015 | infra | **rotate every secret that was pasted in chat**; create a key-only deploy user ([DEPLOYMENT.md](../DEPLOYMENT.md) section 1) | Adam | urgent | open |
| T-016 | infra | decide the domain or subdomain for the demo and set up TLS | Adam | medium | open |
| T-017 | product | verify the comparison table against official NotebookLM pages ([COMPETITIVE_ANALYSIS](../product/COMPETITIVE_ANALYSIS.md)) | team | high | open |
| T-018 | product | proposal PDF (max 10 content pages, English) and 2 minute video, due 30 Nov | team | high | open |
| T-019 | backend | F-08 group progress; F-09 exam mode | Adam | medium | open |
| T-020 | backend | F-10 explanation steps with `emotion`; coordinate the enum with the design members | Adam | medium | open |
| T-021 | backend | F-11 public notebooks, categories, search | Adam | medium | open |
| T-022 | frontend | companion character assets and animations (design members) | team | medium | open |
| T-023 | infra | backups: `pg_dump` schedule and off-machine copy; confirm the hosting provider's backup tier | Adam | medium | open |
| T-024 | backend | notification list/read state and event contract | Adam | medium | open |
| T-025 | backend | account-scoped workspace notes with source/page references | Adam | medium | implemented locally; demo deploy pending |
| T-026 | backend | workspace discussion messages, source attachments, and refresh/broadcast contract | Adam | medium | implemented locally; demo deploy pending; realtime remains open |
| T-027 | backend | account-scoped saved-post operations and saved-post listing | Adam | medium | implemented locally; demo deploy pending |
| T-028 | backend | publication/article/author-publication APIs, visibility, media, and comments | Adam | medium | open |
| T-029 | backend | password-recovery request and time-limited reset-token flow | Adam | medium | open |
| T-030 | backend | define classroom presence/session events if live attendance is required | Adam | low | open |
| T-031 | backend | structured slide and spreadsheet visualization contracts (presentation timeline and charts) | Adam | medium | implemented locally; shared database rollout pending |
| T-032 | backend | audio upload and timestamped transcription; voice output remains on the browser speech path | Adam | medium | implemented locally; real Gemini transcription and rollout pending |
| T-033 | frontend | run authenticated/API-backed and desktop responsive browser QA when the local backend and safe demo session are available | team | high | mocked desktop/mobile game flow implemented; live API QA pending |
| T-034 | infra | deploy the workspace AI assist route and verify it with a real model on a safe demo notebook | Adam | high | open |
| T-035 | infra | deploy migration 0005 and server-backed notes, discussion, drafts, and saved-post routes after review | Adam | high | open |
