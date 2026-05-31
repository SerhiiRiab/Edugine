export interface FillTheGapConfig {
  // reserved
}

export interface FillTheGapBlank {
  answer: string
  options?: string[]  // present → buttons; absent/empty → text input
}

export interface FillTheGapItem {
  sentence: string   // text with ___ for each blank
  blanks: FillTheGapBlank[]
}

// Individual mode — no shared realtime state
export interface FillTheGapState {
  phase: 'waiting' | 'playing' | 'finished'
}
