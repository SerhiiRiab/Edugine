// Phase 1: text + video. images/imageLayout fields reserved for Phase 2.
export interface ContentBlockItem {
  type: 'text' | 'video'
  text: string
  videoUrl: string
  images: unknown[]    // Phase 2
  imageLayout: null    // Phase 2
}

export interface ContentBlockConfig {
  // reserved
}

export interface ContentBlockState {
  status: 'active' | 'finished'
  viewedByParticipantIds: string[]
  content: ContentBlockItem
}
