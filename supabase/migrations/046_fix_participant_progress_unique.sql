-- The live participant_progress unique constraint drifted from what every
-- migration since 005_lessons_layer.sql has declared: it's currently
-- UNIQUE(session_id, participant_id) instead of
-- UNIQUE(session_id, participant_id, activity_index). That means any upsert
-- using onConflict: 'session_id,participant_id,activity_index' (used by
-- true_false, multiple_choice, swipe_battle, speed_match, word_bank,
-- word_choice, correct_the_mistake, fill_the_gap, and the new participation
-- points award) fails with 42P10 "no unique or exclusion constraint matching
-- the ON CONFLICT specification" — silently, since callers don't check the
-- error. This restores the 3-column constraint the app code has always
-- assumed.
ALTER TABLE participant_progress
  DROP CONSTRAINT IF EXISTS participant_progress_session_id_participant_id_key;

ALTER TABLE participant_progress
  ADD CONSTRAINT participant_progress_session_id_participant_id_activity_index_key
  UNIQUE (session_id, participant_id, activity_index);
