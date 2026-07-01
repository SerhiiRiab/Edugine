export interface CorrectTheMistakeConfig {
  // reserved
}

export interface CorrectTheMistakeItem {
  incorrect: string
  correct: string
}

// Individual mode — host-paced, one sentence at a time. Every student edits/checks
// their own answer for the current sentence; the host advances everyone together.
export interface CorrectTheMistakeIndividualState {
  currentIndex: number
  phase: 'playing' | 'done'
}

// Shared collaborative mode — all students fix sentences together live
export interface CorrectTheMistakeSharedState {
  // `${itemIndex}_${wordIndex}` → typed correction
  fixes: Record<string, string>
  revealed: boolean
  phase: 'playing' | 'finished'
}
