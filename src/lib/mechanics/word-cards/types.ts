export interface WordCardsConfig {
  // reserved
}

// content_items.data — one item = one two-sided card
export interface WordCardsItem {
  front: string  // word / sentence / question
  back: string   // definition / translation / answer
}

// Per-card self-check result
export interface WordCardsResult {
  id: string
  known: boolean
}

export interface WordCardsState {
  phase: 'waiting' | 'playing' | 'finished'
}
