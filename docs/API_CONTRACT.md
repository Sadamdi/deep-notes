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

Status: `implemented` (has a test and a feature doc), `planned` (agreed, not built). Frontend can build against the planned shapes now; the Zod schema in `shared/` is added in the same PR that adds the endpoint, so check there first. IDs refer to [PLAN_SEMIFINAL.md](PLAN_SEMIFINAL.md).

| Feature | Method | Path | Status | Description |
|---|---|---|---|---|
| platform | GET | `/health` | implemented | service status and time |
| F-01 | POST | `/auth/register` | planned | create an account (rate limited) |
| F-01 | POST | `/auth/login`, `/auth/logout` | planned | start or end a session (httpOnly cookie) |
| F-01 | GET | `/auth/me` | planned | current user |
| F-02 | GET, POST | `/notebooks` | planned | my notebooks (cursor list), create |
| F-02 | GET, PATCH, DELETE | `/notebooks/:id` | planned | detail (members only); owner edits or deletes |
| F-02 | GET, POST | `/notebooks/:id/members` | planned | list; invite by username or email |
| F-02 | POST | `/notebooks/join` | planned | join with an invite code or link |
| F-03 | GET, POST | `/notebooks/:id/sources` | planned | list; upload (multipart) |
| F-03 | GET, DELETE | `/notebooks/:id/sources/:sourceId` | planned | status and details; remove |
| F-04 | POST | `/notebooks/:id/questions` | planned | ask; returns an `Answer` (grounded with citations, or "not found") |
| F-04 | GET | `/notebooks/:id/questions` | planned | question history (cursor) |
| F-05 | POST | `/notebooks/:id/quizzes` | planned | generate a quiz from the sources |
| F-05 | GET | `/notebooks/:id/quizzes`, `/quizzes/:quizId` | planned | list; detail (no answers before submitting) |
| F-05 | POST | `/quizzes/:quizId/attempts` | planned | submit answers; returns score and per-question result |
| F-06 | GET | `/notebooks/:id/contributions` | planned | per member: sources added, questions asked, quizzes taken |
| F-08 | GET | `/notebooks/:id/progress` | planned | group quiz results and weak topics |
| F-09 | POST | `/quizzes/:quizId/attempts/start` | planned | start a timed attempt (exam mode) |
| F-10 | (inside F-04) | `Answer.steps[]` | planned | explanation steps, each with an `emotion` for the companion |
| F-11 | GET | `/public/notebooks` | planned | browse and search public notebooks by category |
| F-11 | POST | `/public/notebooks/:id/join-request` | planned | ask to join a public notebook |

Mark an endpoint `implemented` only after it has a test, a feature doc in `docs/features/`, and a verified run.
