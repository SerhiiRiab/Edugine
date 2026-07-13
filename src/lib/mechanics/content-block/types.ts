// Phase 1: text + video. images/imageLayout fields reserved for Phase 2.
// grammar_table / vocab_cards: structured "art object" content types used by
// the AI Lesson Generator (/admin/lesson-generator) — rendered as styled
// components here rather than raw HTML, so they stay consistent (and safe)
// with the rest of the mechanic's rendering.

export interface ContentBlockTFCard {
  statement: string
  isTrue: boolean
}

export interface GrammarTableRow {
  form: string
  example: string
  note: string
}

export interface GrammarTableContent {
  whenToUse: string
  rows: GrammarTableRow[]
}

export interface VocabCard {
  word: string
  pos: string
  definition: string
  example: string
}

export interface VocabCardsContent {
  whenToUse: string
  cards: VocabCard[]
}

export interface ContentBlockItem {
  type: 'text' | 'video' | 'grammar_table' | 'vocab_cards'
  text: string
  videoUrl: string
  images: unknown[]    // Phase 2
  imageLayout: null    // Phase 2
  discussionQuestions: string[]
  trueFalseCards: ContentBlockTFCard[]
  grammarTable: GrammarTableContent
  vocabCards: VocabCardsContent
}

export const EMPTY_GRAMMAR_TABLE: GrammarTableContent = { whenToUse: '', rows: [] }
export const EMPTY_VOCAB_CARDS: VocabCardsContent = { whenToUse: '', cards: [] }

export interface ContentBlockConfig {
  // reserved
}

export interface ContentBlockState {
  status: 'active' | 'finished'
  viewedByParticipantIds: string[]
  content: ContentBlockItem
  // Discussion phase
  discussionIndex: number | null  // null = not started, N = showing question at index N
  // T/F comprehension phase
  tfIndex: number | null          // null = not started, N = showing card at index N
  tfRevealed: boolean             // whether current card's answer is revealed
  tfVotes: Record<string, boolean> // participantId → vote for current card only
}
