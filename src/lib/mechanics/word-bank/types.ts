export interface WordBankConfig {
  // reserved
}

export interface WordBankBlank {
  answer: string
}

export interface WordBankItem {
  text: string          // passage with ___ for each blank
  blanks: WordBankBlank[]
  wordBank: string[]    // shuffled pool (answers + optional distractors)
}

// Individual mode — each player works locally
export interface WordBankIndividualState {
  phase: 'waiting' | 'playing' | 'finished'
}

// Shared collaborative mode — all students fill the same passage live
export interface WordBankSharedState {
  itemIndex: number
  fills: Record<number, string>  // blankIndex → word currently placed
  revealed: boolean              // host has revealed correct answers
  phase: 'playing' | 'finished'
}
