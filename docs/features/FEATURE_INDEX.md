# Feature index

One document per feature area in `docs/features/<NN-area>/<name>.md`, copied from [_FEATURE_TEMPLATE.md](_FEATURE_TEMPLATE.md). Business rules are numbered `BR-XX` so code, tests and PRs can refer to them. IDs match [../PLAN_SEMIFINAL.md](../PLAN_SEMIFINAL.md). Status `implemented` means the backend exists, has automated tests, and was run against the real models and database; the web interface is built separately.

| ID | Area | Feature | Priority | Doc | Status |
|---|---|---|---|---|---|
| platform | 00-platform | Health check | n/a | [health.md](00-platform/health.md) | implemented |
| F-01 | 01-accounts | Accounts and sessions | P0 | [accounts.md](01-accounts/accounts.md) | implemented (backend) |
| F-02 | 02-notebooks | Notebooks, membership, invites | P0 | [notebooks.md](02-notebooks/notebooks.md) | implemented (backend) |
| F-03 | 03-sources | Source upload and ingestion | P0 | [ingestion.md](03-sources/ingestion.md) | implemented (backend) |
| F-04 | 04-answers | Cited question answering | P0 | [answers.md](04-answers/answers.md); flow: [ask-with-citations](../flows/ask-with-citations.md) | implemented (backend) |
| F-05 | 05-quizzes | Quizzes and attempts | P0 | [quizzes.md](05-quizzes/quizzes.md) | implemented (backend) |
| F-06 | 06-contributions | Contributions view | P0 | [contributions.md](06-contributions/contributions.md) | implemented (backend) |
| F-07 | 07-evaluation | Grounding evaluation | P0 | [grounding-evaluation.md](07-evaluation/grounding-evaluation.md) | implemented |
| F-08 | 08-group | Group progress | P1 | [group.md](08-group/group.md) | implemented (backend) |
| F-09 | 05-quizzes | Exam mode | P1 | [quizzes.md](05-quizzes/quizzes.md) | implemented (backend) |
| F-10 | 04-answers | Explanation steps with emotion | P1 | [answers.md](04-answers/answers.md) | implemented (backend); animation is frontend |
| F-11 | 09-public | Public notebooks and discovery | P1 | [public.md](09-public/public.md) | implemented (backend) |
| F-12 | 03-sources | PPTX, DOCX, links | P2 | [ingestion.md](03-sources/ingestion.md) | implemented (backend) |
| F-13 | n/a | Voice input and output | P2 | browser speech APIs, frontend only | planned (frontend) |
| F-14 | 09-public | Find study partners | later | [public.md](09-public/public.md) | first version (opt-in, same course) |
| F-15 | 05-quizzes | Weekly group quiz with scoreboard | P1 | [quizzes.md](05-quizzes/quizzes.md) | implemented (backend) |
| F-16 | 08-group | Knowledge gap map | P1 | [group.md](08-group/group.md) | implemented (backend) |
| F-17 | 08-group | Study assignments per member | P1 | [group.md](08-group/group.md) | implemented (backend) |
| F-18 | 10-play | Game sessions: automatic game choice, 7 game types, points, streak, badges, duel and group | P1 | [play.md](10-play/play.md) | implemented (backend) |
| F-19 | 04-answers | Teach-back: explain to the mascot | P1 | [play.md](10-play/play.md) | implemented (backend) |
| F-20 | 03-sources | Mind map of a source | P2 | [play.md](10-play/play.md) | implemented (backend) |
| F-21 | 11-feed | Social feed: posts, likes, comments, follows | P1 | [feed.md](11-feed/feed.md) | implemented (backend) |
| UI-01 | 12-frontend | Final Figma frontend experience and API boundaries | P0 | [experience.md](12-frontend/experience.md) | implemented (frontend); live API verification pending |
| UI-02 | 12-frontend | Contract-driven Bubi expressions and motion | P1 | [bubi-expressions.md](12-frontend/bubi-expressions.md) | implemented (frontend); live API flow not verified |
| UI-03 | 12-frontend | Source-grounded AI actions across learning tools | P1 | [ai-actions.md](12-frontend/ai-actions.md) | in progress |
