CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  course text,
  looking_for_partners boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notebooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  course text,
  description text,
  category text,
  visibility text NOT NULL DEFAULT 'private', -- private | public
  owner_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notebook_members (
  notebook_id uuid NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'editor', -- owner | editor | viewer
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notebook_id, user_id)
);

CREATE TABLE invites (
  token text PRIMARY KEY,
  notebook_id uuid NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'editor',
  created_by uuid NOT NULL REFERENCES users(id),
  expires_at timestamptz NOT NULL,
  max_uses integer NOT NULL DEFAULT 20,
  uses integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE join_requests (
  notebook_id uuid NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notebook_id, user_id)
);

CREATE TABLE sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id uuid NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES users(id),
  title text NOT NULL,
  kind text NOT NULL, -- pdf | text | docx | pptx | link
  status text NOT NULL DEFAULT 'processing', -- processing | ready | failed
  error text,
  page_count integer,
  origin text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sources_notebook_idx ON sources(notebook_id);

CREATE TABLE source_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  notebook_id uuid NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  page integer,
  idx integer NOT NULL,
  content text NOT NULL,
  embedding vector(768)
);
CREATE INDEX source_chunks_notebook_idx ON source_chunks(notebook_id);
CREATE INDEX source_chunks_source_idx ON source_chunks(source_id);

CREATE TABLE questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id uuid NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  asked_by uuid NOT NULL REFERENCES users(id),
  question text NOT NULL,
  grounded boolean NOT NULL DEFAULT false,
  answer text NOT NULL,
  citations jsonb NOT NULL DEFAULT '[]',
  steps jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX questions_notebook_idx ON questions(notebook_id, created_at DESC);

CREATE TABLE quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id uuid NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id),
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'practice', -- practice | weekly | exam
  items jsonb NOT NULL,
  time_limit_sec integer,
  per_question_sec integer,
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quizzes_notebook_idx ON quizzes(notebook_id, created_at DESC);

CREATE TABLE quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  notebook_id uuid NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  answers jsonb NOT NULL,
  results jsonb NOT NULL, -- per item: { index, correct, topic, page, sourceId }
  score integer NOT NULL,
  total integer NOT NULL,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quiz_attempts_quiz_idx ON quiz_attempts(quiz_id);

CREATE TABLE activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id uuid NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  type text NOT NULL, -- source_added | question_asked | quiz_taken | assignment_done
  ref_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_notebook_idx ON activity(notebook_id, created_at DESC);

CREATE TABLE assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id uuid NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  assignee_id uuid NOT NULL REFERENCES users(id),
  assigned_by uuid NOT NULL REFERENCES users(id),
  topic text NOT NULL,
  source_id uuid REFERENCES sources(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'todo', -- todo | doing | done
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX assignments_notebook_idx ON assignments(notebook_id);
