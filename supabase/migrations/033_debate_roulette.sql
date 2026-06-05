-- ============================================================
-- Edugine — Add debate_roulette mechanic
-- ============================================================

INSERT INTO mechanics (id, name, description, supported_modes, skill_category, skill_categories)
VALUES (
  'debate_roulette',
  'Debate Roulette',
  'Spin the wheel for a random topic — argue For or Against.',
  ARRAY['shared'],
  'speaking',
  ARRAY['speaking']
)
ON CONFLICT (id) DO UPDATE
  SET name             = EXCLUDED.name,
      description      = EXCLUDED.description,
      supported_modes  = EXCLUDED.supported_modes,
      skill_category   = EXCLUDED.skill_category,
      skill_categories = EXCLUDED.skill_categories;
