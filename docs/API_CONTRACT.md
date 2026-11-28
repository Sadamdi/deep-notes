# API contract

Base path: `/api/v1`. The source of truth for shapes is `shared/src` (Zod). This file explains the conventions and lists the
endpoints; update both when an endpoint changes.

## Envelope

```jsonc
// success
{ "success": true, "data": { }, "meta": { "nextCursor": "abc" } }   // meta only on lists
// failure
{ "success": false, "error": { "code": "VALIDATION", "message": "Invalid request", "details": { } } }
```

## Error codes

| Code | HTTP | When |
|---|---|---|
| `VALIDATION` | 400 | body, query or params failed the Zod schema |
| `UNAUTHORIZED` | 401 | missing or invalid session |
| `FORBIDDEN` | 403 | signed in but the role may not do this |
| `NOT_FOUND` | 404 | does not exist **or the caller is not a member** of the notebook |
| `CONFLICT` | 409 | duplicate or state conflict |
| `RATE_LIMITED` | 429 | too many requests or AI quota used |
| `INTERNAL` | 500 | unexpected; never includes a stack trace |

## Pagination

Lists use cursors: `?cursor=<opaque>&limit=20` (limit 1 to 100, default 20). The response includes `meta.nextCursor`
(`null` at the end).

## Rules

- Every input (body, query, params) is validated with a Zod schema from `shared/`.
- No personal data in responses unless the feature needs it.
- Mutations that create resources return the created resource.
- Never return raw model output: answers use the `Answer` type (`grounded` plus citations).

## Endpoints

All paths are under `/api/v1`. Every route except `/health`, `/auth/register` and `/auth/login` needs the session cookie (`dn_session`, set by login or register; send requests with credentials). Notebook routes return `404` to non-members. Status `implemented` means the backend exists, has automated tests and ran against the real models and database; shapes are in the Zod schemas in `shared/` and in the feature docs. IDs refer to [PLAN_SEMIFINAL.md](PLAN_SEMIFINAL.md).

### Accounts (F-01)
| Method | Path | Body | Result |
|---|---|---|---|
| POST | `/auth/register` | `{email, name, password, course?}` | `201` user, sets cookie |
| POST | `/auth/login` | `{email, password}` | user, sets cookie |
| POST | `/auth/logout` | none | `{loggedOut: true}` |
| GET | `/auth/me` | none | user with `lookingForPartners` |
| PATCH | `/me/profile` | `{course?, lookingForPartners?}` | profile (F-14) |
| GET | `/me/partners` | none | `{partners: [{id, name, course}]}` (F-14) |
| GET | `/me/friends` | none | accepted friends plus incoming and outgoing pending requests, without emails |
| POST | `/me/friend-requests` | `{email}` or `{userId}` | `202 {sent: true}`; unknown emails receive the same response |
| POST | `/me/friend-requests/:requestId/accept` | none | accept an incoming request |
| DELETE | `/me/friend-requests/:requestId` | none | reject or cancel a pending request |
| DELETE | `/me/friends/:userId` | none | remove an accepted friend |
| POST | `/me/password` | `{currentPassword, newPassword}` | changes the password, signs out every other device |
| POST | `/me/logout-all` | none | ends every session |
| GET | `/me/export` | none | a copy of my own data |
| DELETE | `/me` | `{password}` | deletes the account and what it created; `409` while I still own notebooks (`error.details.notebooks` lists them) |
| GET, POST | `/me/drafts` | POST `{id?, title, summary?, body?}` | list or create private writer drafts for this account |
| PATCH, DELETE | `/me/drafts/:draftId` | PATCH `{title?, summary?, body?}` | update or delete one of my drafts |

Draft responses are `{id, title, summary, body, createdAt, updatedAt}`. An optional `id` on create supports retry-safe import from browser-local drafts; a repeated import returns the existing draft without replacing it.

