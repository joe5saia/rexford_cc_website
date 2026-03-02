CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submitted_at TEXT NOT NULL,
  source TEXT NOT NULL,
  loan_type TEXT NOT NULL,
  loan_amount TEXT NOT NULL,
  business_type TEXT,
  timeline TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  best_time_to_call TEXT,
  details TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  email_status TEXT NOT NULL DEFAULT 'pending',
  email_error TEXT,
  emailed_at TEXT,
  raw_payload TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inquiries_submitted_at ON inquiries(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_email_status ON inquiries(email_status);
