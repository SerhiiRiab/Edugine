-- ============================================================
-- Edugine — Unlisted lesson content RLS (closes gap from 027)
-- Run manually in Supabase SQL Editor.
-- ============================================================
-- 027_lesson_visibility.sql gave lessons/lesson_activities read access for
-- visibility='unlisted', but 028_lesson_public.sql and 031_public_lesson_rls.sql
-- only ever added the equivalent content_sets/content_items policies for
-- visibility='public'. Result: unlisted lessons' activity titles and content
-- items are silently invisible under RLS (nested content_sets(...)/
-- content_items(...) selects return null/empty) — affects both the
-- /lessons/[slug] preview page and the already-shipped
-- /lessons/share/[share_token] route.

DROP POLICY IF EXISTS "content_sets_unlisted_lesson_read" ON content_sets;
CREATE POLICY "content_sets_unlisted_lesson_read" ON content_sets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lesson_activities la
      JOIN lessons l ON l.id = la.lesson_id
      WHERE la.content_set_id = content_sets.id
        AND l.visibility = 'unlisted'
    )
  );

DROP POLICY IF EXISTS "content_items_unlisted_lesson_read" ON content_items;
CREATE POLICY "content_items_unlisted_lesson_read" ON content_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lesson_activities la
      JOIN lessons l ON l.id = la.lesson_id
      WHERE la.content_set_id = content_items.set_id
        AND l.visibility = 'unlisted'
    )
  );
