-- Tutor "Contact us" form (Settings page) — every send is logged here so the
-- tutor can see what they've already reached out about, in addition to the
-- email sent via Resend.

CREATE TABLE IF NOT EXISTS contact_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject    TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_messages_tutor_idx ON contact_messages(tutor_id, created_at DESC);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contact_messages_owner_all" ON contact_messages;
CREATE POLICY "contact_messages_owner_all" ON contact_messages
  FOR ALL USING (auth.uid() = tutor_id) WITH CHECK (auth.uid() = tutor_id);
