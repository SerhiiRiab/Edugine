export interface SequenceConfig {
  // reserved
}

// content_items.data — one item = one block/step. content_items.position (the
// existing, already drag-reorderable column) IS the correct order — no extra
// ordering field is stored in `data`.
export interface SequenceItem {
  text: string
}

export interface SequenceIndividualState {
  phase: 'waiting' | 'playing' | 'finished'
}

// Shared collaborative mode — the class arranges one board together
export interface SequenceSharedState {
  order: string[]  // current arrangement, as content_item ids (host authoritative)
  phase: 'playing' | 'finished'
}
