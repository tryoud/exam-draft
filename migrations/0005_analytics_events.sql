CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  event TEXT NOT NULL,
  properties_json TEXT NOT NULL DEFAULT '{}',
  path TEXT,
  locale TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_created_at ON analytics_events(event, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
