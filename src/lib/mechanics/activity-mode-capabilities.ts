// Which lesson_activities.mode values a given mechanic supports — shared
// between the lesson editor (add-activity flow, activity row badges) and
// the per-activity Settings panel in the content editor.

// Mechanics that only support individual mode
export const INDIVIDUAL_ONLY = new Set(['swipe_battle', 'speed_match', 'fill_the_gap', 'word_cards'])
// Mechanics that only support shared mode
export const SHARED_ONLY = new Set([
  'story_builder', 'talk_time', 'speed_debate', 'roleplay_quest', 'speaking_challenge', 'debate_roulette', 'hidden_role',
  'mission_briefing', 'drama_event', 'taboo', 'elevator_pitch', 'jigsaw_reading', 'predict_verify', 'lesson_board',
])
// Mechanics that support individual OR vote mode
export const VOTE_CAPABLE = new Set(['true_false', 'multiple_choice'])
// Mechanics whose init*State server action actually reads config.timerSeconds.
// Showing the "Time limit" field for any other mechanic would silently do
// nothing — either the mechanic has no timer concept at all, or it manages
// its own timer duration inside its dedicated content editor instead.
export const TIMER_SUPPORTED = new Set([
  'talk_time', 'speed_debate', 'debate_roulette', 'hidden_role',
  'mission_briefing', 'drama_event', 'taboo', 'elevator_pitch',
])
