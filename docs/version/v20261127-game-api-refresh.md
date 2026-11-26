# Game, streak, and API refresh

## Plan

- Move game and quiz entry points into the Game section while preserving redirects for existing workspace URLs.
- Reuse the current streak API and Figma artwork on Home and Profile, refreshing the query after a completed session.
- Exercise the local API implementation for friends, drafts, notes, discussion, saved posts, and source-grounded AI assistance against an isolated local database.
- Add recovery, notification, publication, classroom-presence, audio-transcription, and structured-visualization contracts and server flows.
- Verify desktop and mobile game progression, API authorization, local CI, and documented deployment prerequisites.

## Verification

- `pnpm run ci` passed: lint and type checks across shared, backend, and frontend; 35 frontend unit tests; 110 backend tests; and production builds for both apps.
- `pnpm --filter @deep-notes/frontend test:e2e` passed all 18 desktop and mobile browser tests. Coverage includes 31 route variants with API loading/error responses, all seven game types, duel/group progression, quiz navigation, friend requests and invitations, streak cards on Home/Profile, spreadsheet charts, ordered slide timelines, timestamped audio transcripts, and opening the publication flow from a Studio preview.
- Backend integration tests use a fresh PGlite database and apply the repository migrations, including migrations 0005–0008. They cover authorization, duplicate-safe writes, recovery and publication routes, presence, audio format rejection, transcript access, chart values, timeline order, and cached visualization responses. AI behavior is deterministic and mocked in those tests.
- No migration was applied to the shared/demo database. The running demo server was not used for authenticated writes or live-route verification.
- Real Gemini calls (upload, suggestions, cited answers, quiz, teach-back grading, and transcription) and SMTP delivery were not verified because live credentials and mail delivery access were not provided. Those checks remain necessary before calling these flows production-ready.
