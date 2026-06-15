-- Allow contributions without a user account (BYOK users with improvement consent)
-- SQLite doesn't support ALTER COLUMN, so we recreate the tables

CREATE TABLE IF NOT EXISTS document_contributions_new (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'exam', 'slides')),
  original_filename TEXT,
  extracted_text TEXT,
  anonymized_text TEXT NOT NULL,
  subject TEXT,
  language TEXT NOT NULL DEFAULT 'de',
  consent_version TEXT NOT NULL,
  rights_confirmed INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('pending_review', 'approved', 'rejected', 'deleted')),
  created_at TEXT NOT NULL,
  deleted_at TEXT,
  content_hash TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO document_contributions_new SELECT * FROM document_contributions;
DROP TABLE document_contributions;
ALTER TABLE document_contributions_new RENAME TO document_contributions;

CREATE INDEX IF NOT EXISTS idx_document_contributions_user_id ON document_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_document_contributions_status ON document_contributions(status);

CREATE TABLE IF NOT EXISTS ai_contributions_new (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  source_contribution_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('analysis', 'generated_exam', 'grading')),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  output_json TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_review', 'approved', 'rejected', 'deleted')),
  created_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (source_contribution_id) REFERENCES document_contributions(id)
);

INSERT INTO ai_contributions_new SELECT * FROM ai_contributions;
DROP TABLE ai_contributions;
ALTER TABLE ai_contributions_new RENAME TO ai_contributions;

CREATE INDEX IF NOT EXISTS idx_ai_contributions_user_id ON ai_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_contributions_kind ON ai_contributions(kind);
CREATE INDEX IF NOT EXISTS idx_ai_contributions_status ON ai_contributions(status);
CREATE INDEX IF NOT EXISTS idx_ai_contributions_input_hash ON ai_contributions(input_hash);

CREATE TABLE IF NOT EXISTS consent_events_new (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  consent_type TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  granted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO consent_events_new SELECT * FROM consent_events;
DROP TABLE consent_events;
ALTER TABLE consent_events_new RENAME TO consent_events;

CREATE INDEX IF NOT EXISTS idx_consent_events_user_id ON consent_events(user_id);
