# Server-backed frontend inputs

| Attribute | Value |
|---|---|
| **Area** | 12-frontend |
| **Status** | implemented locally; shared demo deployment pending |
| **Owner** | team |
| **Endpoints** | `GET/POST/PATCH/DELETE /notebooks/:id/notes`; `GET/POST /notebooks/:id/discussion`; `GET/POST/PATCH/DELETE /me/drafts`; `GET /saved-posts`; `POST/DELETE /posts/:id/save` |
| **Schemas** | `shared/src/schemas.ts`, `shared/src/responses.ts` |
| **Last updated** | 2026-11-26 |

## Purpose

Notes, workspace discussion, writer drafts, and saved posts need to follow the signed-in account instead of the current browser. The UI renders server responses and offers a deliberate import for old browser-local items without deleting the browser copies.

## Business rules

- **BR-01** Notes are private to their author even when that user belongs to a shared notebook. A source anchor, if provided, must belong to that notebook.
- **BR-02** Discussion messages are visible to every notebook member, include the server-provided author, and accept only same-notebook sources.
- **BR-03** Writer drafts and saved posts are scoped to the current account and are not public publications.
- **BR-04** Every create/update/delete path shows the server result or server error; failed saves keep form contents.
- **BR-05** Import is explicit. It preserves browser storage, uses old IDs for retry safety, and never attributes another account's old discussion message to the current user.
- **BR-06** Discussion loads cursor pages and refreshes every five seconds while the page is open. Realtime broadcast is not claimed.

## Behavior

The affected pages load from TanStack Query. Mutations send shared Zod-shaped requests and invalidate the relevant query so the displayed result comes back from the server. Import buttons appear only when old local items exist; unavailable feed posts are reported and the original local IDs remain available.

## Authorization

All routes require an active session. Notebook routes require membership; non-members receive `404`. Notes and writer drafts are filtered by their owner. Discussion is member-visible. Saved-post operations only touch the signed-in user's rows.

## Data

Migration `0005_server_backed_inputs.sql` adds `workspace_notes`, `discussion_messages`, `writer_drafts`, and `saved_posts`. Foreign keys cascade private/user data on account or notebook deletion and clear deleted source references. Browser storage is read only for explicit import and is not removed.

## Verification

- `backend/tests/server-backed-inputs.test.ts`: four integration tests pass against isolated PGlite.
- Coverage includes note create/read/update/delete and private isolation, invalid and foreign source references, discussion visibility/cursor/import retry, unauthenticated requests, draft account isolation and CRUD, and saved-post account isolation/idempotence.
- Backend/frontend TypeScript checks and ESLint pass. Hosted API deployment is pending; no writes were made to the hosted shared database.
