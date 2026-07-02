// ── Swipe Battle — mechanic-specific types ───────────────────────────────────

export const DEFAULT_RIGHT_LABEL = 'Correct'
export const DEFAULT_LEFT_LABEL = 'Incorrect'

export interface SwipeBattleConfig {
  timePerCard: number        // seconds; 0 = unlimited
  shuffleCards: boolean
  rightLabel: string         // what swiping right means, e.g. "Correct", "I agree", "Real fact"
  leftLabel: string          // what swiping left means, e.g. "Incorrect", "I disagree", "Myth"
}

// Shape stored in content_items.data for swipe_battle content sets
export interface SwipeBattleItem {
  word: string               // the card's statement/item text — tutor defines what judging it means via activity config
  explanation?: string       // optional — shown after swipe to explain the correct answer
  isCorrect: boolean         // whether swiping RIGHT is the correct action
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
