-- ============================================================
-- Edugine — Add hidden_role mechanic + rename speaking_games → simulations
-- ============================================================

-- Rename any existing speaking_games references across all mechanics
UPDATE mechanics
SET skill_category   = 'simulations'
WHERE skill_category = 'speaking_games';

UPDATE mechanics
SET skill_categories = array_replace(skill_categories, 'speaking_games', 'simulations')
WHERE 'speaking_games' = ANY(skill_categories);

-- Insert (or upsert) the hidden_role mechanic
INSERT INTO mechanics (id, name, description, supported_modes, skill_category, skill_categories)
VALUES (
  'hidden_role',
  'Hidden Role',
  'Each player gets a secret role. Discuss, deduce, and vote to find the spy.',
  ARRAY['shared'],
  'simulations',
  ARRAY['simulations']
)
ON CONFLICT (id) DO UPDATE
  SET name             = EXCLUDED.name,
      description      = EXCLUDED.description,
      supported_modes  = EXCLUDED.supported_modes,
      skill_category   = EXCLUDED.skill_category,
      skill_categories = EXCLUDED.skill_categories;
