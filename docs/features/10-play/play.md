# F-18 Game sessions, F-19 Teach-back, F-20 Mind map

Status: implemented and tested (`backend/tests/play.test.ts`). Contract for the frontend: [../../GAME_CONTRACT.md](../../GAME_CONTRACT.md).

Business rules
- BR-01 Game types are chosen by rule (`chooseTypes`), not by the model. The model only writes item content from passages of the notebook.
- BR-02 Players never receive answers before submitting; answers live in the stored plan only. Duel and group items stay hidden until the creator starts.
- BR-03 A round the sources cannot support falls back to multiple choice; if nothing can be built the API returns `409`.
- BR-04 Fill items are kept only if the blank exists and the answer really occurs in the source passage. Match items need unique terms and definitions. Order items need 3 to 6 steps. True/false items are written by the model from one passage; their truth is not machine-verified (limit to report).
- BR-05 Grading is deterministic for all types except `teach`, which is judged by the model against retrieved sources.
- BR-06 Points: 100 per correct item, up to 200 for teach, speed bonus up to 50 per round. Streak counts consecutive UTC days with a finished session; points and streak are counted once per finished session.
- BR-07 Badges are awarded on finish and never revoked. Reference sources (`sourceIds`) restrict every part of a session.
- BR-08 Duel holds 2 players, group 12. Members of the notebook only; outsiders get 404.
- BR-09 Teach-back: the mascot replies as a confused student using only retrieved sources; a topic missing from the sources is reported as not checkable (`checkable: false`), never judged.
- BR-10 Mind map nodes cite a page only if that page exists; edges to unknown nodes are dropped; results are cached per source.
- BR-11 Duel and group session responses include a stable `hostId`. Only that host can start, and the backend requires at least two joined players regardless of client state.
- BR-12 Waiting/running sessions are polled from the frontend. The lobby shows host and participant counts; sessions remain restricted to workspace members.
- Limits: 20 AI game requests per 10 minutes per user. Quality of generated items with the real models is checked with `agents/e2e-live.mjs`; no accuracy figure is claimed.
