-- Swipe Battle is no longer vocabulary-pair-only: cards are now generic
-- statements the tutor swipes right/left on, with tutor-defined meaning for
-- each direction (set per-activity, not stored on the mechanic itself).
UPDATE mechanics
SET name = 'Swipe Battle',
    description = 'Students swipe right or left to judge each card — the tutor decides what each direction means.'
WHERE id = 'swipe_battle';
