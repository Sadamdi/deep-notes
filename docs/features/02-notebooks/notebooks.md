# F-02 Notebooks, membership, invites

Status: implemented and tested, including isolation tests (`backend/tests/core.test.ts`).

Endpoints: `POST/GET /notebooks`, `GET/PATCH/DELETE /notebooks/:id`, `GET/POST /notebooks/:id/members`, `PATCH/DELETE /notebooks/:id/members/:userId`, `POST /notebooks/:id/invites`, `POST /invites/:token/accept`.

Business rules
- BR-01 The creator becomes `owner`. Roles: `owner` (everything), `editor` (add sources, ask, take quizzes), `viewer` (read, ask, take quizzes).
- BR-02 A user who is not a member gets `404 NOT_FOUND` for every notebook route, never `403`, so the existence of other groups' notebooks is not revealed. Tests cover 13 nested routes plus malformed ids.
- BR-03 An invite link carries a role (editor or viewer), expires (1 to 30 days, default 7) and has a use limit (default 20).
- BR-04 The owner can add a member by email, change roles, and remove others. The owner cannot be demoted or removed; a member can leave.
- BR-05 Only the owner can change settings, delete the notebook, create invites, or assign work.
