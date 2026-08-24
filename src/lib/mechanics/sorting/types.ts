export interface SortingConfig {
  // reserved
}

// content_items.data — one item = one category with its block texts
export interface SortingCategoryItem {
  name: string
  blocks: string[]
}

// Runtime block, flattened across all category-items and shuffled for play
export interface SortingBlock {
  id: string          // `${itemId}-${blockIdx}`
  text: string
  categoryId: string  // correct category's content_item id
}

export interface SortingIndividualState {
  phase: 'waiting' | 'playing' | 'finished'
}

// Shared collaborative mode — all students sort the same board live
export interface SortingSharedState {
  placements: Record<string, string>  // blockId -> categoryId (unset = unplaced)
  phase: 'playing' | 'finished'
}
