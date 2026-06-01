-- fill_the_gap was inserted after migration 018 (which populated skill_categories),
-- so its skill_categories stayed as the default '{}'. Fix it here.
UPDATE mechanics
SET skill_categories = ARRAY['grammar', 'writing']
WHERE id = 'fill_the_gap' AND skill_categories = '{}';

-- Safety net: any future mechanic inserted with only skill_category and empty
-- skill_categories gets a one-element array from the legacy field.
UPDATE mechanics
SET skill_categories = ARRAY[skill_category]
WHERE skill_categories = '{}'
  AND skill_category IS NOT NULL;
