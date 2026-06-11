-- 041_taboo.sql
INSERT INTO mechanics (id, name, description, supported_modes, skill_category, skill_categories)
VALUES (
  'taboo',
  'Taboo',
  'Describe the word without using the forbidden words. Teammates guess correctly to score points.',
  ARRAY['shared'],
  'speaking',
  ARRAY['speaking', 'vocabulary']
);
