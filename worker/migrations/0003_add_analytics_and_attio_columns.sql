-- Add analytics context columns to inquiries
ALTER TABLE inquiries ADD COLUMN ga_client_id TEXT;
ALTER TABLE inquiries ADD COLUMN ga_session_id TEXT;
ALTER TABLE inquiries ADD COLUMN ga_session_number TEXT;
ALTER TABLE inquiries ADD COLUMN gclid TEXT;
ALTER TABLE inquiries ADD COLUMN utm_source TEXT;
ALTER TABLE inquiries ADD COLUMN utm_medium TEXT;
ALTER TABLE inquiries ADD COLUMN utm_campaign TEXT;
ALTER TABLE inquiries ADD COLUMN utm_term TEXT;
ALTER TABLE inquiries ADD COLUMN utm_content TEXT;
ALTER TABLE inquiries ADD COLUMN landing_page TEXT;
ALTER TABLE inquiries ADD COLUMN referrer TEXT;

-- Attio sync tracking
ALTER TABLE inquiries ADD COLUMN attio_person_id TEXT;
ALTER TABLE inquiries ADD COLUMN attio_list_entry_id TEXT;
ALTER TABLE inquiries ADD COLUMN attio_note_id TEXT;
ALTER TABLE inquiries ADD COLUMN attio_sync_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE inquiries ADD COLUMN attio_sync_error TEXT;
ALTER TABLE inquiries ADD COLUMN attio_synced_at TEXT;

-- Index for contact-intent correlation
CREATE INDEX IF NOT EXISTS idx_inquiries_ga_client_id ON inquiries(ga_client_id);
