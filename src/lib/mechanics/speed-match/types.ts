// ── Speed Match — mechanic-specific types ─────────────────────────────────────

export interface SpeedMatchConfig {
  batchSize: number  // pairs shown per round, default 6
}

// Shape stored in content_items.data for speed_match content sets
export interface SpeedMatchItem {
  front: string  // term (e.g. English word)
  back: string   // match target (e.g. translation)
}

// Per-participant runtime progress (broadcast to host)
export interface SpeedMatchProgress {
  matched: number
  total: number
  score: number
  elapsed: number        // seconds
  wrongAttempts: number
  finished: boolean
}

// Shared realtime state (minimal — each player manages their own)
export interface SpeedMatchState {
  phase: 'waiting' | 'playing' | 'finished'
}
