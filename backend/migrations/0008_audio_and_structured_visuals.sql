-- Store source-derived structure separately from retrieval chunks so charts and transcripts stay exact.
CREATE TABLE source_transcripts (
  source_id uuid PRIMARY KEY REFERENCES sources(id) ON DELETE CASCADE,
  segments jsonb NOT NULL
);

CREATE TABLE source_tables (
  source_id uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  table_index integer NOT NULL,
  name text NOT NULL,
  headers jsonb NOT NULL,
  rows jsonb NOT NULL,
  PRIMARY KEY (source_id, table_index)
);
