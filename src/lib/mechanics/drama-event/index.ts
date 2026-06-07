import type { MechanicDefinition, ContentEditorProps } from '@/lib/mechanics/types'
import type { DramaEventConfig, DramaEventItem, DramaEventState } from './types'
import type { ComponentType } from 'react'
import { DramaEventHostPanel } from './HostComponent'
import { DramaEventPlayerPanel } from './PlayerComponent'
import { DramaEventContentEditor } from './ContentEditor'

// SQL: INSERT INTO mechanics (id, name, description, supported_modes, skill_category, skill_categories)
// VALUES ('drama_event', 'Drama Event', 'Spin the wheel to trigger dramatic events. Students react, discuss and decide together.',
//         ARRAY['shared'], 'simulations', ARRAY['simulations']);

const VALID_EVENT_TYPES = ['twist', 'pressure', 'conflict', 'revelation', 'constraint', 'decision', 'crisis', 'opportunity']

function validateItem(data: unknown): data is DramaEventItem {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return typeof d.eventType === 'string' && VALID_EVENT_TYPES.includes(d.eventType) && typeof d.text === 'string'
}

const ContentEditorStub: ComponentType<ContentEditorProps<DramaEventItem>> = () => null

export const dramaEventDefinition: MechanicDefinition<
  DramaEventConfig,
  DramaEventItem,
  DramaEventState
> = {
  id: 'drama_event',
  name: 'Drama Event',
  description: 'Spin the wheel to trigger dramatic events. Students react, discuss and decide together.',
  skill_category: 'simulations',
  skill_categories: ['simulations'],

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HostComponent: (() => null) as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PlayerComponent: (() => null) as any,
  ContentEditor: ContentEditorStub,

  defaultConfig: {},
  validateItem,

  bulkImport: {
    enabled: true,
    fields: [
      { key: 'eventType', label: 'Event Type', required: true },
      { key: 'text', label: 'Event Text', required: true },
    ],
    placeholder: 'twist | The contract everyone signed turns out to be invalid.\ncrisis | The main decision maker has just left the room permanently.',
    description: 'Format: eventType | event card text  (one per line)',
    defaultSeparator: 'pipe',
    parseLine: (line) => {
      const pipeIndex = line.indexOf('|')
      if (pipeIndex < 0) return null
      const eventType = line.slice(0, pipeIndex).trim().toLowerCase()
      const text = line.slice(pipeIndex + 1).trim()
      if (!VALID_EVENT_TYPES.includes(eventType) || !text) return null
      return { eventType, text }
    },
  },
}

export { DramaEventHostPanel, DramaEventPlayerPanel, DramaEventContentEditor }
