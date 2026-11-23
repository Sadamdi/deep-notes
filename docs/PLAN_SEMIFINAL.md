# Plan: semifinal (30 Nov) and Final Day (16 Dec)

Written 23 Nov 2026. Owner of the backend and infrastructure: Adam. Frontend and design: the other members. This is the shared plan: frontend and backend both build against it, and any AI agent working in this repo should read it after `AGENTS.md`.

Dates come from the handbook and may change: semifinal submission **30 Nov**, Top 10 announcement 7 Dec, Final Day **16 Dec** (working prototype, 10 minute demo, 10 minute Q&A). The team plans to pay the semifinal fee around 25 Nov, after the preliminary judge review.

## 1. Goals and how they are judged

| Semifinal criterion (from the handbook) | Weight | What we must show |
|---|---|---|
| Problem understanding | 25% | stronger evidence than 6 survey answers; clear user and situation |
| Solution design | 25% | a distinct, honest value over NotebookLM (see [COMPETITIVE_ANALYSIS](product/COMPETITIVE_ANALYSIS.md)); main user journey |
| Technical feasibility | 20% | chosen models, architecture, working backend |
| Execution and validation | 20% | a running prototype, a measured grounding evaluation, a small real trial |
| Communication | 10% | proposal in English, a 2 minute video with clear audio |

Preliminary feedback and our response: [product/PRELIM_FEEDBACK.md](product/PRELIM_FEEDBACK.md).

Deliverables due 30 Nov: a proposal PDF (at most 10 content pages, English, plus cover, references and signed originality declaration) and one video of at most 2 minutes, 1080p, with audio, that introduces the team, explains the problem and solution, shows the user flow or early prototype, and states what is done and what remains.

## 2. Product scope by priority

Priority P0 must exist in a working form for the 30 Nov video and the Final Day demo. P1 is built after that. P2 only if time remains. Everything not built is described as planned.

| ID | Feature | Pri | Why (source) |
|---|---|---|---|
| F-01 | Accounts and sessions (email and password) | P0 | needed for groups |
| F-02 | Notebooks, membership, roles; invite by link and by username | P0 | core flow; meeting 20 Nov |
| F-03 | Source upload: PDF and plain text/markdown, page-aware ingestion, status | P0 | core flow |
| F-04 | Cited question answering from the group's sources, with "not found" fallback | P0 | core flow; feasibility |
| F-05 | Quizzes from sources (practice) with score; shared results in the notebook | P0 | core flow; meeting 20 Nov |
| F-06 | Contributions view (who added sources, asked questions, took quizzes) | P0 | our main group-level differentiator |
| F-07 | Grounding evaluation script and report | P0 | validation evidence (20% weight) |
| F-08 | Group progress: quiz results compared across members, weak topics | P1 | differentiator |
| F-09 | Exam mode: timed quiz, per-question timer, result page | P1 | meeting 20 Nov |
| F-10 | Explanation steps with an `emotion` per step for the animated companion | P1 | meeting 20 Nov; text-first inclusivity |
| F-11 | Public notebooks: visibility flag, categories, search, join request | P1 | meeting 20 Nov (social, Substack-like) |
| F-12 | More source types: PPTX, DOCX, web link (with SSRF protection) | P2 | meeting 20 Nov |
| F-13 | Voice input/output | P2 | frontend-only with browser speech APIs; backend not needed |
| F-14 | Find study partners | later | abstract, not the core |
| F-15 | Weekly group quiz with scoreboard (same questions for every member, shared deadline) | P1 | group-level differentiator; builds on F-05 and F-08 |
| F-16 | Knowledge gap map: topics most often missed by members, each linked to cited source pages | P1 | group-level differentiator; extends F-08 |
| F-17 | Study assignments: each member owns a chapter or topic; group progress on one screen | P1 | group-level differentiator; builds on F-06 |

Rules that apply to every AI feature: answers use only retrieved chunks; a grounded answer needs at least one valid citation; otherwise the answer is `grounded: false` with "not found in the sources" (see [ARCHITECTURE.md](ARCHITECTURE.md)).

## 3. Architecture decisions for this phase

Full detail in [ARCHITECTURE.md](ARCHITECTURE.md) and [DEPLOYMENT.md](DEPLOYMENT.md). Summary:

| Topic | Decision |
|---|---|
| Hosting | one VPS runs nginx (static frontend plus `/api` reverse proxy) and the Node backend under pm2. Same origin, so no CORS in production. |
| Database | PostgreSQL with pgvector on Supabase (Singapore region), via the session pooler. One database for development and a separate one for the demo, never shared (see section 5). |
| AI | a provider layer with Gemini as primary and an OpenAI-compatible endpoint as fallback for text generation. **Embeddings stay on one pinned model** because vectors from different models are not comparable. Model ids are configuration, chosen by a real API call (task T-012). |
| Auth | server-side sessions in the database, httpOnly cookie, passwords hashed with argon2id. |
| Files | uploaded files stay on the server disk (private directory, never served directly), size and type limits. |
| Jobs | ingestion runs in-process with a small concurrency limit, retry with backoff, and status on the source row. No separate queue service. |
| Secrets | only in `.env` on each machine and in the host's secret store. Never in git, chat, docs, or logs. |

