// ── Multiple Choice — mechanic-specific types ─────────────────────────────────

export interface MultipleChoiceConfig {
  shuffleItems?: boolean
}

export interface MultipleChoiceItem {
  question: string
  options: string[]    // 2–6 options
  correctIndex: number
}

// Individual mode — no shared realtime state needed
export interface MultipleChoiceState {
  phase: 'waiting' | 'playing' | 'finished'
}
