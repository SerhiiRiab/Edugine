-- ============================================================
-- Edugine — Add correct_the_mistake mechanic
-- ============================================================

INSERT INTO mechanics (id, name, description, supported_modes, skill_category, skill_categories)
VALUES (
  'correct_the_mistake',
  'Correct the Mistake',
  'Find and fix the grammatical mistake in each sentence.',
  ARRAY['individual', 'shared'],
  'grammar',
  ARRAY['grammar', 'writing']
)
ON CONFLICT (id) DO UPDATE
  SET name             = EXCLUDED.name,
      description      = EXCLUDED.description,
      supported_modes  = EXCLUDED.supported_modes,
      skill_category   = EXCLUDED.skill_category,
      skill_categories = EXCLUDED.skill_categories;
