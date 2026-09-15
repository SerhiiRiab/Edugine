-- Fix: 072 enabled RLS on session_history but only added a SELECT policy.
-- startSession/endSession/purgeAbandonedSessions (lib/actions/sessions.ts)
-- write through the user-scoped client (anon key, RLS enforced as the
-- signed-in tutor), not the service-role admin client — so every INSERT/
-- UPDATE from the app was being silently denied by RLS, and no rows were
-- ever actually written. The cleanup cron's own UPDATE is unaffected since
-- it runs SECURITY DEFINER (bypasses RLS), but there was nothing for it to
-- close, since nothing got inserted in the first place.

CREATE POLICY "session_history_insert_own" ON session_history
  FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "session_history_update_own" ON session_history
  FOR UPDATE USING (auth.uid() = host_id);
