# Frontend API handoff

This document lists designed UI behavior that does not have a confirmed backend contract. The frontend does not invent endpoints for these features. Existing API-backed screens continue to use the routes in [API_CONTRACT.md](../API_CONTRACT.md).

| UI area | Current frontend behavior | Backend contract needed |
|---|---|---|
| Source-grounded AI assistance | Ask, companion, quiz, and game use ready notebook sources; notes, discussion, and Studio send selected/current editor text only after an explicit action and show citations before applying output. Assist requests are not persisted. | The route and shared contract are implemented in this checkout. The deployed API must use the same contract, including empty `input` for `suggest_questions`, before the live frontend can use suggestions. |
| Password recovery | `/recover` explains that recovery is unavailable and links back to login; it does not submit the email field. | Request recovery, deliver a time-limited reset link/code, validate it, and set a new password. |
| Notifications | Header dialog explains notifications are inactive and links to workspaces. | List unread/read notifications, mark one/all read, and define the events that create notifications. |
| Workspace notes | Private server-backed notes with optional source/page anchors. Old browser notes can be explicitly imported; the local copy remains as a backup. | API implemented in this checkout. Apply migration `0005_server_backed_inputs.sql` and deploy the routes to the shared demo server. |
| Workspace discussion | Member-visible messages with optional same-notebook source references, cursor history, and five-second refresh. Old messages authored by the current account can be imported safely. | API implemented in this checkout. Apply migration `0005_server_backed_inputs.sql` and deploy the routes to the shared demo server. Realtime push/broadcast remains future work. |
| Friends | Friend list, requests, acceptance, removal, and workspace invites use account-scoped server data. | API implemented in this checkout. Apply migration `0006_friendships.sql` and deploy the routes to the shared demo server. |
| Saved posts | Save/unsave and saved list are account-scoped server data. Old browser IDs can be explicitly imported; the local copy remains. | API implemented in this checkout. Apply migration `0005_server_backed_inputs.sql` and deploy the routes to the shared demo server. |
| Writer drafts | Draft create/list/update/delete and previews are account-scoped. Old browser drafts can be explicitly imported; the local copy remains. | API implemented in this checkout. Apply migration `0005_server_backed_inputs.sql` and deploy the routes to the shared demo server. |
| Publications, articles, author publication pages | Designed routes show a clear handoff and empty state; no sample public content or publishing action is presented. | Publication listing/search, article read/create/update, audience/visibility, cover/media, comments/replies, and author publication collections. Define moderation and access rules. |
| Live classroom | 3D canvas displays the selected source mind map plus the workspace member roster. It does not claim live attendance, voice, or presence. | Realtime presence/session membership, classroom events, and any attendance semantics. |
| Rich material visualizations | Source upload and mind maps use the current source/visual contracts. Audio is marked unsupported; spreadsheet charts and slide timelines are not offered as generated results. | Explicit generation contracts for CSV/XLSX charts, slide timelines, audio upload/transcription/voice notes, and image/OCR results if distinct from existing ingestion. |
| Bookmarks and publishing dialogs | Existing controls clearly identify local saving or unavailable publishing. | Use the corresponding account-scoped APIs above before presenting these as synced/public actions. |

## Contract evidence

- The source upload route accepts PDF, TXT, MD, DOCX, PPTX, XLSX, CSV, PNG, JPG, and WEBP; it does not accept audio.
- The only source visualization route documented and implemented is `GET /notebooks/:id/sources/:sourceId/visual?kind=mindmap`.
- Existing feed routes include `GET /feed?scope=all|following`, `GET /posts/:id`, likes, comments, and follows. Account-scoped saved-post routes are added with the backend changes described in [API_CONTRACT.md](../API_CONTRACT.md).
- Existing account routes include authenticated password change, but there is no recovery email/token route.
- `POST /notebooks/:id/ai/assist` is a notebook-member-only, rate-limited route that accepts a task, user context, and optional `sourceIds`; it retrieves ready notebook chunks and returns only outputs with validated citations. Empty `input` is allowed only for `suggest_questions`, which samples directly from ready chunks in the selected source scope.
- The current backend checkout includes the notes, discussion, drafts, saved-post, and friends routes described above. A route present in the checkout is not proof that it is deployed to the shared demo server.

The demo API's OpenAPI document was checked on 2026-11-26 and did not list the notes, discussion, draft, or saved-post routes. Recheck the live OpenAPI document after deployment and test with a signed-in workspace member. Do not treat a 404 alone as proof of a missing route because notebook access also returns 404.
