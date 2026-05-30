-- Add a lifetime session counter to profiles (used for future billing limits).
-- Sessions are deleted after completion, so we track count here instead.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS sessions_completed INTEGER NOT NULL DEFAULT 0;

-- Atomic increment — avoids read-modify-write race if two sessions ever end simultaneously.
CREATE OR REPLACE FUNCTION increment_sessions_completed(uid uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE profiles SET sessions_completed = sessions_completed + 1 WHERE id = uid;
$$;
