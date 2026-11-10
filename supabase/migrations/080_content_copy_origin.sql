-- ============================================================
-- Edugine — Remember when a lesson / activity is a copy
-- ============================================================
-- duplicateLesson() creates a new lesson "<title> (copy)" plus a fresh copy
-- of every activity (content_set); duplicateContentSet() does the same for a
-- single activity. Nothing recorded that origin, so in the admin a tutor who
-- only copied a public lesson looked exactly like one who built 8 activities
-- by hand (inflated Lessons/Activities counts and funnel step 2).
--
-- is_copy is the durable fact; copied_from_* points at the source while it
-- still exists (SET NULL on delete keeps is_copy intact). copy_inferred
-- marks rows backfilled heuristically below rather than recorded at copy
-- time.

ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS is_copy               BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS copied_from_lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS copy_inferred         BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE content_sets
  ADD COLUMN IF NOT EXISTS is_copy            BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS copied_from_set_id UUID REFERENCES content_sets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS copy_inferred      BOOLEAN NOT NULL DEFAULT false;

-- ── Backfill (checked against prod 2026-11-10: 40 "(copy)" lessons, a
--    source lesson found for all 40; 105 of their activities are the
--    copier's own fresh copies created within the same minute, the other
--    179 still point at the original owner's sets — the pre-fresh-copy
--    behaviour — and are left alone since they aren't the copier's content).

-- Lessons: only duplicateLesson() appends " (copy)". Source = earliest
-- older lesson with the base title.
UPDATE lessons c
SET is_copy = true,
    copy_inferred = true,
    copied_from_lesson_id = (
      SELECT s.id FROM lessons s
      WHERE s.title = left(c.title, length(c.title) - length(' (copy)'))
        AND s.created_at < c.created_at
        AND s.id <> c.id
      ORDER BY s.created_at
      LIMIT 1
    )
WHERE c.title LIKE '% (copy)'
  AND c.is_copy = false;

-- Activities of those lessons that the copier owns and that were created
-- alongside the lesson (duplicateLesson makes them in the same request).
-- Source set = the source lesson's activity at the same position.
UPDATE content_sets cs
SET is_copy = true,
    copy_inferred = true,
    copied_from_set_id = (
      SELECT la_s.content_set_id
      FROM lesson_activities la_s
      WHERE la_s.lesson_id = l.copied_from_lesson_id
        AND la_s.position = la.position
      LIMIT 1
    )
FROM lesson_activities la
JOIN lessons l ON l.id = la.lesson_id
WHERE la.content_set_id = cs.id
  AND l.is_copy = true
  AND cs.owner_id = l.owner_id
  AND cs.is_copy = false
  AND abs(extract(epoch FROM (cs.created_at - l.created_at))) < 120;

-- Standalone activity copies (duplicateContentSet appends " (copy)").
UPDATE content_sets
SET is_copy = true, copy_inferred = true
WHERE title LIKE '% (copy)' AND is_copy = false;
