-- Guards against a repeat of the 2026-07-05 incident: the lesson-board
-- canvas could write a multi-MB base64 image into shared_activity_state.state
-- on every save, which was heavy enough to degrade Supabase broadly (even
-- unrelated Auth calls in middleware started timing out, taking the whole
-- site down via MIDDLEWARE_INVOCATION_TIMEOUT).
--
-- The lesson-board component now downscales images client-side before they
-- ever reach a save, but that's a UI-layer courtesy check, not something the
-- database enforces — client-side JS can always be bypassed or fail. This
-- constraint is the backstop: no single activity's shared state can exceed
-- 5MB, regardless of which mechanic or client wrote it.
ALTER TABLE shared_activity_state
  ADD CONSTRAINT shared_activity_state_size_limit
  CHECK (octet_length(state::text) <= 5242880);
