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

| Method | Path | Status | Description |
|---|---|---|---|
| GET | `/health` | implemented | service status and time |
| POST | `/auth/register`, `/auth/login`, `/auth/logout`, GET `/auth/me` | planned | accounts and session |
| GET/POST | `/notebooks` | planned | list and create notebooks |
| GET | `/notebooks/:id` | planned | notebook detail (members only) |
| POST | `/notebooks/:id/members` | planned | invite a member |
| GET/POST | `/notebooks/:id/sources` | planned | list and upload sources |
| POST | `/notebooks/:id/questions` | planned | ask a question, returns an `Answer` |
| POST | `/notebooks/:id/quizzes` | planned | generate a quiz from the sources |
| POST | `/quizzes/:id/attempts` | planned | submit answers, returns score |
| GET | `/notebooks/:id/contributions` | planned | who added which sources |

Mark an endpoint `implemented` only after it has a test and a feature doc in `docs/features/`.
