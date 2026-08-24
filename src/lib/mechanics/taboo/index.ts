import type { MechanicDefinition } from '@/lib/mechanics/types'
import type { TabooConfig, TabooItem, TabooState } from './types'
import { TabooHostPanel } from './HostComponent'
import { TabooPlayerPanel } from './PlayerComponent'
import { TabooContentEditor } from './ContentEditor'

// SQL: INSERT INTO mechanics (id, name, description, supported_modes, skill_category, skill_categories)
// VALUES ('taboo', 'Taboo', 'Describe the word without using the forbidden words. Teammates guess correctly to score points.',
//         ARRAY['shared'], 'discussion-speaking', ARRAY['discussion-speaking']);

function validateItem(data: unknown): data is TabooItem {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return typeof d.word === 'string' && Array.isArray(d.forbiddenWords)
}

export const tabooDefinition: MechanicDefinition<TabooConfig, TabooItem, TabooState> = {
  id: 'taboo',
  name: 'Taboo',
  description: 'Describe the word without using the forbidden words. Teammates guess correctly to score points.',
  skill_category: 'discussion-speaking',
  skill_categories: ['discussion-speaking'],

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HostComponent: (() => null) as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PlayerComponent: (() => null) as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ContentEditor: (() => null) as any,

  defaultConfig: {},
  validateItem,

  bulkImport: {
    enabled: true,
    fields: [
      { key: 'word',           label: 'Word',            required: true  },
      { key: 'forbiddenWords', label: 'Forbidden Words', required: true  },
    ],
    placeholder: 'Negotiation | deal, agreement, talk, discuss, terms\nLeadership | manager, boss, team, control, power',
    description: 'Word | forbidden word 1, forbidden word 2, … (comma-separated)',
    defaultSeparator: 'pipe',
    parseLine: (line) => {
      const pipeIndex = line.indexOf('|')
      if (pipeIndex < 0) return null
      const word = line.slice(0, pipeIndex).trim()
      const forbiddenRaw = line.slice(pipeIndex + 1).trim()
      if (!word || !forbiddenRaw) return null
      const forbiddenWords = forbiddenRaw.split(',').map(s => s.trim()).filter(Boolean)
      if (forbiddenWords.length === 0) return null
      return { word, forbiddenWords }
    },
  },
}

export { TabooHostPanel, TabooPlayerPanel, TabooContentEditor }
