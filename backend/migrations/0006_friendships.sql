CREATE TABLE friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  CHECK (requester_id <> addressee_id)
);

CREATE UNIQUE INDEX friendships_pair_idx
  ON friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));
CREATE INDEX friendships_incoming_idx ON friendships (addressee_id, created_at DESC) WHERE status = 'pending';
CREATE INDEX friendships_requester_idx ON friendships (requester_id, created_at DESC);
CREATE INDEX friendships_accepted_requester_idx ON friendships (requester_id, accepted_at DESC) WHERE status = 'accepted';
CREATE INDEX friendships_accepted_addressee_idx ON friendships (addressee_id, accepted_at DESC) WHERE status = 'accepted';
