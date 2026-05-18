// ── Swipe Battle — mechanic-specific types ───────────────────────────────────

export interface SwipeBattleConfig {
  timePerCard: number        // seconds; 0 = unlimited
  showTranslation: boolean   // reveal translation after swipe
  shuffleCards: boolean
}

// Shape stored in content_items.data for swipe_battle content sets
export interface SwipeBattleItem {
  word: string               // term shown on the card (EN)
  translation: string        // correct translation (UK)
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
