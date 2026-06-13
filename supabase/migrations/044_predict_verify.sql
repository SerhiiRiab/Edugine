INSERT INTO mechanics (id, name, description, supported_modes, skill_category, skill_categories)
VALUES (
  'predict_verify',
  'Predict & Verify',
  'Students predict what an article is about from the headline, read the full text, then discuss whose prediction was closest.',
  ARRAY['shared'],
  'reading',
  ARRAY['reading', 'speaking']
);
