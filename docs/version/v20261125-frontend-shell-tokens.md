# Frontend shell, navigation, and Figma design tokens

| Attribute | Value |
|---|---|
| **Version** | v0.0.3 |
| **Date** | 2026-11-25 |
| **Status** | In Progress |
| **Author** | Ulinnuha Mahbubi |
| **Type** | Feature |
| **Area** | frontend, docs |
| **Branch** | `ulin/frontend-ui` |
| **PR** | pending |

## 1. Why

Align the web shell and design tokens with the team's `Desain Final Deep Notes` Figma specification (Ocean Deep `#163b4a`, Mint `#bcebdc`, Teal `#146c67`, Manrope typography, desktop sidebar with Bubi companion, and mobile bottom navigation) before building individual feature screens.

## 2. Plan (fill before coding)

- [x] Export official Figma SVG assets (`deep-notes-mark.svg`, `bubi-idle.svg`, and the six navigation icons) into `frontend/src/assets/`.
- [x] Install self-hosted `@fontsource-variable/manrope` in `@deep-notes/frontend`.
- [x] Update `frontend/src/index.css` and `frontend/src/main.tsx` with WCAG AA verified light and dark tokens, Manrope font family, pointer-cursor affordances, and reduced-motion rules.
- [x] Rebuild `frontend/src/components/AppLayout.tsx` with responsive desktop/tablet sidebar, mobile brand header + bottom navigation bar, skip link, live `ApiStatus`, and light/dark theme toggle.
- [x] Wire `frontend/src/router.tsx` and route views (`/`, `/jelajah`, `/workspace`, `/notebooks/:notebookId`, `/menu`, and labeled upcoming screens for `/game`, `/studio`, `/profil`, `/pengaturan`, `/mengikuti`) so every navigation link resolves to a real, honest route with loading/empty/error states.
- [x] Update `docs/DESIGN_SYSTEM.md` and `docs/features/00-platform/health.md`.
- [x] Run `pnpm lint`, `pnpm type-check`, `pnpm test`, `pnpm build`, and verify desktop, tablet, and mobile navigation plus API calls in a live browser session.

| Risk | Impact | Mitigation |
|---|---|---|
| Low contrast on muted text or input borders from raw mockup picks | Fails WCAG AA readability for students | Verify every token pair with WCAG 2.x luminance math (`#45616b` = 6.18:1 on `#f4f8f7`, `#647d86` = 4.07:1 input border) |
| Navigation links pointing to unbuilt screens | Dead controls break user trust | Register real routes for every nav item; wire `/workspace` and `/jelajah` to existing `/api/v1` endpoints and label unbuilt sections honestly |
| Fixed mobile bottom bar covering page content | Bottom controls become unreachable on phones | Reserve bottom padding plus `env(safe-area-inset-bottom)` on `<main>` |

## 3. Files changed

| File | Change |
|---|---|
| `frontend/index.html` | Set `lang="id"` and Indonesian metadata |
| `frontend/package.json` | Add `@fontsource-variable/manrope` |
| `frontend/src/assets/**` | Official SVG brand mark, Bubi idle pose, and six navigation icons from Figma |
| `frontend/src/main.tsx` | Load self-hosted Manrope variable font |
| `frontend/src/index.css` | Replace purple/Inter scaffold tokens with Figma Ocean Deep + Mint + Teal tokens (light and dark) and accessible base rules |
| `frontend/src/components/AppLayout.tsx` | Responsive sidebar + mobile bottom bar + skip link + theme toggle + `ApiStatus` |
| `frontend/src/components/navigation.ts` | Shared navigation items and active-route matching |
| `frontend/src/components/ThemeToggle.tsx` | Light/dark theme switcher persisted in `localStorage` |
| `frontend/src/pages/*` | Indonesian shell-aligned pages (`HomePage`, `ExplorePage`, `WorkspacesPage`, `NotebookPage`, `MobileMenuPage`, `PlannedSectionPage`) |
| `frontend/src/features/notebooks/*` | Indonesian labels and token-aligned 3D node color |
| `frontend/src/router.tsx` | Register all navigation routes |
| `docs/DESIGN_SYSTEM.md` | Document new tokens, contrast ratios, typography, responsive shell, and design rationale |
| `docs/features/00-platform/health.md` | Reflect `ApiStatus` placement in sidebar/mobile header |

## 4. Before and after

Before: top horizontal header with purple/Inter scaffold tokens and two routes (`/`, `/notebooks/:notebookId`).
After: Figma-aligned Ocean Deep + Mint + Manrope token system, persistent left sidebar with Bubi on desktop/tablet, compact brand bar + 5-item bottom bar + `Menu Tambahan` screen on mobile, working light/dark mode, and real routes for every navigation destination.

## 5. Data impact

None. No database schema, migration, or seed changes. Applied to a non-local database? No.

## 6. Verification

- [x] `pnpm lint`, `pnpm type-check`, `pnpm test` (89 backend tests + 3 frontend navigation tests), and `pnpm build` all pass locally.
- [x] Endpoints exercised from the live browser session (`http://127.0.0.1:5173` proxying `/api` to `:4000`):
  - `GET /api/v1/health` -> `200` (unauthenticated; rendered `"API: aktif"` badge in desktop sidebar and mobile top bar)
  - `GET /api/v1/companion/demo?scenario=explain` -> `200` (unauthenticated; rendered 5 explanation steps with citation chip and working step buttons)
- [x] Failure paths exercised in browser:
  - Empty `CreateNotebookForm` submission -> client Zod validation error (`"Judul minimal 3 karakter."`)
  - `POST /api/v1/notebooks` while signed out -> `401 UNAUTHORIZED` (rendered Indonesian session notice)
  - `GET /api/v1/notebooks` and `GET /api/v1/public/notebooks` while signed out -> `401 UNAUTHORIZED` (rendered explicit signed-out cards with fallback link to `/notebooks/sample`)
- [x] Two-notebook isolation: unchanged in backend (`backend/tests/core.test.ts` passed).
- [x] AI features: no new live model call in this shell task (`GET /api/v1/companion/demo` serves the deterministic demo payload, labeled `"Data contoh API"` in UI).
- [x] Browser check across `1440x900` (desktop), `820x1024` (tablet), and `390x844` (mobile), light and dark themes, zero uncaught console errors, zero horizontal overflow, and `>= 44px` touch targets on all navigation and button controls.

## 7. Rollback

Revert commit(s) on `ulin/frontend-ui`; no database or backend state is affected.
