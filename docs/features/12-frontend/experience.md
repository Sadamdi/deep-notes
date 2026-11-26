# Frontend experience

| Attribute | Value |
|---|---|
| **Area** | 12-frontend |
| **Status** | implemented (frontend); API-backed flows not live-verified |
| **Owner** | team |
| **Endpoints** | Existing endpoints listed in [API_CONTRACT.md](../../API_CONTRACT.md); no new endpoint added |
| **Schemas** | Existing response schemas in `shared/src/responses.ts` and feature schemas in `shared/src/` |
| **Last updated** | 2026-11-25 |

## Purpose

The frontend implements the final Deep Notes study experience across public entry, accounts, workspaces, source-grounded study, quizzes, games, social discovery, profile, and writing. It keeps screens tied to verified API contracts and labels device-local behavior and missing backend capabilities in context.

## Business rules

- **BR-01** Questions, quizzes, games, workspace membership, feed, and profile actions use only existing API routes and shared response shapes.
- **BR-02** Every answer displays its grounding state; an ungrounded response has no citation controls.
- **BR-03** Source content is displayed only through the authorized notebook/source routes.
- **BR-04** Notes, discussion entries, saved-post IDs, and Studio drafts are device-local and are explicitly labeled as such.
- **BR-05** Publication, notification, recovery-email, live attendance, and unsupported visualization states do not claim server persistence or generated content.
- **BR-06** 3D visualization is optional; the corresponding topic/member information remains available as text.

## Behavior

The route and design-family map is maintained in [FIGMA_COVERAGE.md](../../frontend/FIGMA_COVERAGE.md). The main learning loop is documented in [ask-with-citations.md](../../flows/ask-with-citations.md). Local-only flows and handoffs are documented in [frontend-local-handoffs.md](../../flows/frontend-local-handoffs.md).

Routes provide loading, empty, failure, and not-found handling where the API exposes the relevant state. Figma states without an API contract are explained in [API_HANDOFF.md](../../frontend/API_HANDOFF.md).

## Authorization

Protected routes require the existing session. Notebook requests rely on backend membership authorization and `404` behavior for non-members. Local browser data is not an authorization boundary and is never presented as shared workspace content. Public profiles use the existing public profile endpoint; publication pages remain handoff states.

## Data

No database tables or migrations are changed. Existing API schemas are reused. Device-local notes, discussions, saved-post IDs, and drafts are stored in versioned `localStorage` keys and validated when read.

## Verification

- TypeScript check, ESLint, production Vite build, and browser inspection of the landing and login pages at a phone-width viewport passed.
- Desktop/responsive route matrix is documented in [FIGMA_COVERAGE.md](../../frontend/FIGMA_COVERAGE.md); visual inspection covered these two public routes at phone width.
- The local backend was unavailable during browser verification, so authenticated/API-backed flows, API error states, and network behavior were not exercised live.
- Automated tests were not run or added for this frontend task.
