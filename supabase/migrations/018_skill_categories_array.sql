-- Extend mechanics with a multi-category array.
-- skill_category (single) stays for legacy compat and is deprecated over time.

ALTER TABLE mechanics
  ADD COLUMN IF NOT EXISTS skill_categories TEXT[] NOT NULL DEFAULT '{}';

-- Backfill: copy existing single category into the array for every mechanic
-- that hasn't been updated yet.
UPDATE mechanics
  SET skill_categories = ARRAY[skill_category]
  WHERE skill_categories = '{}';

-- True/False is universal across reading, listening and vocabulary contexts.
UPDATE mechanics
  SET skill_categories = ARRAY['reading', 'listening', 'vocabulary']
  WHERE id = 'true_false';

-- Multiple Choice covers reading, listening, vocabulary and grammar.
UPDATE mechanics
  SET skill_categories = ARRAY['reading', 'listening', 'vocabulary', 'grammar']
  WHERE id = 'multiple_choice';
