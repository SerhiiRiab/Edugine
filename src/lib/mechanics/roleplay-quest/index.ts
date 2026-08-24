import type { MechanicDefinition } from '@/lib/mechanics/types'
import type { RoleplayQuestConfig, RoleplayQuestItem, RoleplayQuestState } from './types'
import { RoleplayQuestHostPanel } from './HostComponent'
import { RoleplayQuestPlayerPanel } from './PlayerComponent'
import { RoleplayQuestContentEditor } from './ContentEditor'

function validateRoleplayQuestItem(data: unknown): data is RoleplayQuestItem {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return typeof d.roleName === 'string' && typeof d.roleDescription === 'string' && typeof d.secretGoal === 'string'
}

export const roleplayQuestDefinition: MechanicDefinition<RoleplayQuestConfig, RoleplayQuestItem, RoleplayQuestState> = {
  id: 'roleplay_quest',
  name: 'Roleplay Quest',
  description: 'Students pick secret roles and complete hidden goals in a live roleplay scenario.',
  skill_category: 'simulations',
  skill_categories: ['simulations'],

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HostComponent: RoleplayQuestHostPanel as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PlayerComponent: RoleplayQuestPlayerPanel as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ContentEditor: RoleplayQuestContentEditor as any,

  defaultConfig: {},
  validateItem: validateRoleplayQuestItem,

  bulkImport: {
    enabled: true,
    fields: [
      { key: 'roleName', label: 'Role Name', required: true },
      { key: 'roleDescription', label: 'Role Description', required: true },
      { key: 'secretGoal', label: 'Secret Goal', required: true },
    ],
    placeholder: 'Tourist | You are visiting Paris for the first time | Find a cheap hotel near the Eiffel Tower\nHotel Manager | You work at a busy hotel | Upsell the premium room to the tourist\nLocal Guide | You know all the best spots | Convince the tourist to hire you',
    description: 'One role per line. Fields: Role Name | Role Description | Secret Goal',
    defaultSeparator: 'pipe',
    parseLine: (line, separator) => {
      const parts = line.split(separator).map(s => s.trim())
      if (parts.length < 3) return null
      const [roleName, roleDescription, secretGoal] = parts
      if (!roleName || !roleDescription || !secretGoal) return null
      return { roleName, roleDescription, secretGoal }
    },
  },
}
