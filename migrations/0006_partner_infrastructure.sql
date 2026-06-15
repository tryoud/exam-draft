-- Partner organizations (Fachschaften, Tutorien, etc.)
CREATE TABLE IF NOT EXISTS partner_applications (
  id TEXT PRIMARY KEY,
  org_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  org_type TEXT NOT NULL CHECK (org_type IN ('fachschaft', 'tutorium', 'uni_group', 'other')),
  university TEXT,
  subjects TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'approved', 'rejected')),
  ip_hash TEXT,
  created_at TEXT NOT NULL
);

-- Module metadata (university course/module level)
CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  university TEXT,
  country TEXT NOT NULL DEFAULT 'DE',
  language TEXT NOT NULL DEFAULT 'de',
  department TEXT,
  subject_area TEXT,
  created_at TEXT NOT NULL
);

-- Aggregated exam pattern data extracted from approved contributions
CREATE TABLE IF NOT EXISTS exam_pattern_snapshots (
  id TEXT PRIMARY KEY,
  module_id TEXT,
  subject TEXT NOT NULL,
  task_types_json TEXT NOT NULL,
  topic_areas_json TEXT NOT NULL,
  total_points REAL,
  estimated_duration INTEGER,
  exam_count INTEGER NOT NULL DEFAULT 1,
  confidence_score REAL,
  coverage_score REAL,
  year_semester TEXT,
  source_contribution_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'deleted')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (module_id) REFERENCES modules(id),
  FOREIGN KEY (source_contribution_id) REFERENCES ai_contributions(id)
);

CREATE INDEX IF NOT EXISTS idx_partner_applications_status ON partner_applications(status);
CREATE INDEX IF NOT EXISTS idx_partner_applications_email ON partner_applications(contact_email);
CREATE INDEX IF NOT EXISTS idx_modules_name ON modules(name);
CREATE INDEX IF NOT EXISTS idx_exam_pattern_snapshots_module ON exam_pattern_snapshots(module_id);
CREATE INDEX IF NOT EXISTS idx_exam_pattern_snapshots_subject ON exam_pattern_snapshots(subject);
CREATE INDEX IF NOT EXISTS idx_exam_pattern_snapshots_status ON exam_pattern_snapshots(status);
