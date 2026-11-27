# Frontend experience

| Attribute | Value |
|---|---|
| **Area** | 12-frontend |
| **Status** | implemented locally; shared demo deployment pending |
| **Owner** | team |
| **Endpoints** | Existing endpoints listed in [API_CONTRACT.md](../../API_CONTRACT.md); no new endpoint added |
| **Schemas** | Existing response schemas in `shared/src/responses.ts` and feature schemas in `shared/src/` |
| **Last updated** | 2026-11-27 |

## Purpose

The frontend implements the final Deep Notes study experience across public entry, accounts, workspaces, source-grounded study, quizzes, games, social discovery, profile, and writing. It keeps screens tied to API contracts, labels remaining backend gaps, and offers a safe import for older browser-local data.

## Business rules

- **BR-01** Questions, quizzes, games, workspace membership, feed, and profile actions use API routes and shared response shapes. Workspace question suggestions are generated from ready sources in the active scope.
- **BR-02** Every answer displays its grounding state; an ungrounded response has no citation controls.
- **BR-03** Source content is displayed only through the authorized notebook/source routes.
- **BR-04** Notes are private per account, discussion is visible to notebook members, saved posts and Studio drafts are account-scoped. Existing browser-local data is only sent after an explicit import action, and browser copies remain intact.
- **BR-05** Publications, notifications, password recovery, and live attendance use their local server routes; SMTP delivery and shared-server deployment remain environment-dependent.
- **BR-06** 3D visualization is optional; the corresponding topic/member information remains available as text. Source pages also expose structured PPTX timelines, CSV/XLSX numeric charts, and timestamped audio transcripts when ready.

## Behavior

The route and design-family map is maintained in [FIGMA_COVERAGE.md](../../frontend/FIGMA_COVERAGE.md). The main learning loop is documented in [ask-with-citations.md](../../flows/ask-with-citations.md). Local-only flows and handoffs are documented in [frontend-local-handoffs.md](../../flows/frontend-local-handoffs.md).

Game rounds show one item at a time. Learners can move back, jump to a question, and keep earlier answers; the round timer continues while they navigate. The frontend submits the complete answer list once from the last item, and server grading still supplies the explanations, citations, and live scores. Quiz navigation follows the same question focus, direct question selection, and answer preservation pattern. A failed quiz submission can be retried without dropping chosen answers; a practice retry does not bypass the required-answer check.

Shared loading states place Bubi beside the action label for page reads, source uploads, AI answers, quiz generation/submission, and game grading; mascot movement remains brief and stops for reduced-motion preferences. New matching items let learners leave some pairs blank: a fully correct match counts as one correct item, while points and session accuracy scale with the number of correct pairs. Existing stored rounds without the proportional marker keep their original all-or-nothing rule. Review shows the selected and correct definition per row. Step-order items support keyboard-operable drag-and-drop and explicit up/down controls.

Round and session summaries separate full-correct counts, partial credit, points, and speed bonuses. Quiz review displays the learner's choice, correct option, explanation, and source citation.

The game and quiz question surfaces follow the Figma navy arena and use the existing palette for answer choices. Screen transitions and button press feedback are optional motion. The live scoreboard remains adjacent to the active question on wider screens and moves below it on narrow screens.

Streak art on Home and Profile uses the existing SVG tier exports. After finishing a session, the frontend compares the current server stats with the server's finish response; only a confirmed increase queues one celebration for that UTC day. The streak count remains visible as text, and reduced-motion users keep the updated count and announcement without movement. A repeated session on the same day does not trigger a new celebration.

Routes provide loading, empty, failure, and not-found handling where the API exposes the relevant state. Figma states without an API contract are explained in [API_HANDOFF.md](../../frontend/API_HANDOFF.md).

## Authorization

Protected routes require the existing session. Notebook requests rely on backend membership authorization and `404` behavior for non-members. Notes are visible only to their author; discussion is visible to notebook members. Legacy browser data is preserved and is sent only after an explicit import action. Public profiles use the existing public profile endpoint; publication pages remain handoff states.

## Data

Migration `0005_server_backed_inputs.sql` adds private notes, shared discussion, writer drafts, and saved-post relations. Shared Zod contracts validate the request and response shapes. Legacy local storage readers are kept only to offer retry-safe, explicit migration; the old data is not deleted.

## Verification

- Backend integration tests cover create/read/update/delete, server-returned state, idempotent imports, invalid requests, unauthenticated access, member access, private-note isolation, and per-account drafts/posts in isolated PGlite.
- Full workspace lint, type checks, tests, and builds pass. The game/quiz/streak refinement was also verified in isolated desktop and mobile browser flows; no authenticated live AI or demo-server mutations were run for that UI work.
- The shared demo OpenAPI document was checked read-only on 2026-11-26; it does not yet include the new routes. No shared database writes were made.
- The current game/quiz/streak update has separate browser verification recorded in the matching `docs/version/` entry; it does not claim live AI or demo-server verification.
