# Workspace AI actions across learning tools

| Attribute | Value |
|---|---|
| **Version** | v0.0.6 |
| **Date** | 2026-11-25 |
| **Status** | In Progress |
| **Author** | team |
| **Type** | Feature |
| **Area** | backend / frontend / shared / docs |
| **Branch** | `main` |
| **PR** | n/a |

## 1. Why

Learning inputs are spread across the workspace, notes, discussion, and writing tools. Users need source-grounded help wherever they work, with clear citations and control over which ready materials Bubi can use.

## 2. Plan (fill before coding)

- [x] Add a shared Zod request/response contract and a notebook-scoped assist endpoint that retrieves ready source passages, validates citations, and refuses unsupported outputs.
- [x] Reuse one persisted source scope across ask, companion, quiz, game, and writing/notes assistance; keep single-source visualizations explicitly tied to a selected source.
- [x] Add on-demand question suggestions and reviewable AI actions for notes, discussion drafts, and Studio writing; add a path to turn an eligible note into a reusable text source.
- [x] Keep all generated text editable and require explicit user action before replacing or saving content; preserve existing local-only storage boundaries.
- [x] Update API/feature/flow/version documentation and verify request validation, access control, citations, and real UI behavior where the configured backend permits.

| Risk | Impact | Mitigation |
|---|---|---|
| AI could produce claims that do not appear in a notebook source | Misleading study content | Retrieve only ready, authorized chunks; validate every citation; return a not-found response without valid support |
| Notes, discussion, and Studio drafts are stored locally | Users may assume they are shared | Keep the existing local-storage labels and require explicit action to create a workspace source |
| Source selection can refer to deleted or processing materials | Failed or stale AI requests | Filter selection to ready sources at submit time and show an actionable empty state |

## 3. Files changed

| File | Change |
|---|---|
| `shared/src/notebook.ts`, `shared/src/responses.ts` | Request and response contracts for task-scoped workspace AI help |
| `backend/src/modules/answers/answers.service.ts`, `answers.routes.ts` | Ready-source retrieval, rate-limited member endpoint, citation validation, and refusal |
| `frontend/src/features/sources/useSourceScope.ts`, `SourceScopePicker.tsx` | Per-notebook scope shared across learning tools |
| `frontend/src/features/answers/AiAssistPanel.tsx`, `useSelectedText.ts` | Reviewable actions for selected/current text and on-demand cached questions |
| `frontend/src/pages/WorkspaceNotesPage.tsx`, `WorkspaceDiscussionPage.tsx`, `StudioPage.tsx` | Source-grounded help and explicit apply/save controls; note-to-source action |
| Quiz/game/companion/ask pages | Apply the shared source scope to existing AI requests |
| API, feature, flow, design-system, handoff, and version docs | Document contracts, local-storage boundaries, behavior, and verification |

## 4. Before and after

Before: AI interaction is available in the ask/companion panels and source-driven quiz/game flows, while notes, discussion drafts, and Studio content have no source-aware assistance. Source selection is page-local.

After: users can request grounded suggestions and writing help from the current workspace sources, review generated output before applying it, and use one saved source scope across learning tools.

## 5. Data impact

No database migration. A user-triggered note-to-source action uses the existing source ingestion endpoint. Source-scope preference is stored in browser local storage per notebook.

## 6. Verification

- [x] Package lint, type-check, tests, and builds run directly because the `pnpm ci` wrapper attempted a guarded install in a non-interactive shell.
- [x] Exercise assist endpoint with grounded, unsupported, invalid, unauthenticated, and non-member requests (PGlite integration tests with deterministic fake AI).
- [x] Check source isolation and citation validation.
- [x] Inspect the live browser UI for ask, notes, discussion, Studio, quiz, and game source-scope states; do not submit real user material.
- [x] Record model/backend availability: the added route is not deployed to the configured remote API, so a real-model call was not run.
- [ ] Deploy the backend route and exercise the actual model against a safe demo notebook.

Test result: backend 10 files / 92 tests passed; frontend 1 file / 16 tests passed; shared/backend/frontend type-checks and lint passed; backend and frontend builds passed. The frontend build reports the existing Three.js chunk over 500 kB.

## 7. Rollback

Remove the additive shared contract, route/service, frontend actions, and docs. No database migration is required. Existing source ingestion and learning flows remain usable.
