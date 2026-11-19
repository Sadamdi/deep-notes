# Architecture

## Overview

```
Browser (frontend, React)
   │  HTTPS /api/v1  (Vite dev proxy in development)
   ▼
Backend (Express 5, TypeScript)
   │  routes → controller → service → repository
   ├── PostgreSQL 16 + pgvector (Drizzle ORM)
   └── Gemini API (embeddings, answers, quizzes)

shared/  Zod schemas + types imported by both frontend and backend
```

One repository, one pnpm workspace with three packages:

| Package | Name | Role |
|---|---|---|
| `frontend/` | `@deep-notes/frontend` | UI. Calls the backend only through `src/lib/api.ts`. |
| `backend/` | `@deep-notes/backend` | HTTP API, retrieval, AI calls, persistence. |
| `shared/` | `@deep-notes/shared` | The contract: request/response schemas, error codes, domain types. Shipped as TypeScript source; the backend bundles it and Vite compiles it. |

## Backend layering

Each feature module lives in `backend/src/modules/<name>/` with the same four files:

| File | May do | Must not |
|---|---|---|
| `<name>.routes.ts` | map paths to controllers, attach `validate` and auth middleware | contain logic |
| `<name>.controller.ts` | read the validated request, call a service, shape the response | touch the database or the AI client |
| `<name>.service.ts` | business rules, orchestration, authorization checks | touch `req`/`res` |
| `<name>.repository.ts` | Drizzle queries | contain business rules |

Cross-cutting code: `config/env.ts` (validated environment), `lib/` (errors, response helpers), `middleware/` (async wrapper,
validation, error handler), `db/` (schema and client).

## Answering with citations (core design)

1. **Ingest.** An uploaded source is split into pages, then into chunks that remember their page number. Each chunk is embedded
   and stored in `source_chunks` (vector column, HNSW index). Source status moves `processing → ready | failed`.
2. **Retrieve.** For a question, embed it, then fetch the nearest chunks **restricted to the notebook's sources**. The
   notebook filter is part of the query, never applied afterwards.
3. **Answer.** Send only the retrieved chunks to the model with an instruction to answer from them and to refuse otherwise.
4. **Validate.** The response must map to chunks that were actually retrieved. Each citation carries source, page and quote.
   If no retrieved chunk supports the answer, return `grounded: false` ("not found in the sources").
5. **Store.** The question, answer and citations are saved in `questions` so the group can review them.

The answer type is a discriminated union in `shared/src/notebook.ts`: grounded answers require at least one citation.

## Authorization model

- Membership is per notebook (`notebook_members.role`: `owner | editor | viewer`).
- Every notebook-scoped query filters by a notebook the caller belongs to. A user outside the notebook gets `404`, not `403`,
  so the existence of a notebook is not revealed.
- Tests must cover two notebooks and confirm no cross-leakage.

## Environments

| Environment | Database | Notes |
|---|---|---|
| Local | local PostgreSQL (host `localhost`) | the only place seed/cleanup scripts may run |
| Shared / demo | hosted PostgreSQL with pgvector | migrations applied deliberately, never by tests |

See [DATABASE_GUIDE.md](DATABASE_GUIDE.md) and [CI_CD_GUIDE.md](CI_CD_GUIDE.md).

## Decisions

| Decision | Why |
|---|---|
| TypeScript end to end with a shared contract | one schema validates the API and builds the forms, so they cannot drift |
| Drizzle ORM instead of Prisma | native pgvector column and index support; no query engine binary; plain TypeScript schema |
| pgvector inside PostgreSQL | one database for relational data and vectors; no separate vector service to run or pay for |
| Express 5 | team familiarity, async error handling built in |
| Gemini API | Google technology fits the competition and has a free tier for development |
| Monorepo with three folders | one place to sync frontend and backend work and one CI |
