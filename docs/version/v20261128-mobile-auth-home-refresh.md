# Responsive workspace, auth, and home refresh

| Attribute | Value |
|---|---|
| **Version** | v0.0.23 |
| **Date** | 2026-11-28 |
| **Status** | In Progress |
| **Author** | Maul |
| **Type** | Feature / UI |
| **Area** | frontend / docs |
| **Branch** | `maul/frontend-integration` |
| **PR** | Not opened |

## 1. Why

The mobile workspace tabs were breaking labels across lines, the create-workspace preview was an empty block, and the landing, authentication, and home screens needed to better follow the latest Design Lagi frames. This update adds a brief Bubi SVG entrance while preserving the email-based account flow and reduced-motion behavior.

## 2. Plan

- [x] Reuse one responsive tab component in workspace, classroom, and visualization.
- [x] Reflect current form values in a categorized workspace-card preview and place it after the form action on phones.
- [x] Refresh the landing hero and place animated Bubi artwork inside the authentication panel, with a compact mobile version.
- [x] Use server notebook data for Home resume and list cards, with the shared streak immediately below resume.
- [x] Add responsive browser coverage at 320 px and 390 px, including reduced motion and empty-workspace behavior.
- [x] Update design, feature, Figma coverage, and version documentation.

| Risk | Impact | Mitigation |
|---|---|---|
| Home feed content has a wide intrinsic minimum on small screens | Horizontal scrolling on narrow phones | Let the feed and sidebar grid items shrink with `min-w-0`; assert document width in browser tests. |
| Bubi could overlap auth controls or move against preference | Obscured form or unwanted motion | Keep mobile mascot in its own reserved row, clip desktop mascot inside artwork, and disable entrance/wave when reduced motion is requested. |
| Empty state could be confused with failed notebook loading | User may create a duplicate workspace | Show Create only after a successful empty response; show retry on loading failure. |

## 3. Files changed

| File | Change |
|---|---|
| `frontend/src/components/shared/WorkspaceTabs.tsx` | Shared, wrapping, single-line workspace navigation. |
| `frontend/src/pages/WorkspacePage.tsx`, `WorkspaceClassPage.tsx`, `WorkspaceVisualizationPage.tsx` | Reuse shared tabs. |
| `frontend/src/features/notebooks/CreateNotebookForm.tsx` | Dynamic category cover and live card preview, after the form on phones. |
| `frontend/src/components/layout/AuthFrame.tsx`, `frontend/src/pages/LandingPage.tsx`, `frontend/src/index.css` | Landing refresh, responsive Bubi SVG placement, entrance/wave motion, and reduced-motion fallback. |
| `frontend/src/pages/FeedPage.tsx` | Server-backed resume destination, workspace list and streak placement; fix narrow feed min-width. |
| `frontend/e2e/design-responsive.spec.ts` | Browser coverage of responsive layout, auth/recovery submissions, dynamic preview, destinations, motion preference, and narrow widths. |
| `docs/DESIGN_SYSTEM.md`, `docs/features/12-frontend/experience.md`, `docs/frontend/FIGMA_COVERAGE.md`, `docs/version/VERSION_INDEX.md` | Record the implemented behavior and verification limits. |

## 4. Before and after

- Before: workspace tabs could wrap individual labels and the creation card used an empty mint placeholder. After: tabs wrap as whole controls and the card cover and text update from form state.
- Before: authentication Bubi was positioned outside its illustration panel; Home could show a creation CTA when the notebook request failed. After: Bubi enters within the clipped panel, and failed notebook loads offer retry.
- Before: Home did not surface the account's notebook as a Bubi continuation route with the streak directly below it. After: the first server notebook drives the CTA; empty accounts go to workspace creation.

## 5. Data impact

No schema, migration, or persistent server data changes. Browser tests submit account and recovery actions only to route fixtures, never to a live server.

## 6. Verification

- [x] `pnpm run ci` (2026-11-28): lint, type checks, 38 frontend tests, 113 backend tests, and both production builds pass.
- [x] Playwright responsive scenario passes in desktop and mobile projects at 320 px and 390 px, plus desktop at 1440 px (two project runs).
- [x] Browser checks cover landing/auth/recovery layout, Bubi overlap and entrance, reduced motion, dynamic workspace preview, wrapped tabs, Home destinations, empty and failed notebook loads.
- [x] Desktop and mobile browser checks submit login, registration, reset request, and reset confirmation to mocked routes and verify request payloads.
- [x] No live backend account actions, SMTP recovery delivery, AI calls, or server data writes are claimed by this UI task.

## 7. Rollback

Revert this commit. No data rollback is needed.
