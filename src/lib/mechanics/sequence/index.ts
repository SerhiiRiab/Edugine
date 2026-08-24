import type { MechanicDefinition } from '@/lib/mechanics/types'
import type { SequenceConfig, SequenceItem, SequenceIndividualState } from './types'
import { SequenceHostComponent } from './HostComponent'
import { SequencePlayerComponent } from './PlayerComponent'
import { SequenceContentEditorStub } from './ContentEditor'

function validateSequenceItem(data: unknown): data is SequenceItem {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return typeof d.text === 'string'
}

export const sequenceDefinition: MechanicDefinition<SequenceConfig, SequenceItem, SequenceIndividualState> = {
  id: 'sequence',
  name: 'Sequence',
  description: 'Students arrange shuffled words, sentences, or steps into the correct order.',
  skill_category: 'interactive-blocks',
  skill_categories: ['interactive-blocks'],

  HostComponent: SequenceHostComponent,
  PlayerComponent: SequencePlayerComponent,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ContentEditor: SequenceContentEditorStub as any,

  defaultConfig: {},
  validateItem: validateSequenceItem,
}
