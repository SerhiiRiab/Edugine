// ── Swipe Battle — mechanic-specific types ───────────────────────────────────

export interface SwipeBattleConfig {
  timePerCard: number        // seconds; 0 = unlimited
  showTranslation: boolean   // reveal translation after swipe
  shuffleCards: boolean
}

// Shape stored in content_items.data for swipe_battle content sets
export interface SwipeBattleItem {
  word: string               // term shown on the card (EN) — or the full statement text for single-statement cards
  translation?: string       // correct translation (UK); omitted/blank marks this as a single-statement card
  explanation?: string       // single-statement cards only — shown after swipe to explain the true/false answer
  isCorrect: boolean         // whether swiping RIGHT is the correct action (correct pair, or true statement)
}

// A blank/missing translation marks an item as a single-statement (true/false)
// card rather than a term|translation pair — the one shared rule every
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
