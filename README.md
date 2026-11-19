# Deep Notes

Shared, source-grounded AI notebooks for student study groups.

A study group keeps one notebook per course. Members upload their sources (PDFs, slides, links). Anyone can ask a
question and the assistant answers **only from those sources**, showing the source and page it used. The notebook also
generates short quizzes from the same sources and shows who contributed what.

Built for STACK 2026 (GDGoC ITB), Case 1: Smarter Campus and Learning. Team: Aku Nak Menang Hackathon.

> Status: early scaffold. Planned features are not finished features; see [docs/ROADMAP.md](docs/ROADMAP.md) for what exists today.

## Repository layout

```
frontend/   React 19 + TypeScript, Vite, Tailwind CSS v4, shadcn/ui, TanStack Query/Table, React Hook Form, three.js
backend/    Node 22, TypeScript, Express 5, Zod, Drizzle ORM, PostgreSQL + pgvector
shared/     Zod schemas and types used by both sides (the API contract)
docs/       architecture, API contract, design system, features, versions, todo, flows
agents/     tools, knowledge and working files for AI agents (see AGENTS.md)
```

## Getting started

Requirements: Node 22+, pnpm 10, PostgreSQL 16 with the `pgvector` extension (local), a Gemini API key.

```bash
pnpm install
cp backend/.env.example backend/.env    # then edit values; never commit .env
pnpm dev                                # frontend on :5173, backend on :4000
```

Useful commands:

| Command | What it does |
|---|---|
| `pnpm dev` | run frontend and backend together |
| `pnpm lint` / `pnpm type-check` / `pnpm test` / `pnpm build` | the same checks CI runs |
| `pnpm ci` | all four, in order |
| `pnpm --filter @deep-notes/backend db:generate` | create a migration from `schema.ts` |
| `pnpm --filter @deep-notes/backend db:migrate` | apply migrations (local database only) |
| `pnpm --filter @deep-notes/backend db:seed` | insert test accounts (safe to repeat) |

## Working on this repo

Read [AGENTS.md](AGENTS.md) first (humans too): branch and PR flow, definition of done, data and secret safety, and which
docs to update with each change. Documentation index: [docs/README.md](docs/README.md).

## AI assistance disclosure

AI tools are used in development and inside the product (answering and quiz generation). Material AI assistance in building
the project is recorded in [docs/AI_DISCLOSURE.md](docs/AI_DISCLOSURE.md).
