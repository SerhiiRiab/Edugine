-- ============================================================
-- Edugine — Re-taxonomy of skill categories
-- ============================================================
-- Replaces the old 7-category scheme (vocabulary, grammar, speaking,
-- listening, reading, writing, content) plus the separate simulations tag
-- with 6 mutually-exclusive categories: simulations, discussion-speaking,
-- knowledge-check, interactive-blocks, text-reading, workspace.
-- See src/lib/mechanics/skill-categories.ts (SKILL_CATEGORIES,
-- MECHANIC_TO_CATEGORIES) for the authoritative mapping this mirrors.
--
-- Every mechanic now belongs to exactly one category, so skill_categories
-- becomes a single-element array everywhere.

UPDATE mechanics SET skill_category = 'simulations', skill_categories = ARRAY['simulations'] WHERE id = 'mission_briefing';
UPDATE mechanics SET skill_category = 'simulations', skill_categories = ARRAY['simulations'] WHERE id = 'hidden_role';
UPDATE mechanics SET skill_category = 'simulations', skill_categories = ARRAY['simulations'] WHERE id = 'roleplay_quest';
UPDATE mechanics SET skill_category = 'simulations', skill_categories = ARRAY['simulations'] WHERE id = 'drama_event';
UPDATE mechanics SET skill_category = 'simulations', skill_categories = ARRAY['simulations'] WHERE id = 'story_builder';

UPDATE mechanics SET skill_category = 'discussion-speaking', skill_categories = ARRAY['discussion-speaking'] WHERE id = 'talk_time';
UPDATE mechanics SET skill_category = 'discussion-speaking', skill_categories = ARRAY['discussion-speaking'] WHERE id = 'speaking_challenge';
UPDATE mechanics SET skill_category = 'discussion-speaking', skill_categories = ARRAY['discussion-speaking'] WHERE id = 'debate_roulette';
UPDATE mechanics SET skill_category = 'discussion-speaking', skill_categories = ARRAY['discussion-speaking'] WHERE id = 'speed_debate';
UPDATE mechanics SET skill_category = 'discussion-speaking', skill_categories = ARRAY['discussion-speaking'] WHERE id = 'elevator_pitch';
UPDATE mechanics SET skill_category = 'discussion-speaking', skill_categories = ARRAY['discussion-speaking'] WHERE id = 'taboo';

UPDATE mechanics SET skill_category = 'knowledge-check', skill_categories = ARRAY['knowledge-check'] WHERE id = 'swipe_battle';
UPDATE mechanics SET skill_category = 'knowledge-check', skill_categories = ARRAY['knowledge-check'] WHERE id = 'true_false';
UPDATE mechanics SET skill_category = 'knowledge-check', skill_categories = ARRAY['knowledge-check'] WHERE id = 'multiple_choice';
UPDATE mechanics SET skill_category = 'knowledge-check', skill_categories = ARRAY['knowledge-check'] WHERE id = 'word_choice';
UPDATE mechanics SET skill_category = 'knowledge-check', skill_categories = ARRAY['knowledge-check'] WHERE id = 'fill_the_gap';
UPDATE mechanics SET skill_category = 'knowledge-check', skill_categories = ARRAY['knowledge-check'] WHERE id = 'correct_the_mistake';
UPDATE mechanics SET skill_category = 'knowledge-check', skill_categories = ARRAY['knowledge-check'] WHERE id = 'speed_match';
UPDATE mechanics SET skill_category = 'knowledge-check', skill_categories = ARRAY['knowledge-check'] WHERE id = 'word_cards';

UPDATE mechanics SET skill_category = 'interactive-blocks', skill_categories = ARRAY['interactive-blocks'] WHERE id = 'sorting';
UPDATE mechanics SET skill_category = 'interactive-blocks', skill_categories = ARRAY['interactive-blocks'] WHERE id = 'sequence';
UPDATE mechanics SET skill_category = 'interactive-blocks', skill_categories = ARRAY['interactive-blocks'] WHERE id = 'word_bank';

UPDATE mechanics SET skill_category = 'text-reading', skill_categories = ARRAY['text-reading'] WHERE id = 'jigsaw_reading';
UPDATE mechanics SET skill_category = 'text-reading', skill_categories = ARRAY['text-reading'] WHERE id = 'content_block';
UPDATE mechanics SET skill_category = 'text-reading', skill_categories = ARRAY['text-reading'] WHERE id = 'predict_verify';

UPDATE mechanics SET skill_category = 'workspace', skill_categories = ARRAY['workspace'] WHERE id = 'lesson_board';