## 4. Work plan

Dates are targets. If we fall behind, cut in this order: F-12, F-13, F-11, F-09, F-08. Never cut F-04, F-06 and F-07: they are the proof.

| Phase | Dates | Backend (Adam) | Frontend and design | Product and docs |
|---|---|---|---|---|
| P0 Foundation | 23 to 25 Nov | rotate exposed secrets; dev database; first migration; AI client smoke test and model choice; server bootstrap; health endpoint live on the server | login and notebook list screens; character and asset sketches | collect survey responses; start the comparison table |
| P1 Core API | 25 to 27 Nov | F-01, F-02 with isolation tests; invites | notebook workspace layout wired to the API | proposal outline |
| P2 Ingestion | 26 to 28 Nov | F-03: parsing, page-aware chunks, embeddings, status | upload UI, source list, status | proposal: problem and user analysis |
| P3 Cited answers | 27 to 29 Nov | F-04 and F-07: retrieval, validated citations, fallback, evaluation report | ask box, answer card, citation chip | proposal: solution and technical design |
| P4 Demo cut | 28 to 30 Nov | F-05, F-06; stable deploy; seeded demo notebook from public or team-written material | quiz UI, contribution view; record the video | proposal: validation, plan, declaration; submit **30 Nov** |
| P5 Group depth | 1 to 10 Dec | F-08, F-09, F-10, F-11 | companion animation, exam UI, public discovery | trial with real students; update evidence |
| P6 Hardening | 10 to 15 Dec | performance, quotas, backups, rehearsal data; fix defects | polish; demo rehearsal | slides (15 at most); pitch |

## 5. Environments and data safety

| Environment | Database | Used for |
|---|---|---|
| Local / dev | its own PostgreSQL (a second Supabase project or a local install) | all development, tests, seed, cleanup |
| Demo / server | the Supabase project reserved for the server | the running demo only; migrations applied deliberately |

The seed and cleanup scripts refuse to run unless `DATABASE_URL` points at localhost. That guard is intentional: a hosted database counts as shared, so nobody runs tests or seeds against it. If only one hosted database exists, use it for the server and run development on a local install.

## 6. Validation plan (answers the "thin evidence" feedback)

1. **Survey.** Re-share the form to many groups; target 30 or more real responses; update the figures only from the sheet. Record dates and groups for the methods section. Team members do not fill it in.
2. **Grounding evaluation (F-07).** A fixed set of questions over a demo notebook: some answerable from the sources, some not. Report: share of answerable questions answered with a correct citation, and share of unanswerable questions correctly refused. Numbers go to the proposal exactly as measured, with the date and the model used.
3. **Small real trial (P5).** A few students use the prototype for a study session; record questions asked, citations opened, quiz completion, and a short satisfaction rating. Report as an early test with its sample size, never as proof.
4. **Privacy and risk.** Note that uploaded material may be copyrighted: notebooks are private in version one, no public copies of uploaded files, demo data is public or team-written.

## 7. Proposal map (what goes where)

| Handbook section | Source in this repo |
|---|---|
| Project and team identity | `README.md`, `docs/product/PRODUCT_BRIEF.md` |
| Problem and user analysis | survey results, `docs/product/PRELIM_FEEDBACK.md`, `COMPETITIVE_ANALYSIS.md` |
| Proposed solution | `docs/product/PRODUCT_BRIEF.md`, feature docs, mockups from the design members |
| Technical design | `docs/ARCHITECTURE.md`, `docs/flows/`, `docs/API_CONTRACT.md` |
| Development plan | this file, `docs/ROADMAP.md`, git history for member contributions |
| Validation and impact | evaluation report, trial notes, risks and privacy from section 6 |
| References and declaration | `docs/AI_DISCLOSURE.md`, signed originality declaration |

## 8. Risks

| Risk | Mitigation |
|---|---|
| Time: 7 days to the demo cut | strict priority order above; one demo notebook; cut list |
| AI quota or key failure | provider fallback for text; backoff; per-notebook quotas; cache embeddings; never block reading |
| Wrong or unsupported answers | validated citations, refusal fallback, evaluation report |
| Originality criticism | honest comparison; build and demonstrate the group-level features before claiming them |
| Secrets exposed in chat | rotate immediately (see DEPLOYMENT.md section 1); keep secrets out of transcripts |
| Single-person backend and server | docs and scripts so any member can deploy; deploy script with automatic rollback |
