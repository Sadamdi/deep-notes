# Auth screens, social feed, profile, and core workspace study flow

| Attribute | Value |
|---|---|
| **Version** | v0.0.4 |
| **Date** | 2026-11-25 |
| **Status** | In Progress |
| **Author** | Ulinnuha Mahbubi |
| **Type** | Feature |
| **Area** | frontend, docs |
| **Branch** | `ulin/frontend-ui` |
| **PR** | pending |

## 1. Why

Deliver the end-to-end study group prototype on top of the Figma shell: student registration and sign-in, workspace creation and invite acceptance, multi-format source upload with page preview, grounded Bubi Q&A with clickable citations and ungrounded fallback, practice/weekly quizzes, group contribution/gap/assignment board, social feed, and account profile/settings.

## 2. Plan (fill before coding)

- [x] Export additional Figma SVG assets (`bubi-antusias.svg`, `bubi-sedih.svg`, `upload.svg`, `complete.svg`).
- [x] Update `frontend/src/lib/api.ts` so `FormData` multipart uploads omit the JSON content-type header.
- [x] Add `useAuth` session hook (`GET /api/v1/auth/me`, `POST /api/v1/auth/logout`) and surface signed-in status in `AppLayout` and `MobileMenuPage`.
- [x] Build standalone Figma screens: `LandingPage` (`/pembuka`), `LoginPage` (`/masuk`), `RegisterPage` (`/daftar`), `AccountRecoveryPage` (`/pemulihan`, labeled UI simulation), and `JoinInvitePage` (`/join/:token`).
- [x] Upgrade `NotebookPage` (`/notebooks/:notebookId`) into the 3-column Figma workspace (`Sumber` with file/text/link upload and reference filter, `Belajar bersama Bubi` with style/level controls, grounded citation chips, and `grounded: false` warning state, and `Pratinjau Sumber` page reader) plus `Sesi dan Kuis` and `Papan Kelompok` (contributions, knowledge gaps, member assignments, and invites).
- [x] Connect `HomePage` (`/`) and `/mengikuti` to `/api/v1/feed` and `/api/v1/posts`, `ExplorePage` (`/jelajah`) to join-requests, `ProfilePage` (`/profil`) to `/api/v1/me/stats` and `/api/v1/me/profile`, and `SettingsPage` (`/pengaturan`) to password, session, and data-export endpoints.
- [x] Update `docs/DESIGN_SYSTEM.md` and `docs/todo/TODO_INDEX.md`.
- [ ] Complete full automated two-account browser click-through (paused waiting for local webview permission prompt).

| Risk | Impact | Mitigation |
|---|---|---|
| Multipart `FormData` upload broken by default `application/json` header | File uploads fail with 400 | Detect `FormData` in `api()` and let browser attach multipart boundary |
| Ungrounded AI answer shown without clear distinction | Violates grounding rule | Render `warning` banner and `bubi-sedih.svg` with zero citation chips whenever `grounded === false` |
| Non-localhost or missing AI keys during local dev | AI endpoints fail or touch wrong DB | Keep local verification against embedded PGlite; surface API errors clearly in UI without stack traces |

## 3. Files changed

| File | Change |
|---|---|
| `frontend/src/assets/**` | Add `bubi-antusias.svg`, `bubi-sedih.svg`, `upload.svg`, `complete.svg` |
| `frontend/src/lib/api.ts` | Support `FormData` bodies alongside JSON |
| `frontend/src/features/auth/*` | `useAuth` hook and shared split Bubi auth layout |
| `frontend/src/features/notebooks/*` | Workspace 3-column study panel, source upload & page preview, quiz runner, and group board |
| `frontend/src/pages/*` | `LandingPage`, `LoginPage`, `RegisterPage`, `AccountRecoveryPage`, `JoinInvitePage`, `HomePage`, `ExplorePage`, `WorkspacesPage`, `NotebookPage`, `ProfilePage`, `SettingsPage`, `MobileMenuPage` |
| `frontend/src/components/AppLayout.tsx` | Signed-in user summary, sign-out button, and sign-in/landing shortcuts |
| `frontend/src/router.tsx` | Register standalone auth/landing/invite routes and upgraded app routes |
| `docs/DESIGN_SYSTEM.md`, `docs/todo/TODO_INDEX.md` | Mark built domain components and frontend tasks |

## 4. Before and after

Before: shell and navigation with unauthenticated placeholders on protected endpoints.
After: working end-to-end authentication, 3-column workspace study flow (upload, reference picker, cited Bubi explanation, page preview, quizzes, group board), feed, profile, and account settings wired to `/api/v1`.

## 5. Data impact

None to schema or migrations. Local verification writes only to embedded PGlite. Applied to a non-local database? No.

## 6. Verification

- [x] `pnpm lint`, `pnpm type-check`, `pnpm test`, and `pnpm build` pass across `shared`, `backend`, and `frontend` with zero errors.
- [x] `backend/` and `shared/` confirmed untouched (`0` modified files vs `front_end`).
- [x] Local backend (`:4000`) and Vite dev server (`127.0.0.1:5173`) started cleanly; `/`, `/workspace`, and `/notebooks/sample` served live in browser.
- [ ] Full multi-account browser click-through (`register -> upload -> ask -> quiz -> two-user isolation`) and live Gemini API call in UI remain to be run with real API keys before marking `Released`.

## 7. Rollback

Revert commit(s) on `ulin/frontend-ui`.
