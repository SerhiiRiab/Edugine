import type { MechanicDefinition, ContentEditorProps } from '@/lib/mechanics/types'
import type { DebateRouletteConfig, DebateRouletteItem, DebateRouletteState } from './types'
import type { ComponentType } from 'react'
import { DebateRouletteHostPanel } from './HostComponent'
import { DebateRoulettePlayerPanel } from './PlayerComponent'
import { DebateRouletteContentEditor } from './ContentEditor'

// SQL: INSERT INTO mechanics (id, name, description, supported_modes, skill_category, skill_categories)
// VALUES ('debate_roulette', 'Debate Roulette', 'Spin the wheel for a random topic — argue For or Against.',
//         ARRAY['shared'], 'speaking', ARRAY['speaking']);

function validateItem(data: unknown): data is DebateRouletteItem {
  if (typeof data !== 'object' || data === null) return false
  return typeof (data as Record<string, unknown>).topic === 'string'
}

const ContentEditorStub: ComponentType<ContentEditorProps<DebateRouletteItem>> = () => null

export const debateRouletteDefinition: MechanicDefinition<
  DebateRouletteConfig,
  DebateRouletteItem,
  DebateRouletteState
> = {
  id: 'debate_roulette',
  name: 'Debate Roulette',
  description: 'Spin the wheel for a random topic — argue For or Against.',
  skill_category: 'speaking',
  skill_categories: ['speaking'],

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HostComponent: (() => null) as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PlayerComponent: (() => null) as any,
  ContentEditor: ContentEditorStub,

  defaultConfig: {},
  validateItem,

  bulkImport: {
    enabled: true,
    fields: [{ key: 'topic', label: 'Topic', required: true }],
    placeholder: 'Social media is harmful for teens\nTechnology makes us less creative\nEnglish should be mandatory in all schools',
    description: 'Paste debate topics — one per line',
    defaultSeparator: 'comma',
    parseLine: (line) => {
      const topic = line.trim()
      return topic ? { topic } : null
    },
  },
}

// Named exports used by session-host-view and player-view
export { DebateRouletteHostPanel, DebateRoulettePlayerPanel, DebateRouletteContentEditor }