### Notebooks, members, invites (F-02, F-11)
| Method | Path | Body | Result |
|---|---|---|---|
| POST, GET | `/notebooks` | `{title, course?, description?, category?, visibility?}` | create (`201`); list mine with `role`, `memberCount`, `sourceCount` |
| GET, PATCH, DELETE | `/notebooks/:id` | PATCH any of the create fields | detail with my `role`; owner only for PATCH and DELETE |
| GET, POST | `/notebooks/:id/members` | POST `{email, role}` or `{friendId, role}` | list; owner adds a registered user or accepted friend |
| PATCH, DELETE | `/notebooks/:id/members/:userId` | PATCH `{role}` | owner changes role; owner removes anyone, a member removes self |
| POST | `/notebooks/:id/invites` | `{role?, expiresInDays?, maxUses?}` | `{token}` for a link such as `/join/<token>` |
| POST | `/invites/:token/accept` | none | `{notebookId, role}` |
| GET | `/notebooks/:id/invites` | none | owner: my invites with `uses`, `maxUses`, `expiresAt`, `inactive` |
| DELETE | `/notebooks/:id/invites/:token` | none | owner revokes an invite |
| GET | `/public/notebooks?q=&category=` | none | public notebooks (discoverable only) |
| POST | `/public/notebooks/:id/join-requests` | `{message?}` | `{status: "pending"}` |
| GET | `/notebooks/:id/join-requests` | none | pending requests (owner) |
| POST | `/notebooks/:id/join-requests/:userId/approve` or `reject` | none | decision (owner) |

### Sources (F-03, F-12)
| Method | Path | Body | Result |
|---|---|---|---|
| POST | `/notebooks/:id/sources/file` | multipart `file` (PDF, TXT, MD, DOCX, PPTX, XLSX, CSV, PNG, JPG, WEBP, MP3, M4A, MP4, WAV, AAC, OGG, WEBM; 15 MB server limit and 4 MB frontend limit), optional `title` | `202 {id, status: "processing"}` |
| POST | `/notebooks/:id/sources/text` | `{title, text}` | `202` |
| POST | `/notebooks/:id/sources/link` | `{url, title?}` | `202` (private addresses are refused) |
| GET | `/notebooks/:id/sources` | none | sources with `status` (`processing`, `ready`, `failed`), `error`, `pageCount`, `chunkCount`; poll until `ready` |
| GET | `/notebooks/:id/sources/:sourceId/pages/:page` | none | `{page, text}` for opening a citation |
| GET | `/notebooks/:id/sources/:sourceId/transcript` | none | `{sourceId, segments: [{startSec, endSec, text}]}` for a ready audio source |
| GET | `/notebooks/:id/sources/:sourceId/visual?kind=mindmap\|timeline\|chart` | none | Concept nodes and edges; ordered PPTX slides; or CSV/XLSX category and numeric series data |
| DELETE | `/notebooks/:id/sources/:sourceId` | none | uploader or owner |

### Workspace notes and discussion

| Method | Path | Body / query | Result |
|---|---|---|---|
| GET, POST | `/notebooks/:id/notes` | POST `{id?, title, body, sourceId?, page?}` | list or save notes visible only to their author; source anchors are optional and must belong to the notebook |
| PATCH, DELETE | `/notebooks/:id/notes/:noteId` | PATCH `{title?, body?, sourceId?, page?}` | update or delete my own note |
| GET | `/notebooks/:id/discussion?before=&limit=` | `limit` 1–100, default 30; opaque cursor | `{messages, nextBefore}` newest-first; all notebook members see messages and authors |
| POST | `/notebooks/:id/discussion` | `{id?, body, sourceId?}` | `201` new message, or existing message when an import is safely retried |

Discussion refreshes every five seconds while its page is open. A message source must belong to the same notebook. The frontend only imports old local discussion entries authored by the signed-in account; other local entries are never reposted as that user.

Scanned PDFs (no text layer) are accepted: the response is the same `202`, and the text is read by a vision model in the background; the source ends as `ready` or `failed` with a reason. At most 40 sources per notebook.

