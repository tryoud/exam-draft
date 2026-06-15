CREATE TABLE IF NOT EXISTS share_links (
  id TEXT PRIMARY KEY,
  creator_user_id TEXT,
  exam_title TEXT NOT NULL,
  exam_subject TEXT NOT NULL,
  exam_task_count INTEGER NOT NULL,
  exam_duration INTEGER NOT NULL,
  exam_total_points REAL NOT NULL,
  task_titles_json TEXT NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (creator_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_share_links_creator ON share_links(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_share_links_expires ON share_links(expires_at);
