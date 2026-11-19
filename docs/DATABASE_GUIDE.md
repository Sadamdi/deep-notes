# Database guide

PostgreSQL 16 with the `pgvector` extension. Schema lives in `backend/src/db/schema.ts` (Drizzle). Migrations are generated into
`backend/drizzle/` and committed.

## Conventions

- Primary keys are `uuid` with `defaultRandom()`. Timestamps are `timestamptz` with `defaultNow()`.
- Enum-like columns are stored as `text` and validated with Zod in `shared/`, so a new value never needs a migration.
- **Reuse first.** Do not add a table or column if an existing one can carry the data. If a new one is needed, state why in the
  `docs/version/` entry.
- Foreign keys cascade for data owned by a notebook; user rows are never cascaded away silently.
- Vector size is `EMBEDDING_DIMENSIONS` (768). Changing it is a migration plus a re-embedding job, so decide once.
- Plain Drizzle queries for normal access. Raw SQL is allowed only for vector search, and it must keep the notebook filter inside
  the query.

## Migrations

```bash
pnpm --filter @deep-notes/backend db:generate    # create SQL from schema.ts changes
pnpm --filter @deep-notes/backend db:migrate     # apply to DATABASE_URL
```

1. Generate, then **read the SQL** before applying.
2. Apply to the local database first.
3. Applying to any non-local database needs the team lead's explicit go-ahead and a `pg_dump` backup first.
4. Never edit an applied migration; add a new one.

## Local database

Run PostgreSQL with pgvector on your machine (a Docker image such as `pgvector/pgvector:pg16` works, or a native install) and enable
the extension once: `CREATE EXTENSION IF NOT EXISTS vector;`. `DATABASE_URL` in `backend/.env` must have host `localhost`.

## Seed and cleanup (kept separate on purpose)

| Script | Does | Safety |
|---|---|---|
| `db:seed` | inserts the shared test accounts; only adds missing rows | refuses unless the host is localhost |
| `db:cleanup` | truncates all application tables | refuses unless the host is localhost; run by hand, never from tests |

Do not combine them and do not call cleanup from test setup. Tests that need a database run against a dedicated test database or in
CI, never against a shared one.

## Test accounts

Kept outside git in `docs/local/TESTING_ACCOUNTS.local.md`; the format is in [TESTING_ACCOUNTS.example.md](TESTING_ACCOUNTS.example.md).
Test accounts must never be seeded into a shared or production database.
