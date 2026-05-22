-- Multi-participant support
-- Adds is_host flag to session_participants and a DELETE policy for leaving the waiting room.

ALTER TABLE session_participants
  ADD COLUMN IF NOT EXISTS is_host BOOLEAN NOT NULL DEFAULT false;

-- Allow anyone to delete a participant row (needed for leaving the waiting room).
-- Access control is handled at the application level via session code.
CREATE POLICY "participants_delete_anyone" ON session_participants
  FOR DELETE USING (true);
