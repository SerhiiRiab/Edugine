-- Swipe Battle now supports two card types in the same activity: the
-- existing term|definition pair (fixed Correct/Wrong judging), and a new
-- single-statement card judged via tutor-defined per-activity labels
-- (set on the activity, not stored on the mechanic itself).
UPDATE mechanics
SET name = 'Swipe Battle',
    description = 'Swipe right or left to judge vocabulary pairs or standalone statements — mix both in one activity.'
WHERE id = 'swipe_battle';
