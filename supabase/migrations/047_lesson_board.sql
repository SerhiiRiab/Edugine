INSERT INTO mechanics (id, name, description, supported_modes, skill_category, skill_categories)
VALUES (
  'lesson_board',
  'Lesson Board',
  'A live shared whiteboard — the host draws, writes and explains while students watch in real time.',
  ARRAY['shared'],
  'content',
  ARRAY['content']
);
