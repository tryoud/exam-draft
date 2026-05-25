CREATE TABLE IF NOT EXISTS ai_contributions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_ai_contributions_user_id ON ai_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_contributions_kind ON ai_contributions(kind);
CREATE INDEX IF NOT EXISTS idx_ai_contributions_status ON ai_contributions(status);
CREATE INDEX IF NOT EXISTS idx_ai_contributions_input_hash ON ai_contributions(input_hash);
