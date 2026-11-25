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
| T-007 | frontend | auth screens and notebook list | Ulin | high | done (v0.0.4) |
| T-008 | frontend | notebook workspace: sources, ask, answer card with citation chips | Ulin | high | done (v0.0.4) |
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
