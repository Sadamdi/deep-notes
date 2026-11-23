# F-05 Quizzes, F-09 exam mode, F-15 weekly group quiz

Status: implemented and tested.

Endpoints: `POST /notebooks/:id/quizzes`, `GET /quizzes`, `GET /quizzes/:quizId`, `POST /quizzes/:quizId/start`, `POST /quizzes/:quizId/attempts`, `GET /quizzes/:quizId/scoreboard`, `GET /quizzes/:quizId/attempts/mine`.

Generation: passages are picked across the notebook's ready sources (or nearest to a given topic), the model writes one 4-option question per passage, options are shuffled on the server, and each item stores its source and page, a short topic label and an explanation.

Business rules
- BR-01 Needs at least 3 readable passages; creating a quiz needs the editor role and counts against an AI limit (12 per 10 minutes).
- BR-02 The quiz shown to takers has no answers or explanations. They appear only in the result after submitting, with the source page to review.
- BR-03 Practice quizzes can be taken any number of times.
- BR-04 F-15 weekly quiz: same questions for every member, needs a due date, one attempt per member, closed after the due date. The scoreboard ranks the best attempt by score, then speed, and lists members who have not taken it.
- BR-05 F-09 exam: needs a time limit (optional per-question time for the interface). The server starts the clock at `/start` and rejects a submission after the limit plus 15 seconds; the stored duration is the server's measurement, not the browser's.
- BR-06 Each result row keeps topic, source and page; F-08 and F-16 are computed from them.
