# F-11 Public notebooks and F-14 Study partners and friends

Status: implemented and tested.

Endpoints: `GET /public/notebooks?q=&category=`, `POST /public/notebooks/:id/join-requests`, `GET /notebooks/:id/join-requests`, `POST /notebooks/:id/join-requests/:userId/(approve|reject)`, `PATCH /me/profile`, `GET /me/partners`, and `/me/friends` with friend-request and removal actions.

Business rules
- BR-01 `public` makes a notebook discoverable (title, course, description, category, counts). It does not make its sources, questions or members readable: a non-member still gets 404 on the notebook itself.
- BR-02 Joining needs the owner's approval. Approved people join as `viewer`. Private notebooks cannot receive requests.
- BR-03 Search matches title, course and description, case-insensitive, at most 50 results.
- BR-04 Study partners (F-14, first version): opt-in only, matches people with the same course name, shows name and course, never an email. Contact happens by inviting them to a notebook.
- BR-05 Copyright: notebooks stay private by default; no public copies of uploaded files exist because original files are not stored.
- BR-06 Friend requests can target an exact email or a public profile ID. Unknown email addresses receive the same accepted response and are not listed or revealed.
- BR-07 A friend relationship requires accepting a request. Pending requests can be rejected or cancelled, and either person can remove the friendship.
- BR-08 Friend lists and request responses contain public names and courses only. An owner can add an accepted friend to a workspace with the editor or viewer role, or add a registered exact email. Workspace invite links keep the selected role.
- BR-09 A public profile reflects one of `none`, `incoming`, `outgoing`, or `friends`; incoming decisions are handled on the Friends page so request IDs stay server-backed.
