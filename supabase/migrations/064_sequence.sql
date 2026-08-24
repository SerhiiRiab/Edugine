-- Add sequence mechanic (arrange blocks into the correct order, individual + shared)
INSERT INTO mechanics (id, name, description, supported_modes, skill_category, skill_categories)
VALUES (
  'sequence',
  'Sequence',
  'Students arrange shuffled words, sentences, or steps into the correct order.',
  ARRAY['individual', 'shared'],
  'grammar',
  ARRAY['grammar', 'writing', 'reading']
)
ON CONFLICT (id) DO NOTHING;
