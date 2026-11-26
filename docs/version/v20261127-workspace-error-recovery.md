# Workspace error recovery and AI API handoff

| Attribute | Value |
|---|---|
| **Version** | v0.0.16 |
| **Date** | 2026-11-27 |
| **Status** | Released |
| **Author** | Maulvi |
| **Type** | Fix / Docs |
| **Area** | frontend / docs |
| **Branch** | `maul/frontend-integration` |
| **PR** | none |

## 1. Why

Discussion and Notes could leave users on an error screen without a route back to learning. The deployed API can also return `Invalid request` for Bubi's automatic suggestions even though manual questions remain available.

## 2. Plan

- [x] Keep a return-to-learning link visible during loading and API errors in Discussion and Notes.
- [x] Explain missing AI routes and request validation errors without disabling manual questions.
- [x] Correct the API handoff documentation and provide the backend team with the deployment requirements.
- [x] Merge the existing integration branch into `main`.

| Risk | Impact | Mitigation |
|---|---|---|
| The shared demo API may still be missing routes or have an older AI schema. | Notes, discussion, or automatic suggestions can continue to fail on the demo. | Deploy backend code and migrations, refresh OpenAPI, then verify with an authenticated workspace member. |

## 3. Files changed

| File | Change |
|---|---|
| `frontend/src/pages/WorkspaceDiscussionPage.tsx` | Keep the learning link in loading and error states. |
| `frontend/src/pages/WorkspaceNotesPage.tsx` | Keep the learning link in loading and error states. |
| `frontend/src/features/answers/AskPanel.tsx` | Explain missing or rejecting suggestion endpoints and keep manual ask available. |
| `docs/frontend/API_HANDOFF.md` | Distinguish routes implemented in this checkout from demo deployment status. |
| `frontend/e2e/workspace-error-recovery.spec.ts` | Cover error navigation and suggestion validation behavior on desktop and mobile. |

## 4. Before and after

Before, the loading and error early-return states hid the page header action, and a validation error from the suggestions API was rendered as the unhelpful text `Invalid request`. Afterward, Discussion and Notes retain a visible return link, while suggestion errors explain the backend contract and leave manual questions usable.

## 5. Data impact

No schema change or database migration was applied for this fix. The existing backend migrations required by the broader server-backed features remain a deployment prerequisite.

## 6. Verification

- [x] Frontend lint, type-check, and production build passed.
- [x] Four Playwright checks passed across desktop and mobile. API responses were mocked for these browser checks.
- [ ] Live authenticated verification against the shared demo API remains pending; its OpenAPI document did not list the affected routes when last checked.
- [ ] AI suggestions were not tested against a live model in this task.

## 7. Rollback

Revert the frontend and documentation changes in this commit. No database rollback is needed.
