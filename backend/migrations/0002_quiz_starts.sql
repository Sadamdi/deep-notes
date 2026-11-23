-- Exam mode (F-09): the server records when a taker started, so the time limit cannot be bypassed from the browser.
CREATE TABLE quiz_starts (
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (quiz_id, user_id)
);
