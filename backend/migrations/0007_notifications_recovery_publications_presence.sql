CREATE TABLE password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX password_reset_user_idx ON password_reset_tokens(user_id, created_at DESC);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('friend_request', 'friend_accepted', 'workspace_member_added', 'join_request_decision')),
  title text NOT NULL,
  body text NOT NULL,
  href text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_recipient_idx ON notifications(recipient_id, created_at DESC);

CREATE TABLE classroom_presence (
  notebook_id uuid NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notebook_id, user_id)
);
CREATE INDEX classroom_presence_expiry_idx ON classroom_presence(last_seen_at);

CREATE TABLE published_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notebook_id uuid REFERENCES notebooks(id) ON DELETE CASCADE,
  visibility text NOT NULL CHECK (visibility IN ('public', 'workspace')),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'withdrawn')),
  current_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((visibility = 'public' AND notebook_id IS NULL) OR (visibility = 'workspace' AND notebook_id IS NOT NULL))
);
CREATE INDEX published_articles_feed_idx ON published_articles(updated_at DESC) WHERE status = 'published';
CREATE INDEX published_articles_author_idx ON published_articles(author_id, updated_at DESC);

CREATE TABLE published_article_versions (
  article_id uuid NOT NULL REFERENCES published_articles(id) ON DELETE CASCADE,
  version integer NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  body text NOT NULL,
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (article_id, version)
);

CREATE TABLE article_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES published_articles(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES article_comments(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX article_comments_article_idx ON article_comments(article_id, created_at);
