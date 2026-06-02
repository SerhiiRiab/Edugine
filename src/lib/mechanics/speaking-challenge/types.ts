export interface SpeakingChallengeItem {
  word: string
}

export interface SpeakingChallengeConfig {}

export interface SpeakingChallengeState {
  words: string[]              // full word pool from items
  shuffleQueue: number[]       // remaining shuffled indices; refilled when exhausted
  currentWord: string          // word currently on screen
  wordHistory: string[]        // last 4 words shown, most recent first
  turnOrder: string[]          // participant IDs
  currentSpeakerIndex: number  // index into turnOrder
  turnStartedAt: string | null // ISO — when current turn began; null during setup
  turnDuration: number         // seconds per turn; 0 = manual
  wordChangedAt: string | null // ISO — when current word appeared; null during setup
  wordInterval: number         // seconds between words; 0 = manual
  status: 'setup' | 'active' | 'finished'
}

function shuffleIndices(n: number, avoidLeading?: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  if (avoidLeading !== undefined && n > 1 && arr[0] === avoidLeading) {
    [arr[0], arr[1]] = [arr[1], arr[0]]
  }
  return arr
}

export function makeInitialShuffleQueue(n: number): number[] {
  return shuffleIndices(n)
}

export function pickNextWord(state: SpeakingChallengeState): { word: string; shuffleQueue: number[] } {
  if (state.words.length === 0) return { word: '', shuffleQueue: [] }
  let queue = [...state.shuffleQueue]
  if (queue.length === 0) {
    const curIdx = state.words.indexOf(state.currentWord)
    queue = shuffleIndices(state.words.length, curIdx >= 0 ? curIdx : undefined)
  }
  const idx = queue[0]
  return { word: state.words[idx], shuffleQueue: queue.slice(1) }
}

export function computeTurnTimeLeft(state: SpeakingChallengeState): number {
  if (state.turnDuration === 0 || !state.turnStartedAt) return state.turnDuration
  const elapsed = Math.floor((Date.now() - new Date(state.turnStartedAt).getTime()) / 1000)
  return Math.max(0, state.turnDuration - elapsed)
}

export function computeWordTimeLeft(state: SpeakingChallengeState): number {
  if (state.wordInterval === 0 || !state.wordChangedAt) return state.wordInterval
  const elapsed = Math.floor((Date.now() - new Date(state.wordChangedAt).getTime()) / 1000)
  return Math.max(0, state.wordInterval - elapsed)
}
