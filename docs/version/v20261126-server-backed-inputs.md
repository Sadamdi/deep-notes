# Server-backed frontend inputs

| Attribute | Value |
|---|---|
| **Version** | v0.0.11 |
| **Date** | 2026-11-26 |
| **Status** | In Progress |
| **Author** | Maulvi |
| **Type** | Feature |
| **Area** | backend / frontend / shared / docs |
| **Branch** | `maul/server-backed-inputs` |
| **PR** | — |

## 1. Why

Workspace notes, discussion messages, writer drafts, and saved posts currently live only in one browser. Move those inputs to authenticated API storage so successful server responses appear in the UI and survive reloads and account sessions.

## 2. Plan

- [x] Read repository rules, existing contracts, affected UI, and storage behavior.
- [x] Add shared Zod request/response schemas and database tables for notes, discussion, drafts, and saved posts.
- [x] Add authenticated routes with account/workspace authorization and source/post ownership checks.
- [x] Move affected frontend pages and controls to TanStack Query mutations and server-returned data.
- [x] Offer a safe, explicit import of existing browser data; preserve the local copy and make imports idempotent.
- [x] Use the documented demo API as the development proxy default while keeping an explicit local backend override.
- [x] Update feature, API, environment, and handoff documentation and record verification evidence.
- [x] Run full CI and backend API verification against isolated local PGlite; do not write to the shared hosted demo database.

| Risk | Impact | Mitigation |
|---|---|---|
| Existing local data could be duplicated or lost during import. | User loses or repeats notes, drafts, discussion, or saved posts. | Preserve browser copies, retain IDs for idempotent import, and only show server data after successful responses. |
| Notes and discussions are scoped differently. | Private notes could leak to workspace members or workspace posts to non-members. | Notes are owner-private; discussion is notebook-member-visible; test with separate users and notebooks. |
| The hosted API may not yet run the new migration/routes. | New flows can return a server error until deployment. | Do not alter the shared DB or claim live hosted verification; document the required deployment and verify against local isolated DB. |

## 3. Files changed

| File | Change |
|---|---|
| `shared/src/schemas.ts`, `shared/src/responses.ts` | Request and response contracts for server-backed inputs. |
| `backend/migrations/0005_server_backed_inputs.sql` | Persist notes, discussion, drafts, and saved posts. |
| `pnpm-workspace.yaml` | Permit only the inspected `esbuild` postinstall required by the workspace toolchain. |
| `backend/src/modules/notebooks/notebooks.routes.ts`, `backend/src/modules/feed/feed.routes.ts`, `backend/src/docs/endpoints.ts` | Authenticated CRUD and save/list operations. |
| `frontend/src/pages/*`, `frontend/src/features/*`, `frontend/vite.config.ts` | Server queries, mutations, visible response/error states, local-data import, and remote proxy default. |
| `docs/API_CONTRACT.md`, `docs/frontend/API_HANDOFF.md`, feature docs, flows, TODO/version indexes | Current contract, scope, and verification status. |

## 4. Before and after

Before: the four named features write to `localStorage`; updates are visible only on the current device. After: authenticated API responses are the source of truth, successful mutations refresh the rendered server state, and browser-local data remains available until a user explicitly imports it.

## 5. Data impact

Adds four tables with foreign keys and indexes. The migration is tested only on temporary local PGlite; no hosted/shared database is migrated in this task. Existing browser storage is preserved and imported with explicit user action.

## 6. Verification

- [x] `pnpm run ci`: lint, type checks, 98 backend tests, 35 frontend tests, and production builds passed.
- [x] Exercise create/read/update/delete and save/unsave endpoints with test accounts in isolated PGlite. New coverage: `backend/tests/server-backed-inputs.test.ts` (4 tests).
- [x] Exercise invalid input, unauthenticated access, non-member access, private note isolation, and cross-notebook source isolation.
- [ ] Verify reload and mutation result display in an authenticated browser; not run in this task.
- [x] Verify API-side legacy import is retry-safe; UI preserves browser data.
- [x] Hosted AI/model calls are not part of this task; no real AI result is claimed.

Read-only hosted OpenAPI check on 2026-11-26 returned `200` but does not list the new endpoints. No hosted database writes or migrations were performed; deploy remains T-035. Live authenticated browser verification is pending.

## 7. Rollback

Revert the application changes and add a follow-up migration to remove the four tables only after confirming they contain no user data. Do not run a destructive rollback on a shared database without team-lead approval and a backup.
