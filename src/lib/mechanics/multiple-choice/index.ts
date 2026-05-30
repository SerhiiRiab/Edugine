import type { MechanicDefinition } from '@/lib/mechanics/types'
import type { MultipleChoiceConfig, MultipleChoiceItem, MultipleChoiceState } from './types'
import { MultipleChoiceHostComponent } from './HostComponent'
import { MultipleChoicePlayerComponent } from './PlayerComponent'
import { MultipleChoiceContentEditorStub } from './ContentEditor'

function validateMultipleChoiceItem(data: unknown): data is MultipleChoiceItem {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return (
    typeof d.question === 'string' &&
    Array.isArray(d.options) &&
    (d.options as unknown[]).length >= 2 &&
    typeof d.correctIndex === 'number'
  )
}

export const multipleChoiceDefinition: MechanicDefinition<MultipleChoiceConfig, MultipleChoiceItem, MultipleChoiceState> = {
  id: 'multiple_choice',
  name: 'Multiple Choice',
  description: 'Pick the correct answer from options.',
  skill_category: 'reading',
  skill_categories: ['reading', 'listening', 'vocabulary', 'grammar'],

  HostComponent: MultipleChoiceHostComponent,
  PlayerComponent: MultipleChoicePlayerComponent,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ContentEditor: MultipleChoiceContentEditorStub as any,

  defaultConfig: { shuffleItems: false },
  validateItem: validateMultipleChoiceItem,
}
