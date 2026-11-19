# Repository scaffold

| Attribute | Value |
|---|---|
| **Version** | v0.0.1 |
| **Date** | 2026-11-19 |
| **Status** | Released (local scaffold; not yet pushed) |
| **Author** | Adam |
| **Type** | Docs / Config |
| **Area** | backend, frontend, shared, docs |

## 1. Why

Give the team one synchronized starting point: one repo, agreed structure, conventions, CI, and docs, so frontend and backend work can proceed in parallel.

## 3. Files changed

| Area | Change |
|---|---|
| root | pnpm workspace, TypeScript base config, ESLint config, editorconfig, gitignore |
| `shared/` | Zod schemas: response envelope, error codes, cursor pagination, health, notebook/citation/answer types |
| `backend/` | Express 5 skeleton with layered module pattern, env validation, error handling, health module and test, Drizzle schema (users, notebooks, members, sources, chunks with vectors, questions, quizzes), guarded seed and cleanup scripts |
| `frontend/` | Vite + React 19 + Tailwind v4 + shadcn base, router, TanStack Query, API client, sample pages (labeled sample data), form with shared Zod schema, TanStack Table, lazy three.js view |
| `docs/`, `agents/`, `.cursor/`, `.github/` | documentation, agent SOP and rules, CI workflow, PR template |

## 6. Verification

- [x] `pnpm lint`, `pnpm type-check`, `pnpm test` (2 backend tests), `pnpm build` all pass locally
- [ ] database migrations: schema is defined but no migration generated or applied yet
- [ ] AI calls: not implemented, so not verified
- [ ] CI run on GitHub: pending the first push

## 7. Rollback

Nothing is deployed; delete the branch.
