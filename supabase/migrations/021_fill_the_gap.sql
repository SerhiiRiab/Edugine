-- Add fill_the_gap mechanic (grammar + writing, individual mode)
INSERT INTO mechanics (id, name, description, supported_modes, skill_category)
VALUES (
  'fill_the_gap',
  'Fill the Gap',
  'Complete sentences by filling in the missing words',
  ARRAY['individual'],
  'grammar'
)
ON CONFLICT (id) DO NOTHING;
