-- Tutors can star activity types in the Discover Activities catalog; starred
-- mechanics surface in the dashboard's My Favourites block.

CREATE TABLE IF NOT EXISTS tutor_favorite_mechanics (
  tutor_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mechanic_id TEXT NOT NULL REFERENCES mechanics(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tutor_id, mechanic_id)
);

ALTER TABLE tutor_favorite_mechanics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tutor_favorite_mechanics_owner_all" ON tutor_favorite_mechanics;
CREATE POLICY "tutor_favorite_mechanics_owner_all" ON tutor_favorite_mechanics
  FOR ALL USING (auth.uid() = tutor_id) WITH CHECK (auth.uid() = tutor_id);
