export interface CorrectTheMistakeConfig {
  // reserved
}

export interface CorrectTheMistakeItem {
  incorrect: string
  correct: string
}

export interface CorrectTheMistakeIndividualState {
  phase: 'waiting' | 'playing' | 'finished'
}

// Shared collaborative mode — all students fix sentences together live
export interface CorrectTheMistakeSharedState {
  // `${itemIndex}_${wordIndex}` → typed correction
  fixes: Record<string, string>
  revealed: boolean
  phase: 'playing' | 'finished'
}
