INSERT INTO mechanics (id, name, description, supported_modes, skill_category, skill_categories)
VALUES (
  'jigsaw_reading',
  'Jigsaw Reading',
  'Each student reads a different passage privately, then shares with the group. Together they answer discussion questions.',
  ARRAY['shared'],
  'reading',
  ARRAY['reading', 'speaking']
);
