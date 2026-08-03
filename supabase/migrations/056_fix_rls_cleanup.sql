-- ============================================================
-- Edugine — RLS cleanup: drop every policy on lessons/content_sets/
-- lesson_activities/content_items by its ACTUAL live name, then recreate
-- one clean set. Run manually in Supabase SQL Editor.
-- ============================================================
-- 055_fix_rls_lesson_content.sql dropped policies by the names found in
-- this repo's migration history, but a `pg_policies` check against the
-- live project (run manually after 055) showed several policies with
-- different names than that history suggested — almost certainly created
-- by hand in the Supabase dashboard at some point and never captured in a
-- migration file. Those old, differently-named policies stayed active
-- alongside the new ones 055 created, which is why anon could still read
-- private lesson content after 055 ran: Postgres ORs every permissive
-- SELECT policy together, so one leftover broad policy is enough to leak
-- data no matter how correct the new policies are.
--
-- This migration drops every policy name actually observed on these four
-- tables (old, duplicate, and the ones 055 itself created) and recreates
-- exactly one clean policy per case:
--   1. owner ((select auth.uid()) = owner_id, or the owning lesson's /
--      content_set's for the child tables) — full access
--   2. visibility = 'public' — read for everyone, including anon
--   3. visibility = 'unlisted' — read for everyone with the direct link
--   4. private, none of the above — owner only
--   5. active/waiting session on the lesson — read for session participants
--      (was dropped above by name, recreated here so /play keeps working)

-- ── content_items ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "content_items_lesson_session_public_read" ON content_items;
DROP POLICY IF EXISTS "content_items_owner_all" ON content_items;
DROP POLICY IF EXISTS "content_items_public_lesson_read" ON content_items;
DROP POLICY IF EXISTS "content_items_session_public_read" ON content_items;
DROP POLICY IF EXISTS "content_items_unlisted_lesson_read" ON content_items;

-- ── content_sets ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "content_sets_lesson_session_public_read" ON content_sets;
DROP POLICY IF EXISTS "content_sets_owner_all" ON content_sets;
DROP POLICY IF EXISTS "content_sets_public_lesson_read" ON content_sets;
DROP POLICY IF EXISTS "content_sets_unlisted_lesson_read" ON content_sets;
DROP POLICY IF EXISTS "public can read content_sets for unlisted lessons" ON content_sets;

-- ── lesson_activities ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "lesson_activities_owner_all" ON lesson_activities;
DROP POLICY IF EXISTS "lesson_activities_public_read" ON lesson_activities;
DROP POLICY IF EXISTS "lesson_activities_session_public_read" ON lesson_activities;
DROP POLICY IF EXISTS "lesson_activities_unlisted_public_read" ON lesson_activities;
DROP POLICY IF EXISTS "public can read lesson_activities for public lessons" ON lesson_activities;

-- ── lessons ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "lessons_owner_all" ON lessons;
DROP POLICY IF EXISTS "lessons_public_read" ON lessons;
DROP POLICY IF EXISTS "lessons_session_public_read" ON lessons;
DROP POLICY IF EXISTS "lessons_unlisted_public_read" ON lessons;
DROP POLICY IF EXISTS "public can read lessons via program share" ON lessons;

-- ============================================================
-- Recreate — one clean policy per case, per table
-- ============================================================

-- ── lessons ──────────────────────────────────────────────────────────────

CREATE POLICY "lessons_owner_all" ON lessons
  FOR ALL USING ((select auth.uid()) = owner_id);

CREATE POLICY "lessons_public_read" ON lessons
  FOR SELECT USING (visibility = 'public');

CREATE POLICY "lessons_unlisted_public_read" ON lessons
  FOR SELECT USING (visibility = 'unlisted');

CREATE POLICY "lessons_session_public_read" ON lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.lesson_id = lessons.id
        AND sessions.status IN ('waiting', 'active')
    )
  );

-- ── lesson_activities ────────────────────────────────────────────────────

CREATE POLICY "lesson_activities_owner_all" ON lesson_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = lesson_activities.lesson_id
        AND lessons.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "lesson_activities_public_read" ON lesson_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = lesson_activities.lesson_id
        AND lessons.visibility = 'public'
    )
  );

CREATE POLICY "lesson_activities_unlisted_public_read" ON lesson_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = lesson_activities.lesson_id
        AND lessons.visibility = 'unlisted'
    )
  );

CREATE POLICY "lesson_activities_session_public_read" ON lesson_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.lesson_id = lesson_activities.lesson_id
        AND sessions.status IN ('waiting', 'active')
    )
  );

-- ── content_sets ─────────────────────────────────────────────────────────

CREATE POLICY "content_sets_owner_all" ON content_sets
  FOR ALL USING ((select auth.uid()) = owner_id);

CREATE POLICY "content_sets_public_lesson_read" ON content_sets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lesson_activities la
      JOIN lessons l ON l.id = la.lesson_id
      WHERE la.content_set_id = content_sets.id
        AND l.visibility = 'public'
    )
  );

CREATE POLICY "content_sets_unlisted_lesson_read" ON content_sets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lesson_activities la
      JOIN lessons l ON l.id = la.lesson_id
      WHERE la.content_set_id = content_sets.id
        AND l.visibility = 'unlisted'
    )
  );

CREATE POLICY "content_sets_lesson_session_public_read" ON content_sets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lesson_activities la
      JOIN sessions s ON s.lesson_id = la.lesson_id
      WHERE la.content_set_id = content_sets.id
        AND s.status IN ('waiting', 'active')
    )
  );

-- ── content_items ────────────────────────────────────────────────────────

CREATE POLICY "content_items_owner_all" ON content_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM content_sets cs
      WHERE cs.id = content_items.set_id
        AND cs.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "content_items_public_lesson_read" ON content_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lesson_activities la
      JOIN lessons l ON l.id = la.lesson_id
      WHERE la.content_set_id = content_items.set_id
        AND l.visibility = 'public'
    )
  );

CREATE POLICY "content_items_unlisted_lesson_read" ON content_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lesson_activities la
      JOIN lessons l ON l.id = la.lesson_id
      WHERE la.content_set_id = content_items.set_id
        AND l.visibility = 'unlisted'
    )
  );

CREATE POLICY "content_items_lesson_session_public_read" ON content_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lesson_activities la
      JOIN sessions s ON s.lesson_id = la.lesson_id
      WHERE la.content_set_id = content_items.set_id
        AND s.status IN ('waiting', 'active')
    )
  );