### Questions and explanations (F-04, F-10)
| Method | Path | Body | Result |
|---|---|---|---|
| POST | `/notebooks/:id/ask` | `{question}` | `{id, grounded, text, citations: [{sourceId, sourceTitle, page, quote}]}`; when `grounded` is false the text is the fixed refusal and `citations` is empty |
| POST | `/notebooks/:id/explain` | `{question}` | `{id, grounded, steps: [{text, emotion}], citations}`; `emotion` is one of `idle`, `senang`, `sedih`, `marah`, `antusias`, `semangat` |
| POST | `/notebooks/:id/ai/assist` | `{task: suggest_questions\|summarize\|draft\|practice_guide, input, sourceIds?}`; `input` may be empty only for `suggest_questions`, which generates directly from the ready source scope | `{grounded, text, items, citations}`; assistant actions use ready sources and return the fixed not-found response without validated citations |
| GET | `/notebooks/:id/questions?limit=` | none | history with `askedByName` |
| DELETE | `/notebooks/:id/questions/:questionId` | none | the asker or the owner |

For ask, explain, and assist, omitted `sourceIds` means all ready sources in the notebook. An explicit `sourceIds` list limits retrieval to those sources. AI assist results are not persisted; callers must review before applying them.

### Quizzes (F-05, F-09, F-15)
| Method | Path | Body | Result |
|---|---|---|---|
| POST | `/notebooks/:id/quizzes` | `{kind?: practice\|weekly\|exam, count?, topic?, sourceId?, sourceIds?, title?, timeLimitSec?, perQuestionSec?, dueAt?}` | `201 {id, questionCount}`; weekly needs `dueAt`, exam needs `timeLimitSec` |
| GET | `/notebooks/:id/quizzes` | none | list with `myAttempts`, `myBest` |
| GET | `/notebooks/:id/quizzes/:quizId` | none | `{questions: [{question, options[4], topic}], ...}` with no answers |
| POST | `/notebooks/:id/quizzes/:quizId/start` | none | exam only: starts the server clock |
| POST | `/notebooks/:id/quizzes/:quizId/attempts` | `{answers: (0..3 or null)[], durationMs?}` | `201 {score, total, results: [{correct, correctIndex, explanation, topic, sourceTitle, page}]}` |
| GET | `/notebooks/:id/quizzes/:quizId/scoreboard` | none | `{ranking: [{rank, name, score, total, durationMs}], notYetTaken}` |
| GET | `/notebooks/:id/quizzes/:quizId/attempts/mine` | none | my attempts |
| DELETE | `/notebooks/:id/quizzes/:quizId` | none | the creator or the owner |

### Study companion (F-10)
Full description for the frontend: [COMPANION_CONTRACT.md](COMPANION_CONTRACT.md).
| Method | Path | Body | Result |
|---|---|---|---|
| GET | `/companion/catalog` | none | no login: `{mascots, animations, emotions, styles, levels, reactions, sourceKinds, upload}` |
| GET | `/companion/demo?scenario=explain\|notfound` | none | no login: a sample `performance` |
| POST | `/notebooks/:id/companion/explain` | `{question, mascotId?, style?: teacher\|friend\|coach, level?: simple\|normal\|detailed}` | `{questionId, question, performance: {id, mascotId, style, level, grounded, beats[{index, say, emotion, animation, citation, durationMs, voiceNoteId}], citations[], followUps[]}}` |

### Group views (F-06, F-08, F-16, F-17)
| Method | Path | Body | Result |
|---|---|---|---|
| GET | `/notebooks/:id/contributions` | none | `{members: [{name, sourcesAdded, questionsAsked, quizzesTaken, assignmentsDone, lastActiveAt}], recent}` |
| GET | `/notebooks/:id/progress` | none | `{members: [{name, attempts, averagePercent, bestPercent}], group}` |
| GET | `/notebooks/:id/gaps` | none | `{gaps: [{topic, answered, missed, missRatePercent, membersMissed, reviewPages: [{sourceTitle, page}]}]}` |
| GET, POST | `/notebooks/:id/assignments` | POST `{assigneeId, topic, sourceId?, dueAt?}` (owner) | `{items, perMember: [{name, total, done}]}` |
| PATCH, DELETE | `/notebooks/:id/assignments/:assignmentId` | PATCH `{status: todo\|doing\|done}` | assignee or owner updates; owner deletes |

