# F-11 Public notebooks and F-14 Study partners

Status: implemented and tested.

Endpoints: `GET /public/notebooks?q=&category=`, `POST /public/notebooks/:id/join-requests`, `GET /notebooks/:id/join-requests`, `POST /notebooks/:id/join-requests/:userId/(approve|reject)`, `PATCH /me/profile`, `GET /me/partners`.

Business rules
- BR-01 `public` makes a notebook discoverable (title, course, description, category, counts). It does not make its sources, questions or members readable: a non-member still gets 404 on the notebook itself.
- BR-02 Joining needs the owner's approval. Approved people join as `viewer`. Private notebooks cannot receive requests.
- BR-03 Search matches title, course and description, case-insensitive, at most 50 results.
- BR-04 Study partners (F-14, first version): opt-in only, matches people with the same course name, shows name and course, never an email. Contact happens by inviting them to a notebook.
- BR-05 Copyright: notebooks stay private by default; no public copies of uploaded files exist because original files are not stored.
