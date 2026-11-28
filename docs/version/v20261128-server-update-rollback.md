# Restore the previous release when staging fails

| Attribute | Value |
|---|---|
| **Version** | v0.0.22 |
| **Date** | 2026-11-28 |
| **Status** | In Progress |
| **Author** | Maulvi |
| **Type** | Fix |
| **Area** | backend / docs |
| **Branch** | `maul/frontend-integration` |
| **PR** | — |

## 1. Why

The demo server updater removes the active release before copying the new one. A copy failure currently exits under `set -e` before rollback begins, leaving the backend files incomplete. Make every release-replacement failure enter rollback and prove the previous files are restored using an isolated local fixture.

## 2. Plan

- [x] Add a deterministic local fault-injection check for a failed release copy.
- [x] Route staging, install, restart, and health failures through rollback.
- [x] Update deployment guidance and version verification notes.
- [x] Record the operational lesson.

| Risk | Impact | Mitigation |
|---|---|---|
| Rollback command can itself fail | The previous release might not be restored | Guard each restore operation and report incomplete recovery clearly |
| Test accidentally touches the demo server | Could change live backend state | Use a fixture app/state directory, fake curl/npm/pm2, and no SSH or deploy invocation |

## 3. Files changed

| File | Change |
|---|---|
| `scripts/server-update.sh` | Ensure replacement and rollback failures are handled |
| `agents/work/2026-11-28-main-audit/server-update-rollback.sh` | Isolated fault-injection regression test |
| `docs/DEPLOYMENT.md` | Clarify recovery behavior |
| `docs/version/VERSION_INDEX.md` | Track this fix |
| `agents/knowledge/lessons.md` | Record the shell failure-handling lesson |

## 4. Before and after

Before: a failed copy after deleting the active `dist` or `migrations` exits immediately and leaves the release incomplete.

After: any failure while installing the new release attempts to restore `dist`, migrations, and `package.json`, then restarts the prior backend and records the failed release.

## 5. Data impact

No database changes. No migration is applied. The verification uses temporary local directories only; the shared demo server is not modified.

## 6. Verification

- [x] Fault-injection test: copy failure restores all previous files; confirmed red before the fix and green after.
- [x] `bash -n scripts/server-update.sh agents/work/2026-11-28-main-audit/server-update-rollback.sh`
- [x] `pnpm run ci` (lint, type-check, 38 frontend tests, 113 backend tests, and both builds).
- [x] Browser E2E on the pulled `main` snapshot: 30/30 passed (desktop and mobile).
- [x] Public demo health: `GET /api/v1/health` returned 200.
- [x] Public OpenAPI includes AI assist, publications, and drafts; release manifest commit matches the pulled `main` commit `e8bc98bc598e9b563066252928402b2a6ae0a496`.
- [x] Unauthenticated `POST /api/v1/notebooks/:id/ai/assist` returned 401, confirming the route is registered and authentication is enforced.
- [x] Isolated local API write flows: registered three disposable `example.com` test users in a fresh PGlite database, created a notebook, shared it with a member, saved a private note, discussion post, updated draft, and saved feed post. A non-member could not read the discussion (404), and the shared member could not read the owner's private note.
- [x] Persistence and login after restart: restarted the isolated backend, logged the test users in again, and confirmed the notebook, note, discussion, updated draft, and saved post remained available.
- [x] Browser integration through the Vite API proxy: signed in through the local UI, opened the test workspace, created a note and confirmed it after reload, and sent a discussion message. Browser run reported zero API errors.
- [ ] Authenticated Gemini/Bubi request: not verified. `GEMINI_API_KEYS` is not configured in the local backend. The public demo was only checked with an unauthenticated AI-assist request (401); no write request was sent to the shared demo.

## 7. Rollback

This is an operational script fix with no database impact. Revert the script change to roll it back. Do not run the live updater as part of verification. The change has not been merged or installed on the demo server.
