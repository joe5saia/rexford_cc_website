CREATE INDEX IF NOT EXISTS idx_inquiries_ip_hash_submitted_at
  ON inquiries(ip_hash, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_inquiries_email_submitted_at
  ON inquiries(email, submitted_at DESC);
