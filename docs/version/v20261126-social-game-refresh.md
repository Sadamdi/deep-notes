# Friends and interactive game refresh

| Attribute | Value |
|---|---|
| **Version** | v0.0.13 |
| **Date** | 2026-11-26 |
| **Status** | In Progress |
| **Author** | Maulvi |
| **Type** | Feature / UI |
| **Area** | backend / frontend / shared / docs |
| **Branch** | `maul/server-backed-inputs` |
| **PR** | — |

## 1. Why

Students need a clear way to find and invite one another before starting a workspace game. The game setup and rounds should also make the existing server-backed solo, duel, and group modes easier to follow on desktop and mobile.

## 2. Plan

- [x] Inspect final Figma game, lobby, result, mobile, and invite frames plus existing backend contracts.
- [x] Add persistent friend requests, accepted-friend operations, and safe response shapes.
- [x] Allow workspace owners to add an accepted friend by ID or a registered user by exact email, and select reader/editor role.
- [x] Identify the session host in the API and enforce the host and minimum-player rules on the server.
- [x] Align quiz setup and each game state with the Figma layout, palette, and responsive behavior.
- [x] Document the routes and add API and browser coverage for friendship, invitations, solo, duel, group, and mobile gameplay.
- [x] Run full CI and record local API/browser outcomes without writing to the shared demo database.
- [ ] Verify with the deployed API and a real AI model when the team deploys this migration and makes a safe test account available.

| Risk | Impact | Mitigation |
|---|---|---|
| Email-based friend requests can reveal whether an account exists. | Account discovery and unwanted requests. | Require an exact email, return a neutral response for unmatched addresses, and rate limit each account. |
| Client ranking can change during a match. | A player could be mistaken for the host. | Return a stable host ID and authorize starting on the server. |
| The demo API or model credentials may be unavailable. | Full deployed-model verification may not be possible. | Run isolated PGlite integration tests and report live verification separately. |

## 3. Files changed

Friendships and the two-player/12-player game rules are stored and enforced by the API. The frontend now has friend management, role-aware workspace invitations, host-aware lobbies, themed round types, a more orderly quiz launcher, and responsive game layouts. See [the friends and game flow](../flows/friends-and-game.md).

## 4. Before and after

Before: users can follow public profiles, owners can create an editor invite link, and the game UI uses a compact quiz form with one general round layout. After: users can manage accepted friendships, owners can invite friends with a chosen workspace role, the lobbies identify the host reliably, and game rounds use the final Figma's responsive stages and themed answer controls.

## 5. Data impact

Add a friendships table through a new local migration. Do not apply the migration to a hosted database.

## 6. Verification

- [x] `pnpm run ci` — lint, type-check, backend tests, frontend tests, and both builds passed.
- [x] PGlite API tests cover friend request, accept/reject/cancel, duplicates, privacy, workspace roles, host authorization, minimum players, group capacity, scoring, and results.
- [x] Playwright browser cases reported success for friend requests, role-aware invites, duel answer flow, and the 12-player group lobby and scoreboard on desktop and mobile viewports. These tests use mocked API responses.
- [x] Browser checks cover keyboard answer selection, visible result/source feedback, and reduced-motion expression behavior.
- [ ] A repeat full-CI run stalled while the embedded database test initialized; the earlier full CI run completed successfully. The latest Playwright run printed success for all six cases but stalled before its final summary, so the runner exit remains unverified.
- [ ] Real AI model and deployed-API browser checks remain pending; no hosted database or deployed service was changed.

## 7. Rollback

Revert the friendship migration and associated routes/UI. Friendship rows cascade with their users. Existing follow relationships and workspace invitations are unaffected.
