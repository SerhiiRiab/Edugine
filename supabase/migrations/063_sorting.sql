-- Add sorting mechanic (categorize blocks into 2-3 tutor-defined categories, individual + shared)
INSERT INTO mechanics (id, name, description, supported_modes, skill_category, skill_categories)
VALUES (
  'sorting',
  'Sorting',
  'Students drag words, sentences, or ideas into the correct category.',
  ARRAY['individual', 'shared'],
  'vocabulary',
  ARRAY['vocabulary', 'grammar', 'reading']
)
ON CONFLICT (id) DO NOTHING;
