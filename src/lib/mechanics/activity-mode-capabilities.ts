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
// Mechanics whose timer duration can only be set ahead of time, via the
// activity's Settings panel (config.timerSeconds) — there is no way to
// change it once a session is live.
//
// speed_debate, debate_roulette, hidden_role, mission_briefing, drama_event,
// taboo and elevator_pitch are NOT here even though their init*State server
// action also reads config.timerSeconds as a fallback default: their Host
// component gives the tutor a duration picker they use live during the
// session (onSetTimerDuration/onSetDuration), which always wins. Asking for
// a duration again at creation time only for it to be immediately
// overridable in-session would be a redundant field, so it's intentionally
// left off the Settings panel for those mechanics — the tutor sets it, and
// starts/pauses it, entirely from the session host view.
export const TIMER_SUPPORTED = new Set(['talk_time'])
