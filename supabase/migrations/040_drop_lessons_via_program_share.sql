-- ============================================================
-- Edugine — Drop expensive lessons-via-program-share RLS policy
-- The policy added a per-row JOIN (lessons → program_lessons →
-- programs) that evaluated on every query touching lessons,
-- lesson_activities, content_sets and content_items — causing
-- site-wide slowdown.
--
-- Private lessons will simply not appear on the public program
-- share page (correct security behaviour anyway).
-- Run manually in Supabase SQL Editor.
-- ============================================================

DROP POLICY IF EXISTS "public can read lessons via program share" ON lessons;
