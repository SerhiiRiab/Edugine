export interface StoryBuilderItem {
  word: string
}

export interface StoryBuilderConfig {
  // reserved
}

export interface StorySentence {
  author_id: string
  author_name: string
  text: string
  ts: string
}

export interface StoryWordEntry {
  word: string
  used: boolean
}

export interface StoryBuilderState {
  prompt: string
  sentences: StorySentence[]
  wordBank: StoryWordEntry[]
  turnOrder: string[]        // participant IDs in play order
  currentTurnIndex: number
  status: 'active' | 'finished'
  teamScore: number          // collective score for all players
  usedWords: string[]        // lowercase word bank entries that have been used (for dedup)
}
