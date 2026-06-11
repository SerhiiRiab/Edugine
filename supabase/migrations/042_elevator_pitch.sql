INSERT INTO mechanics (id, name, description, supported_modes, skill_category, skill_categories)
VALUES (
  'elevator_pitch',
  'Elevator Pitch',
  'Students take turns delivering a short pitch on a given topic. Timer keeps them on track.',
  ARRAY['shared'],
  'speaking',
  ARRAY['speaking']
);
