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
| POST | `/me/password` | `{currentPassword, newPassword}` | changes the password, signs out every other device |
| POST | `/me/logout-all` | none | ends every session |
| GET | `/me/export` | none | a copy of my own data |
| DELETE | `/me` | `{password}` | deletes the account and what it created; `409` while I still own notebooks (`error.details.notebooks` lists them) |

### Notebooks, members, invites (F-02, F-11)
| Method | Path | Body | Result |
|---|---|---|---|
| POST, GET | `/notebooks` | `{title, course?, description?, category?, visibility?}` | create (`201`); list mine with `role`, `memberCount`, `sourceCount` |
| GET, PATCH, DELETE | `/notebooks/:id` | PATCH any of the create fields | detail with my `role`; owner only for PATCH and DELETE |
| GET, POST | `/notebooks/:id/members` | POST `{email, role}` | list; owner adds a member |
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
| POST | `/notebooks/:id/sources/file` | multipart `file` (PDF, TXT, MD, DOCX, PPTX, 15 MB), optional `title` | `202 {id, status: "processing"}` |
| POST | `/notebooks/:id/sources/text` | `{title, text}` | `202` |
| POST | `/notebooks/:id/sources/link` | `{url, title?}` | `202` (private addresses are refused) |
| GET | `/notebooks/:id/sources` | none | sources with `status` (`processing`, `ready`, `failed`), `error`, `pageCount`, `chunkCount`; poll until `ready` |
| GET | `/notebooks/:id/sources/:sourceId/pages/:page` | none | `{page, text}` for opening a citation |
| DELETE | `/notebooks/:id/sources/:sourceId` | none | uploader or owner |

Scanned PDFs (no text layer) are accepted: the response is the same `202`, and the text is read by a vision model in the background; the source ends as `ready` or `failed` with a reason. At most 40 sources per notebook.

### Questions and explanations (F-04, F-10)
| Method | Path | Body | Result |
|---|---|---|---|
| POST | `/notebooks/:id/ask` | `{question}` | `{id, grounded, text, citations: [{sourceId, sourceTitle, page, quote}]}`; when `grounded` is false the text is the fixed refusal and `citations` is empty |
| POST | `/notebooks/:id/explain` | `{question}` | `{id, grounded, steps: [{text, emotion}], citations}`; `emotion` is one of neutral, curious, happy, thinking, encouraging, concerned |
| GET | `/notebooks/:id/questions?limit=` | none | history with `askedByName` |
| DELETE | `/notebooks/:id/questions/:questionId` | none | the asker or the owner |

### Quizzes (F-05, F-09, F-15)
| Method | Path | Body | Result |
|---|---|---|---|
| POST | `/notebooks/:id/quizzes` | `{kind?: practice\|weekly\|exam, count?, topic?, sourceId?, title?, timeLimitSec?, perQuestionSec?, dueAt?}` | `201 {id, questionCount}`; weekly needs `dueAt`, exam needs `timeLimitSec` |
| GET | `/notebooks/:id/quizzes` | none | list with `myAttempts`, `myBest` |
| GET | `/notebooks/:id/quizzes/:quizId` | none | `{questions: [{question, options[4], topic}], ...}` with no answers |
| POST | `/notebooks/:id/quizzes/:quizId/start` | none | exam only: starts the server clock |
| POST | `/notebooks/:id/quizzes/:quizId/attempts` | `{answers: (0..3 or null)[], durationMs?}` | `201 {score, total, results: [{correct, correctIndex, explanation, topic, sourceTitle, page}]}` |
| GET | `/notebooks/:id/quizzes/:quizId/scoreboard` | none | `{ranking: [{rank, name, score, total, durationMs}], notYetTaken}` |
| GET | `/notebooks/:id/quizzes/:quizId/attempts/mine` | none | my attempts |
| DELETE | `/notebooks/:id/quizzes/:quizId` | none | the creator or the owner |

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

### Platform
| Method | Path | Result |
|---|---|---|
| GET | `/health` | `{status, service, time}` |

Planned, not built: F-13 voice is frontend only (browser speech APIs).
