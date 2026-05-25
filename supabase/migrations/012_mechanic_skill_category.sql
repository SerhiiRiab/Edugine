-- Idempotent: adds skill_category column and seeds known mechanics
ALTER TABLE mechanics ADD COLUMN IF NOT EXISTS skill_category TEXT;

UPDATE mechanics SET skill_category = 'vocabulary' WHERE id = 'swipe_battle';
UPDATE mechanics SET skill_category = 'vocabulary' WHERE id = 'speed_match';
UPDATE mechanics SET skill_category = 'writing'    WHERE id = 'story_builder';
