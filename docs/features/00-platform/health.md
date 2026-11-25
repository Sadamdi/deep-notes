# Health check

| Attribute | Value |
|---|---|
| **Area** | 00-platform |
| **Status** | implemented |
| **Owner** | Adam |
| **Endpoints** | `GET /api/v1/health` |
| **Schemas** | `healthSchema` in `shared/src/api.ts` |
| **Last updated** | 2026-11-19 |

## Purpose

Lets the frontend, CI smoke checks and the hosting platform confirm the backend is up. The frontend shell shows the result as the `ApiStatus` badge in the desktop/tablet sidebar and the mobile top bar.

## Business rules

- **BR-01** No authentication and no database access: the check must work even when the database is down.
- **BR-02** The payload contains no environment details or versions.

## Behavior

Returns `{ success: true, data: { status: "ok", service: "deep-notes-api", time: <ISO timestamp> } }`.

## Verification

`backend/tests/health.test.ts`: 200 with a payload that validates against `healthSchema`, and the error envelope for unknown routes.
