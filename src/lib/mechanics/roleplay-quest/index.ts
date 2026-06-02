import type React from 'react'
import type { MechanicDefinition } from '@/lib/mechanics/types'
import type { RoleplayQuestConfig, RoleplayQuestItem, RoleplayQuestState } from './types'

function validateRoleplayQuestItem(data: unknown): data is RoleplayQuestItem {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return typeof d.roleName === 'string' && typeof d.roleDescription === 'string' && typeof d.secretGoal === 'string'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const HostStub: React.ComponentType<any> = () => null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PlayerStub: React.ComponentType<any> = () => null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EditorStub: React.ComponentType<any> = () => null

export const roleplayQuestDefinition: MechanicDefinition<RoleplayQuestConfig, RoleplayQuestItem, RoleplayQuestState> = {
  id: 'roleplay_quest',
  name: 'Roleplay Quest',
  description: 'Students pick secret roles and complete hidden goals in a live roleplay scenario.',
  skill_category: 'speaking',
  skill_categories: ['speaking'],

  HostComponent: HostStub,
  PlayerComponent: PlayerStub,
  ContentEditor: EditorStub,

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
