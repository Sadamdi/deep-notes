# Frontend Deep Notes: Figma implementation

| Attribute | Value |
|---|---|
| **Version** | v0.0.4 |
| **Date** | 2026-11-25 |
| **Status** | In Progress |
| **Author** | Codex + Deep Notes team |
| **Type** | Feature |
| **Area** | frontend / docs |
| **Branch** | `codex/frontend-agent-guidance` |
| **PR** | — |

## 1. Why

The final Figma file describes a broader Deep Notes experience than the previous scaffold. The frontend now maps its screen families to reusable responsive routes, uses existing API contracts for supported behavior, and labels backend gaps rather than simulating server features.

## 2. Plan

- [x] Map the 188 top-level Figma frames into route families and inspect representative workspace, notes, discussion, Studio, classroom, and visualizer frames.
- [x] Implement the core frontend paths for auth, notebook creation, source upload/processing, grounded answers/citations, quizzes and attempts using existing contracts.
- [x] Reuse shared layouts, form controls, dialogs, page states, source/citation controls, and responsive navigation.
- [x] Implement the supported feed/discovery, notebook/group, games/companion, account, notes/discussion/classroom/visualizer, and writing/publication screen families.
- [x] Add explicit UI handoffs for missing server capabilities; add no speculative routes or response shapes.
- [x] Align brand tokens, text alternatives, focus/keyboard behavior, and responsive layouts with the design system.
- [x] Update feature, flow, design, API handoff, frontend readme, TODO, coverage, and version documents.
- [ ] Complete authenticated API/network/error-path browser verification when the local backend and safe demo session are available.
- [x] Migration or data impact: none; no backend or database changed.

| Risk | Impact | Mitigation |
|---|---|---|
| Some designed interactions have no backend contract | Users could mistake a visual state for a shared/server feature | Label local-only states and show explicit handoffs; track backend work in TODO. |
| The API was not available during browser QA | Authenticated routes and network/error behavior could not be exercised end to end | Keep the verification limit visible in this log and the feature docs; repeat QA after local backend setup. |
| Three.js adds a large optional chunk | Slower first visit to the 3D classroom | Dynamically import Three.js only when the classroom route loads; keep a readable text alternative and WebGL fallback. |

## 3. Files changed

| Area | Change |
|---|---|
| `frontend/src/pages/`, `frontend/src/features/`, `frontend/src/components/` | Add the route screens, feature-level state, shared shell/dialog/state controls, local-first notes/discussion/drafts/bookmarks, and optional 3D classroom. |
| `frontend/src/router.tsx`, `frontend/src/lib/api.ts`, `frontend/src/index.css`, `frontend/index.html` | Route wiring, correct JSON/multipart API handling, design tokens, title/language metadata. |
| `shared/src/` | Add/reuse response and game schemas required by the client; no new backend endpoint. |
| `frontend/public/assets/` | Include companion and brand assets used by the screens. |
| `docs/frontend/`, `docs/features/12-frontend/`, `docs/flows/` | Add Figma coverage, API handoffs, implementation rules, and local-only flow notes. |
| `docs/API_CONTRACT.md`, `docs/DESIGN_SYSTEM.md`, indexes, `frontend/README.md`, `docs/todo/` | Document verified boundaries, implemented components, known backend work, and navigation. |
| `agents/knowledge/lessons.md` | Record the implementation rule for screens without a verified API and for honest frame-coverage reporting. |

Pre-existing changes in `AGENTS.md`, `docs/version/VERSION_INDEX.md`, and `docs/version/v20261125-frontend-agent-guidance.md` from the earlier guidance task are retained and not rewritten except for adding the v0.0.4 status line to the version index.

## 4. Before and after

Before: a small landing/workspace scaffold. After: public/auth, study workspace, source/citation, group, quiz/game, feed/discovery, profile/account, and authoring screen families are available through responsive routes. Unsupported recovery, notification, collaborative note/discussion, bookmarking sync, publication, audio, and live-presence behavior is identified in the UI and [API_HANDOFF.md](../frontend/API_HANDOFF.md).

## 5. Data impact

No database table, migration, seed, or external environment changed. Device-local features use versioned browser storage keys. No user content was uploaded to a third-party service.

## 6. Verification

- [x] `tsc --noEmit` passed in `frontend/`.
- [x] ESLint passed for `frontend/src`.
- [x] Vite production build passed. Build emitted a size warning for the optional dynamically loaded Three.js chunk (about 536 kB before gzip; 132 kB gzip).
- [x] Opened the landing and login pages in a browser at a phone-width viewport; both stack cleanly without horizontal overflow, and the login controls remain readable.
- [ ] Desktop responsive screenshots and authenticated/API-backed flows not checked in this environment.
- [ ] API failure/non-member paths and network behavior not exercised live; `127.0.0.1:4000` was unavailable. No credentials were used.
- [ ] Automated tests were not added or run for this task.
- [ ] Two-notebook isolation and real AI behavior remain backend checks; the frontend uses the existing API contract only.

## 7. Rollback

Revert the frontend/shared/documentation implementation changes for this task. No database rollback is required. Preserve unrelated working-tree changes from the frontend-agent-guidance task.
