// Phase 1: text + video. images/imageLayout fields reserved for Phase 2.

export interface ContentBlockTFCard {
  statement: string
  isTrue: boolean
}

export interface ContentBlockItem {
  type: 'text' | 'video'
  text: string
  videoUrl: string
  images: unknown[]    // Phase 2
  imageLayout: null    // Phase 2
  discussionQuestions: string[]
  trueFalseCards: ContentBlockTFCard[]
}

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
