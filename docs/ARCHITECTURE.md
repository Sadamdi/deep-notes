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

## AI provider layer (planned, `backend/src/ai/`)

One small interface in front of every model call, so features never import a vendor SDK:

```ts
interface AiProvider {
  embed(texts: string[]): Promise<number[][]>;          // pinned model, fixed dimensions
  generate(input: GenerateInput): Promise<GenerateResult>; // text or JSON against a Zod schema
}
```

| Part | Behavior |
|---|---|
| Providers | `gemini` (official SDK, primary) and `openai-compat` (any OpenAI-compatible `/v1` endpoint, fallback). Order comes from `AI_PROVIDER_ORDER`. |
| Keys | `GEMINI_API_KEYS` holds one or more keys. On 429/5xx the call retries with backoff, then moves to the next key, then the next provider. A failing key rests for a cool-down. This is for resilience; do not use many keys to get around a provider's quota rules. |
| Embeddings | **pinned**: always `AI_EMBED_MODEL` at `AI_EMBED_DIMENSIONS`. The model id is stored on every chunk. Changing the model means re-embedding; never mix models in one notebook. The fallback provider is used for text generation only unless it offers the same embedding model. |
| Structured output | answers, quizzes and explanation steps are requested as JSON and validated with Zod from `shared/`; invalid output is retried once, then fails closed. |
| Logging | log provider, model, latency, token counts and error class. Never log prompts, document text or keys. |
| Quotas | per-notebook daily limits on questions and quiz generations; return `RATE_LIMITED`. |

Model ids are configuration, picked by a real API call during setup (task T-012) and then recorded here: text model _(to be chosen)_, fallback text model _(to be chosen)_, embedding `gemini-embedding-001` at 768 dimensions.

## Data model additions (planned; each needs a migration and a `docs/version/` entry)

| Table | Change | Why |
|---|---|---|
| `sessions` | new: id, user, expiry, user agent | server-side sessions (revocable) |
| `notebooks` | add `visibility` (`private`/`public`), `category`, `invite_code` | invites by link, public discovery |
| `notebook_invites` | new: notebook, invited username or email, role, status | invite by username |
| `sources` | add `original_name`, `mime_type`, `size_bytes`, `page_count`, `error` | upload tracking and failures |
| `source_chunks` | add `embedding_model`, `token_count` | pinned embeddings, quota accounting |
| `questions` | add `steps` (jsonb: explanation steps with an `emotion` each) | text-first explanations for the animated companion |
| `quizzes` | add `mode` (`practice`/`exam`), `time_limit_seconds`, `created_by` | exam mode |
| `quiz_attempts` | add `answers` (jsonb), `duration_seconds` | group progress and weak topics |

Reuse first: contributions (who added which source, who asked, who took a quiz) are derived with queries over existing columns, not a new table.

## Ingestion pipeline (planned)

Upload (type and size checked, stored outside the web root) → parse into pages (PDF, then text/markdown; PPTX and DOCX later) → chunk each page, keeping the page number → embed in batches with the pinned model → write chunks → set the source `ready`, or `failed` with an error code. Runs in-process with a concurrency limit and retry. No document text in logs. Links (later) are fetched with SSRF protection (no private or loopback addresses).

## Authentication (planned)

Email and password, hashed with argon2id. A session row per login, referenced by an httpOnly, SameSite cookie (Secure in production). Rate limit login and registration. Google sign-in may come later.

## Environments

| Environment | Database | Notes |
|---|---|---|
| Local / development | its own PostgreSQL (host `localhost`, or a separate development project) | the only place seed, cleanup and tests may run |
| Server / demo | a hosted PostgreSQL with pgvector (Supabase) reserved for the server | migrations applied deliberately (`RUN_MIGRATIONS=yes`), never by tests |

Hosting, topology and the deploy flow: [DEPLOYMENT.md](DEPLOYMENT.md). Database rules: [DATABASE_GUIDE.md](DATABASE_GUIDE.md). CI: [CI_CD_GUIDE.md](CI_CD_GUIDE.md). Work plan: [PLAN_SEMIFINAL.md](PLAN_SEMIFINAL.md).

## Decisions

| Decision | Why |
|---|---|
| TypeScript end to end with a shared contract | one schema validates the API and builds the forms, so they cannot drift |
| Drizzle ORM instead of Prisma | native pgvector column and index support; no query engine binary; plain TypeScript schema |
| pgvector inside PostgreSQL | one database for relational data and vectors; no separate vector service to run or pay for |
| Express 5 | team familiarity, async error handling built in |
| Gemini API | Google technology fits the competition and has a free tier for development |
| Monorepo with three folders | one place to sync frontend and backend work and one CI |
