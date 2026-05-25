-- Idempotent: register Talk Time mechanic
INSERT INTO mechanics (id, name, description, supported_modes, skill_category)
VALUES (
  'talk_time',
  'Talk Time',
  'Speak on a prompt against the clock, taking turns',
  ARRAY['shared'],
  'speaking'
)
ON CONFLICT (id) DO NOTHING;
