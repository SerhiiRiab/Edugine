import type { MechanicDefinition } from '@/lib/mechanics/types'
import type { SortingConfig, SortingCategoryItem, SortingIndividualState } from './types'
import { SortingHostComponent } from './HostComponent'
import { SortingPlayerComponent } from './PlayerComponent'
import { SortingContentEditorStub } from './ContentEditor'

function validateSortingItem(data: unknown): data is SortingCategoryItem {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  if (typeof d.name !== 'string') return false
  if (!Array.isArray(d.blocks)) return false
  return (d.blocks as unknown[]).every(b => typeof b === 'string')
}

export const sortingDefinition: MechanicDefinition<SortingConfig, SortingCategoryItem, SortingIndividualState> = {
  id: 'sorting',
  name: 'Sorting',
  description: 'Students drag words, sentences, or ideas into the correct category.',
  skill_category: 'interactive-blocks',
  skill_categories: ['interactive-blocks'],

  HostComponent: SortingHostComponent,
  PlayerComponent: SortingPlayerComponent,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ContentEditor: SortingContentEditorStub as any,

  defaultConfig: {},
  validateItem: validateSortingItem,
}