### Limits
20 notebooks owned per user, 50 members and 40 sources per notebook, 100 quizzes per notebook, 15 MB per file (12 MB for scanned PDFs), 40 questions per 10 minutes and 12 quiz generations per 10 minutes per user. Exceeding a count limit returns `409 CONFLICT`, exceeding a rate limit returns `429 RATE_LIMITED`.

### Game sessions, points and teach-back (F-18, F-19, F-20)
Full description: [GAME_CONTRACT.md](GAME_CONTRACT.md).
| Method | Path | Body | Result |
|---|---|---|---|
| POST | `/notebooks/:id/sessions` | `{mode?: solo\|duel\|group, rounds?, focusTopic?, gameTypes?, sourceIds?}` | `201` session with stable `hostId` and planned rounds (items without answers) |
| GET | `/notebooks/:id/sessions`, `/sessions/:sid`, `/sessions/:sid/scoreboard` | none | list, state (poll waiting/running sessions), live ranking |
| POST | `/notebooks/:id/sessions/:sid/join`, `/start` | none | duel and group lobby; only `hostId` can start and the server requires two players |
| POST | `/notebooks/:id/sessions/:sid/rounds/:n/answer` | `{answers[], elapsedMs?}` | graded results (including item fractions and the chosen answer), `correctCount`, total points, speed-bonus breakdown, mascot reaction |
| POST | `/notebooks/:id/sessions/:sid/finish` | none | points, weighted accuracy, full-correct count, streak, badges, weak topics, rank |
| GET | `/me/stats` | none | points, streak, badges |
| POST | `/notebooks/:id/companion/teach-back` | `{topic, explanation, sourceIds?}` | `{evaluation, performance}` |
| GET | `/notebooks/:id/sources/:sourceId/visual?kind=mindmap\|timeline\|chart` | none | Mind map with source pages, slide timeline in extracted slide order, or chart data from extracted spreadsheet cells |

Audio files are transcribed by the configured Gemini backend. Timestamped segments and structured spreadsheet cells are stored separately from the searchable passages; the uploaded original file is discarded. The audio endpoint returns `409` while processing or after a failed ingestion, and the source status carries the failure reason. Chart values are emitted only from numeric cells; chart requests for non-tabular or non-numeric sources return a clear `400`/`409` response.

`sourceIds` (reference sources) is accepted by `/ask`, `/explain`, `/companion/explain`, quiz generation and sessions.

### Feed (F-21)
| Method | Path | Body | Result |
|---|---|---|---|
| POST | `/posts` | `{body, attach?}` | `201` post with `card` |
| GET | `/feed?scope=all\|following&limit&before` | none | `{posts, nextBefore}`; every post includes `savedByMe` |
| GET | `/saved-posts` | none | `{posts: FeedPost[]}` saved by the current account |
| POST, DELETE | `/posts/:id/save` | none | `{saved: true\|false}`; idempotent |
| GET, DELETE | `/posts/:id` | none | one post; delete mine |
| POST, DELETE | `/posts/:id/like` | none | `{liked, likes}` |
| GET, POST | `/posts/:id/comments` | POST `{body}` | comments |
| DELETE | `/posts/:id/comments/:commentId` | none | commenter or post author |
| POST, DELETE | `/users/:userId/follow` | none | follow state |
| GET | `/users/:userId` | none | public profile (no email) |

### Platform
| Method | Path | Result |
|---|---|---|
| GET | `/health` | `{status, service, time}` |

Planned, not built: F-13 voice is frontend only (browser speech APIs). Designed frontend behavior that has no verified route/schema is tracked in [the frontend API handoff](frontend/API_HANDOFF.md); no speculative routes are called from the UI.
