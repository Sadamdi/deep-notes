-- Game sessions (auto-planned rounds, solo, duel and group), points, streaks, badges, and the social feed.

CREATE TABLE game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id uuid NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'solo', -- solo | duel | group
  status text NOT NULL DEFAULT 'running', -- waiting | running | finished
  focus_topic text,
  plan jsonb NOT NULL, -- rounds with items, answers included: never sent to players before they answer
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);
CREATE INDEX game_sessions_notebook_idx ON game_sessions(notebook_id, created_at DESC);

CREATE TABLE session_participants (
  session_id uuid NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  finished boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, user_id)
);

CREATE TABLE session_answers (
  session_id uuid NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  round_index integer NOT NULL,
  results jsonb NOT NULL,
  correct_count integer NOT NULL,
  total integer NOT NULL,
  points integer NOT NULL,
  elapsed_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, user_id, round_index)
);

CREATE TABLE user_stats (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  streak integer NOT NULL DEFAULT 0,
  best_streak integer NOT NULL DEFAULT 0,
  last_play_date date,
  sessions_played integer NOT NULL DEFAULT 0
);

CREATE TABLE badges (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge)
);

CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL,
  attach jsonb, -- { type: "notebook", notebookId } | { type: "result", sessionId }
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX posts_created_idx ON posts(created_at DESC);

CREATE TABLE post_likes (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX post_comments_post_idx ON post_comments(post_id, created_at);

CREATE TABLE follows (
  follower_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);

-- cached visualisations (mind maps) so the model is not asked twice for the same source
CREATE TABLE source_visuals (
  source_id uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  kind text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_id, kind)
);
