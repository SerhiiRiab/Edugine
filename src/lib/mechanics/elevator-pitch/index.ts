import type { MechanicDefinition } from '@/lib/mechanics/types'
import type { ElevatorPitchConfig, ElevatorPitchItem, ElevatorPitchState } from './types'
import { ElevatorPitchHostPanel } from './HostComponent'
import { ElevatorPitchPlayerPanel } from './PlayerComponent'
import { ElevatorPitchContentEditor } from './ContentEditor'

// SQL: INSERT INTO mechanics (id, name, description, supported_modes, skill_category, skill_categories)
// VALUES ('elevator_pitch', 'Elevator Pitch', 'Students take turns delivering a short pitch on a given topic. Timer keeps them on track.',
//         ARRAY['shared'], 'discussion-speaking', ARRAY['discussion-speaking']);

function validateItem(data: unknown): data is ElevatorPitchItem {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return typeof d.topic === 'string' && d.topic.trim().length > 0
}

export const elevatorPitchDefinition: MechanicDefinition<ElevatorPitchConfig, ElevatorPitchItem, ElevatorPitchState> = {
  id: 'elevator_pitch',
  name: 'Elevator Pitch',
  description: 'Students take turns delivering a short pitch on a given topic. Timer keeps them on track.',
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
      { key: 'topic',   label: 'Topic',   required: true  },
      { key: 'context', label: 'Context', required: false },
    ],
    placeholder: 'Pitch a smart water bottle that tracks hydration | Your audience: a panel of tech investors\nPitch yourself for a CEO position at a startup | You have 60 seconds to impress the board',
    description: 'Topic | Context (optional)',
    defaultSeparator: 'pipe',
    parseLine: (line) => {
      const pipeIndex = line.indexOf('|')
      if (pipeIndex < 0) {
        const topic = line.trim()
        if (!topic) return null
        return { topic }
      }
      const topic = line.slice(0, pipeIndex).trim()
      const context = line.slice(pipeIndex + 1).trim()
      if (!topic) return null
      return context ? { topic, context } : { topic }
    },
  },
}

export { ElevatorPitchHostPanel, ElevatorPitchPlayerPanel, ElevatorPitchContentEditor }
