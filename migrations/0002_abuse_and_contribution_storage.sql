CREATE TABLE IF NOT EXISTS auth_attempts (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  email TEXT NOT NULL,
  email_domain TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'blocked')),
  reason TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_attempts_email_created_at ON auth_attempts(email, created_at);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_ip_created_at ON auth_attempts(ip_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_domain_created_at ON auth_attempts(email_domain, created_at);

ALTER TABLE document_contributions ADD COLUMN content_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_document_contributions_content_hash ON document_contributions(content_hash);
