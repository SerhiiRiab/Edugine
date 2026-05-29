-- Idempotent: adds true_false and multiple_choice mechanics (individual mode, reading category)

INSERT INTO mechanics (id, name, description, supported_modes, skill_category)
VALUES
  (
    'true_false',
    'True or False',
    'Decide if statements are true or false',
    ARRAY['individual'],
    'reading'
  ),
  (
    'multiple_choice',
    'Multiple Choice',
    'Pick the correct answer from options',
    ARRAY['individual'],
    'reading'
  )
ON CONFLICT (id) DO NOTHING;
