# Final Figma coverage

Reference: [Deep Notes — STACK 2026](https://www.figma.com/design/Agh2OMnizUCnyi9y4Pyk9o/Deep-Notes---STACK-2026?node-id=174-135). The Figma page metadata contains 188 top-level frames. This map groups desktop/mobile variants and state frames by the route or handoff they represent; it does not claim pixel-by-pixel review of all 188 frames.

## Screen families mapped to routes

| Designed family | Frontend route(s) | Coverage |
|---|---|---|
| Landing, login, registration, recovery | `/`, `/login`, `/register`, `/recover` | Landing, Sign In (`223:10101`), and Sign Up (`223:10144`) use the `Design Lagi` frames with responsive Bubi artwork. Recovery uses the password-reset request/confirm routes; email delivery depends on backend SMTP configuration. |
| Feed, saved, following, discovery, social profile | `/home`, `/following`, `/saved`, `/discover`, `/profile`, `/users/:userId` | Feed/profile/save state is account-backed. Existing browser-saved IDs can be explicitly imported. Publication pages are separate. |
| Workspace list, create/join, study workspace, sources, upload, citation preview | `/workspaces`, `/workspaces/new`, `/join/:token`, `/workspaces/:notebookId` | Uses notebook/source/ask APIs and source-page dialog; includes loading, empty, processing, failed, and request-error states exposed by the contract. The create form's preview follows current values and appears after the form on phones. |
| Group activity, assignments, progress, gaps, quiz scoreboard | `/workspaces/:notebookId/team` and quiz routes | Uses group, assignment, quiz, and attempt contracts. |
| Quiz and game modes, lobby/session/results, weekly/group scoreboard | `/workspaces/:notebookId/quizzes/:quizId`, `/game`, `/workspaces/:notebookId/game`, `/workspaces/:notebookId/sessions/:sessionId` | Each game round presents one item at a time with back/jump navigation and preserved answers; one full answer set is submitted for server grading. Quiz navigation also preserves responses. Existing Figma answer colors and navy arena frame are used. Step ordering supports drag and keyboard controls. Matching uses unique dropdown choices and proportional points on newly generated rounds, with each selected/correct pair shown in the review. Duel/group sessions keep the server-backed scoreboard beside the active question on desktop and below it on phones. Session refresh remains polling, not realtime attendance. |
| Friend requests and workspace invites | `/friends`, `/users/:userId`, workspace invite dialog | Account-backed incoming/outgoing/accepted states, accept/reject/cancel/remove, direct registered-email and accepted-friend invitations, and viewer/editor role selection. |
| Companion and mind map | `/workspaces/:notebookId/companion`, `/workspaces/:notebookId/sources/:sourceId/map` | Uses companion and source-visual contracts with text alternatives. |
| Notes, discussion, 3D class, material visualizer | `/workspaces/:notebookId/notes`, `/discussion`, `/class`, `/visualization` | Notes are private per account; discussion is visible to notebook members and refreshes by polling. Old local entries can be explicitly imported. 3D class uses a real roster and source mind map; other visual types remain unavailable without a contract. |
| Account settings | `/account` | Uses the existing account/profile routes and explicit states for destructive or unavailable actions. |
| Writer studio, editor, preview, publication/article/author pages | `/studio`, `/studio/preview/:draftId`, `/publications`, `/articles/:articleId`, `/authors/:authorId` | Draft/editor/preview use account-scoped APIs; old drafts can be explicitly imported. Public article and author publication routes remain backend handoffs without fabricated content. |
| Overlays and feedback states | Shared dialogs and route-level states | Reusable dialogs cover source-page preview, notifications, navigation, workspace membership/invites, and confirmations; forms and server screens provide inline errors and empty/loading states. |

## Browser verification for social games

- Playwright opens the duel lobby at desktop and phone dimensions, adds a friend with the viewer role, creates a viewer invite link, starts a round, selects an answer with the keyboard, and reaches the result screen.
- Focused checks cover proportional match feedback, correct-pair review, keyboard drag ordering, and quiz choice/correct-answer detail; actual backend scoring is covered by isolated PGlite integration tests.
- Backend integration tests use isolated PGlite databases and the deterministic fake AI provider to cover solo play, duel authorization, group capacity, answer grading, and membership isolation. These are not live-model quality checks.

## Representative frames inspected

| Frame | Figma node | Implemented destination |
|---|---|---|
| Sign In | `223:10101` | `/login` |
| Sign Up | `223:10144` | `/register` |
| Landing | `286:3665` | `/` |
| Home · Design Lagi | `223:10358` | `/home` |
| Workspace · Mobile | `175:5891` | `/workspaces/:notebookId` |
| Create Workspace · Mobile | `175:5465` | `/workspaces/new` |
| Landing · Mobile | `175:5290` | `/` |
| Sign In · Mobile | `175:5303` | `/login` |
| Sign Up · Mobile | `175:5323` | `/register` |
| Home · Mobile | `175:5363` | `/home` |
| Main workspace | `175:579` | `/workspaces/:notebookId` |
| Notes | `175:2579` | `/workspaces/:notebookId/notes` |
| Discussion | `175:3357` | `/workspaces/:notebookId/discussion` |
| Studio | `175:3511` | `/studio` |
| 3D classroom | `178:3036` | `/workspaces/:notebookId/class` |
| Material visualizer | `178:3091` | `/workspaces/:notebookId/visualization` |

The root page context is node `174:135`. Desktop and mobile Figma variants share a responsive route rather than creating duplicate pages. Workspace, classroom, and visualization share wrapping tabs with one-line labels. On the code side the app shell uses a desktop sidebar/header and a phone navigation/menu; content grids collapse at Tailwind breakpoints.

## Responsive and interaction verification

- Local Playwright responsive checks cover landing, sign-in, sign-up, workspace creation preview, workspace tab navigation, and Home destinations at 320 px and 390 px; reduced-motion behavior is also checked. API responses are fixtures, and no account mutations occur.
- Sign In was visually opened in the local browser at desktop size to check that Bubi stays inside the illustration panel. Mobile layout checks measure overflow and content placement; they are not screenshot comparisons against every Figma frame.
- Frontend lint, type checks, unit tests, and builds are recorded in the current version entry. Authentication submissions and SMTP delivery were not exercised in this design change.

Backend/API gaps are enumerated in [API_HANDOFF.md](API_HANDOFF.md).
