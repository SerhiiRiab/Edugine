-- Add word_cards mechanic (two-sided flashcards with self-check, individual only)
INSERT INTO mechanics (id, name, description, supported_modes, skill_category, skill_categories)
VALUES (
  'word_cards',
  'Word Cards',
  'Students flip through two-sided flashcards and self-check what they knew.',
  ARRAY['individual'],
  'vocabulary',
  ARRAY['vocabulary']
)
ON CONFLICT (id) DO NOTHING;
