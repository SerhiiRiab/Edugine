-- Idempotent: adds 'content' skill category and content_block mechanic

-- content_block mechanic row
INSERT INTO mechanics (id, name, description, supported_modes, skill_category)
VALUES (
  'content_block',
  'Content Block',
  'Present text or video material to students',
  ARRAY['individual'],
  'content'
)
ON CONFLICT (id) DO NOTHING;
