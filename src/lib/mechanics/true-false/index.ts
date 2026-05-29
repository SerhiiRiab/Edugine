import type { MechanicDefinition } from '@/lib/mechanics/types'
import type { TrueFalseConfig, TrueFalseItem, TrueFalseState } from './types'
import { TrueFalseHostComponent } from './HostComponent'
import { TrueFalsePlayerComponent } from './PlayerComponent'
import { TrueFalseContentEditorStub } from './ContentEditor'

function validateTrueFalseItem(data: unknown): data is TrueFalseItem {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return typeof d.statement === 'string' && typeof d.isTrue === 'boolean'
}

export const trueFalseDefinition: MechanicDefinition<TrueFalseConfig, TrueFalseItem, TrueFalseState> = {
  id: 'true_false',
  name: 'True or False',
  description: 'Decide if statements are true or false.',
  skill_category: 'reading',

  HostComponent: TrueFalseHostComponent,
  PlayerComponent: TrueFalsePlayerComponent,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ContentEditor: TrueFalseContentEditorStub as any,

  defaultConfig: { shuffleItems: false },
  validateItem: validateTrueFalseItem,

  bulkImport: {
    enabled: true,
    fields: [
      { key: 'statement', label: 'Statement', required: true },
    ],
    placeholder: 'The sun is a star | T\nWater is dry | F\nParis is in France | T',
    description: 'One per line: statement | T or statement | F',
    defaultSeparator: 'dash',
    parseLine: (line) => {
      const sepIdx = line.lastIndexOf('|')
      if (sepIdx === -1) return null
      const statement = line.slice(0, sepIdx).trim()
      const val = line.slice(sepIdx + 1).trim().toLowerCase()
      if (!statement) return null
      const isTrue = val === 't' || val === 'true' || val === '1'
      return { statement, isTrue }
    },
  },
}
