# F-08 Group progress, F-16 Knowledge gap map, F-17 Study assignments

Status: implemented and tested (`backend/tests/group-features.test.ts`).

Endpoints: `GET /notebooks/:id/progress`, `GET /notebooks/:id/gaps`, `GET/POST /notebooks/:id/assignments`, `PATCH/DELETE /notebooks/:id/assignments/:assignmentId`.

Business rules
- BR-01 Progress: per member, attempts, average and best percent, last attempt; plus the group average. Members with no attempts show empty values, not zero.
- BR-02 Gap map: every quiz answer carries its topic, source and page. Topics are ranked by miss rate, with how many members missed them and the exact source pages to review. Topics nobody missed are not listed.
- BR-03 Assignments: the owner gives a member a topic, optionally tied to a source of the same notebook, with an optional due date. The assignee or the owner sets `todo`, `doing` or `done`. The assignee must be a member and the source must belong to the notebook.
- BR-04 Marking an assignment `done` counts as a contribution for the assignee.
- BR-05 One screen shows per-member assignment progress (done of total).
- Honest scope: these views are computed from quiz attempts and assignments only; with few attempts they are noisy and should show sample sizes in the interface.
