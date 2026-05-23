import type { MechanicDefinition } from '@/lib/mechanics/types'
import type { SpeedMatchConfig, SpeedMatchItem, SpeedMatchState } from './types'
import { SpeedMatchHostComponent } from './HostComponent'
import { SpeedMatchPlayerComponent } from './PlayerComponent'
import { SpeedMatchContentEditor } from './ContentEditor'

function validateSpeedMatchItem(data: unknown): data is SpeedMatchItem {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return typeof d.front === 'string' && typeof d.back === 'string'
}

export const speedMatchDefinition: MechanicDefinition<
  SpeedMatchConfig,
  SpeedMatchItem,
  SpeedMatchState
> = {
  id: 'speed_match',
  name: 'Speed Match',
  description: 'Match pairs against the clock.',

  HostComponent: SpeedMatchHostComponent,
  PlayerComponent: SpeedMatchPlayerComponent,
  ContentEditor: SpeedMatchContentEditor,

  defaultConfig: { batchSize: 6 },
  validateItem: validateSpeedMatchItem,

  bulkImport: {
    enabled: true,
    fields: [
      { key: 'front', label: 'Front', required: true },
      { key: 'back',  label: 'Back',  required: true },
    ],
    placeholder: 'apple, яблуко\ndog, пес\ncat, кіт',
    description: 'Paste pairs — one per line (front, back)',
    defaultSeparator: 'comma',
    parseLine: (line, sep) => {
      const idx = line.indexOf(sep)
      if (idx === -1) return null
      const front = line.slice(0, idx).trim()
      const back  = line.slice(idx + 1).trim()
      if (!front && !back) return null
      return { front, back }
    },
  },
}
