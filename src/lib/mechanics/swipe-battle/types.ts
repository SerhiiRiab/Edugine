// ── Swipe Battle — mechanic-specific types ───────────────────────────────────

export const DEFAULT_RIGHT_LABEL = 'Correct'
export const DEFAULT_LEFT_LABEL = 'Incorrect'

export interface SwipeBattleConfig {
  timePerCard: number        // seconds; 0 = unlimited
  shuffleCards: boolean
  rightLabel: string         // single-statement cards only — what swiping right means, e.g. "Correct", "I agree", "Real fact"
  leftLabel: string          // single-statement cards only — what swiping left means, e.g. "Incorrect", "I disagree", "Myth"
}

// Shape stored in content_items.data for swipe_battle content sets.
// Two card types coexist in the same activity, mixed freely:
//  - term|definition pair: translation is filled in — fixed "Correct/Wrong" judging.
//  - single statement: translation is blank/omitted — judged via the activity's
//    tutor-defined rightLabel/leftLabel, with an optional post-swipe explanation.
export interface SwipeBattleItem {
  word: string               // term shown on the card (EN) — or the full statement text for single-statement cards
  translation?: string       // correct translation (UK); omitted/blank marks this as a single-statement card
  explanation?: string       // single-statement cards only — shown after swipe to explain the correct answer
  isCorrect: boolean         // whether swiping RIGHT is the correct action
}

// A blank/missing translation marks an item as a single-statement (judgment)
// card rather than a term|definition pair — the one shared rule every
// swipe-battle view (editor, player, host) uses to tell the two apart.
export function isStatementCard(item: Pick<SwipeBattleItem, 'translation'>): boolean {
  return !item.translation || !item.translation.trim()
}

// Realtime state broadcast via Supabase Presence / Broadcast
export interface SwipeBattleState {
  phase: 'waiting' | 'playing' | 'finished'
  currentCardIndex: number
  scores: Record<string, number>          // participantId → score
  answers: Record<string, SwipeAnswer[]>  // participantId → answers
}

export interface SwipeAnswer {
  itemId: string
  swipedRight: boolean
  correct: boolean
  answeredAt: string  // ISO timestamp
}
