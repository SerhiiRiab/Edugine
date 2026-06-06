import type { MechanicDefinition } from '@/lib/mechanics/types'
import type { MissionBriefingConfig, MissionBriefingItem, MissionBriefingState } from './types'
import { MissionBriefingHostComponent } from './HostComponent'
import { MissionBriefingPlayerComponent } from './PlayerComponent'
import { MissionBriefingContentEditorStub } from './ContentEditor'

// SQL: INSERT INTO mechanics (id, name, description, supported_modes, skill_category, skill_categories)
// VALUES ('mission_briefing', 'Mission Briefing', 'Each player holds private intel. Coordinate verbally to complete the mission.',
//         ARRAY['shared'], 'simulations', ARRAY['simulations']);

function validateItem(data: unknown): data is MissionBriefingItem {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return (
    typeof d.playerLabel === 'string' &&
    typeof d.briefing === 'string'
  )
}

export const missionBriefingDefinition: MechanicDefinition<
  MissionBriefingConfig,
  MissionBriefingItem,
  MissionBriefingState
> = {
  id: 'mission_briefing',
  name: 'Mission Briefing',
  description: 'Each player holds private intel. Coordinate verbally to complete the mission.',
  skill_category: 'simulations',
  skill_categories: ['simulations'],

  HostComponent: MissionBriefingHostComponent,
  PlayerComponent: MissionBriefingPlayerComponent,
  ContentEditor: MissionBriefingContentEditorStub,

  defaultConfig: {},
  validateItem,

  bulkImport: {
    enabled: true,
    fields: [
      { key: 'playerLabel',        label: 'Player Label',        required: true  },
      { key: 'briefing',           label: 'Briefing',            required: true  },
      { key: 'languageConstraints', label: 'Language Constraints', required: false },
    ],
    placeholder: 'Agent A | You have the floor plan. Exit is east. | Only give directions; Never say "blocked"\nAgent B | You know survivor positions. | Only describe people; No route suggestions',
    description: 'Player Label | Briefing text | Language Constraints (semicolon-separated, optional)',
    defaultSeparator: 'pipe',
    parseLine: (line) => {
      const parts = line.split('|').map(p => p.trim())
      if (parts.length < 2) return null
      const [playerLabel, briefing, constraintsStr] = parts
      if (!playerLabel || !briefing) return null
      const languageConstraints = constraintsStr
        ? constraintsStr.split(';').map(s => s.trim()).filter(Boolean)
        : []
      return { playerLabel, briefing, languageConstraints }
    },
  },
}

export { MissionBriefingHostComponent, MissionBriefingPlayerComponent, MissionBriefingContentEditorStub }
