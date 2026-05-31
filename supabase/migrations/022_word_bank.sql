-- Add word_bank mechanic (grammar + reading + writing, individual + shared)
INSERT INTO mechanics (id, name, description, supported_modes, skill_category)
VALUES (
  'word_bank',
  'Word Bank',
  'Fill in the blanks using words from a shared word bank',
  ARRAY['individual', 'shared'],
  'grammar'
)
ON CONFLICT (id) DO NOTHING;
