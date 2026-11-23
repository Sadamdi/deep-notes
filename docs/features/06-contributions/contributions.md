# F-06 Contributions view

Status: implemented and tested.

Endpoint: `GET /notebooks/:id/contributions`.

Returns, per member: sources added, questions asked, quizzes taken, assignments completed, last active time, plus the 30 most recent activities of the group. Backed by an append-only `activity` table written by the other features.

Business rules
- BR-01 Visible to every member of the notebook, to no one else.
- BR-02 Counts reflect actions inside this notebook only.
- BR-03 It describes activity, not quality or grades; the interface should present it as visibility for the group, not a ranking.
