CREATE TABLE IF NOT EXISTS contact_intents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  type TEXT NOT NULL,
  ga_client_id TEXT,
  ga_session_id TEXT,
  ga_session_number TEXT,
  landing_page TEXT,
  referrer TEXT,
  ip_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_contact_intents_ga_client_id
  ON contact_intents(ga_client_id, created_at DESC);
