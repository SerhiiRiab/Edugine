export interface WordChoiceConfig {
  // reserved
}

export interface WordChoiceBlank {
  options: string[]      // 2-4 choices shown in the dropdown
  correctIndex: number   // index of the correct option
}

export interface WordChoiceItem {
  sentence: string       // text with ___ for each blank
  blanks: WordChoiceBlank[]
}

// Individual mode — each player works independently
export interface WordChoiceIndividualState {
  phase: 'waiting' | 'playing' | 'finished'
}

// Shared collaborative mode — all students fill the same sentence live
export interface WordChoiceSharedState {
  fills: Record<number, number>  // global blank index → selected option index
  revealed: boolean
  phase: 'playing' | 'finished'
}
