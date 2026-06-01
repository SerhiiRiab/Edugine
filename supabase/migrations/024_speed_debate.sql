INSERT INTO mechanics (id, name, description, supported_modes, skill_category, skill_categories)
VALUES (
  'speed_debate',
  'Speed Debate',
  'Debate statements in real-time with assigned positions (For / Against / Neutral)',
  ARRAY['shared'],
  'speaking',
  ARRAY['speaking']
)
ON CONFLICT (id) DO UPDATE
  SET name            = EXCLUDED.name,
      description     = EXCLUDED.description,
      supported_modes = EXCLUDED.supported_modes,
      skill_category  = EXCLUDED.skill_category,
      skill_categories = EXCLUDED.skill_categories;
