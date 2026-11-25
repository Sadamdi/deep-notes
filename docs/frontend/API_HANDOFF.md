# Frontend API handoff

This document lists designed UI behavior that does not have a confirmed backend contract. The frontend does not invent endpoints for these features. Existing API-backed screens continue to use the routes in [API_CONTRACT.md](../API_CONTRACT.md).

| UI area | Current frontend behavior | Backend contract needed |
|---|---|---|
| Source-grounded AI assistance | Ask, companion, quiz, and game use ready notebook sources; notes, discussion, and Studio send selected/current editor text only after an explicit action and show citations before applying output. Assist requests are not persisted. | None for the current actions. Use `POST /notebooks/:id/ai/assist` and shared Zod schemas; deploy the backend route before routing the live frontend to it. |
| Password recovery | `/recover` explains that recovery is unavailable and links back to login; it does not submit the email field. | Request recovery, deliver a time-limited reset link/code, validate it, and set a new password. |
| Notifications | Header dialog explains notifications are inactive and links to workspaces. | List unread/read notifications, mark one/all read, and define the events that create notifications. |
| Workspace notes | Personal notes and source/page anchors are stored in browser `localStorage`. | Create/list/update/delete private notes scoped to a notebook member, with source/page references and access checks. |
| Workspace discussion | Messages with optional source references are stored in browser `localStorage`; they are not visible to other members. | Persist messages and attachments, authorize members, paginate history, and define live refresh/broadcast behavior. |
| Saved posts | Saved IDs are stored on this device; current posts are retrieved using the verified `GET /posts/:id`. | Add account-scoped save/unsave and list-saved-posts operations. |
| Writer drafts | Studio drafts and previews are stored in browser `localStorage`; a note can be copied into a draft. | Account-scoped draft create/list/update/delete and cross-device synchronization. |
| Publications, articles, author publication pages | Designed routes show a clear handoff and empty state; no sample public content or publishing action is presented. | Publication listing/search, article read/create/update, audience/visibility, cover/media, comments/replies, and author publication collections. Define moderation and access rules. |
| Live classroom | 3D canvas displays the selected source mind map plus the workspace member roster. It does not claim live attendance, voice, or presence. | Realtime presence/session membership, classroom events, and any attendance semantics. |
| Rich material visualizations | Source upload and mind maps use the current source/visual contracts. Audio is marked unsupported; spreadsheet charts and slide timelines are not offered as generated results. | Explicit generation contracts for CSV/XLSX charts, slide timelines, audio upload/transcription/voice notes, and image/OCR results if distinct from existing ingestion. |
| Bookmarks and publishing dialogs | Existing controls clearly identify local saving or unavailable publishing. | Use the corresponding account-scoped APIs above before presenting these as synced/public actions. |

## Contract evidence

- The source upload route accepts PDF, TXT, MD, DOCX, PPTX, XLSX, CSV, PNG, JPG, and WEBP; it does not accept audio.
- The only source visualization route documented and implemented is `GET /notebooks/:id/sources/:sourceId/visual?kind=mindmap`.
- Existing feed routes include `GET /feed?scope=all|following`, `GET /posts/:id`, likes, comments, and follows. They do not include saved-post operations.
- Existing account routes include authenticated password change, but there is no recovery email/token route.
- `POST /notebooks/:id/ai/assist` is a notebook-member-only, rate-limited route that accepts a task, user context, and optional `sourceIds`; it retrieves ready notebook chunks and returns only outputs with validated citations.
- Backend modules and route tables include no notifications, notes, workspace discussion, publication/article/author-publication, or realtime classroom routes.

These gaps are also listed as backend work in [TODO_INDEX.md](../todo/TODO_INDEX.md). Revisit this document when an API contract and shared schemas are approved; do not remove an item based only on an endpoint name without checking its request/response schema and authorization behavior.
