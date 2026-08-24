import type { MechanicDefinition, ContentEditorProps } from '@/lib/mechanics/types'
import type { SpeedDebateConfig, SpeedDebateItem, SpeedDebateState } from './types'
import type { ComponentType } from 'react'

function validateSpeedDebateItem(data: unknown): data is SpeedDebateItem {
  if (typeof data !== 'object' || data === null) return false
  return typeof (data as Record<string, unknown>).statement === 'string'
}

const ContentEditorStub: ComponentType<ContentEditorProps<SpeedDebateItem>> = () => null
const HostStub: ComponentType = () => null
const PlayerStub: ComponentType = () => null

export const speedDebateDefinition: MechanicDefinition<SpeedDebateConfig, SpeedDebateItem, SpeedDebateState> = {
  id: 'speed_debate',
  name: 'Speed Debate',
  description: 'Debate statements in real-time with assigned positions.',
  skill_category: 'discussion-speaking',
  skill_categories: ['discussion-speaking'],

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HostComponent: HostStub as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PlayerComponent: PlayerStub as any,
  ContentEditor: ContentEditorStub,

  defaultConfig: {},
  validateItem: validateSpeedDebateItem,

  bulkImport: {
    enabled: true,
    fields: [{ key: 'statement', label: 'Statement', required: true }],
    placeholder: 'Social media is harmful for teens\nTechnology makes us less creative\nEnglish should be mandatory in all schools',
    description: 'Paste debate statements — one per line',
    defaultSeparator: 'comma',
    parseLine: (line) => {
      const statement = line.trim()
      return statement ? { statement } : null
    },
  },
}
