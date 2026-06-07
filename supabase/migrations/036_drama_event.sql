INSERT INTO mechanics (id, name, description, supported_modes, skill_category, skill_categories)
VALUES (
  'drama_event',
  'Drama Event',
  'Spin the wheel to trigger dramatic events. Students react, discuss and decide together.',
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
