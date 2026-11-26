# Final Figma coverage

Reference: [Deep Notes — STACK 2026](https://www.figma.com/design/Agh2OMnizUCnyi9y4Pyk9o/Deep-Notes---STACK-2026?node-id=174-135). The Figma page metadata contains 188 top-level frames. This map groups desktop/mobile variants and state frames by the route or handoff they represent; it does not claim pixel-by-pixel review of all 188 frames.

## Screen families mapped to routes

| Designed family | Frontend route(s) | Coverage |
|---|---|---|
| Landing, login, registration, recovery | `/`, `/login`, `/register`, `/recover` | Landing is implemented. Sign In (`223:10101`) and Sign Up (`223:10144`) use the `Design Lagi` frames. Recovery is an explanatory state because no email reset contract exists. |
| Feed, saved, following, discovery, social profile | `/home`, `/following`, `/saved`, `/discover`, `/profile`, `/users/:userId` | Existing feed/profile routes are API-backed. Saved IDs remain device-local and publication pages are separate. |
| Workspace list, create/join, study workspace, sources, upload, citation preview | `/workspaces`, `/workspaces/new`, `/join/:token`, `/workspaces/:notebookId` | Uses notebook/source/ask APIs and source-page dialog; includes loading, empty, processing, failed, and request-error states exposed by the contract. |
| Group activity, assignments, progress, gaps, quiz scoreboard | `/workspaces/:notebookId/team` and quiz routes | Uses group, assignment, quiz, and attempt contracts. |
| Quiz and game modes, lobby/session/results, weekly/group scoreboard | `/workspaces/:notebookId/quizzes/:quizId`, `/game`, `/workspaces/:notebookId/game`, `/workspaces/:notebookId/sessions/:sessionId` | Uses existing quiz/game API contract. Unsupported realtime attendance is not implied. |
| Companion and mind map | `/workspaces/:notebookId/companion`, `/workspaces/:notebookId/sources/:sourceId/map` | Uses companion and source-visual contracts with text alternatives. |
| Notes, discussion, 3D class, material visualizer | `/workspaces/:notebookId/notes`, `/discussion`, `/class`, `/visualization` | Notes/discussion are labeled device-local. 3D class uses a real roster and source mind map; other visual types are marked unavailable when no contract exists. |
| Account settings | `/account` | Uses the existing account/profile routes and explicit states for destructive or unavailable actions. |
| Writer studio, editor, preview, publication/article/author pages | `/studio`, `/studio/preview/:draftId`, `/publications`, `/articles/:articleId`, `/authors/:authorId` | Studio draft/editor/preview are device-local. Public article and author publication routes are honest backend handoffs without fabricated content. |
| Overlays and feedback states | Shared dialogs and route-level states | Reusable dialogs cover source-page preview, notifications, navigation, and confirmations; forms and server screens provide inline errors and empty/loading states. |

## Representative frames inspected

| Frame | Figma node | Implemented destination |
|---|---|---|
| Sign In | `223:10101` | `/login` |
| Sign Up | `223:10144` | `/register` |
| Main workspace | `175:579` | `/workspaces/:notebookId` |
| Notes | `175:2579` | `/workspaces/:notebookId/notes` |
| Discussion | `175:3357` | `/workspaces/:notebookId/discussion` |
| Studio | `175:3511` | `/studio` |
| 3D classroom | `178:3036` | `/workspaces/:notebookId/class` |
| Material visualizer | `178:3091` | `/workspaces/:notebookId/visualization` |

The root page context is node `174:135`. Desktop and mobile Figma variants share a responsive route rather than creating duplicate pages. On the code side the app shell uses a desktop sidebar/header and a phone navigation/menu; content grids collapse at Tailwind breakpoints and long navigation rows scroll horizontally.

## Responsive and interaction verification

- Visually opened the current Sign In and Sign Up pages at a 1264×711 desktop viewport. The narrow-screen CSS reflows forms to one column and hides the illustration; a mobile viewport was not available for visual confirmation in this change.
- Frontend TypeScript check and production build passed for these auth changes. ESLint was not run in this change.
- Auth form submission was not attempted, so the login/register API response path was not rechecked in this visual change. Authenticated route screenshots were not part of this task.
- Automated tests were not run or added. Do not treat this note as a report that all 188 frames have been screenshot-compared.

Backend/API gaps are enumerated in [API_HANDOFF.md](API_HANDOFF.md).
