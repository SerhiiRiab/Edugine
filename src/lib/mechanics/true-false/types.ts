// ── True/False — mechanic-specific types ─────────────────────────────────────

export interface TrueFalseConfig {
  shuffleItems?: boolean
}

export interface TrueFalseItem {
  statement: string
  isTrue: boolean
}

// Individual mode — no shared realtime state needed; each player progresses locally
export interface TrueFalseState {
  phase: 'waiting' | 'playing' | 'finished'
}
