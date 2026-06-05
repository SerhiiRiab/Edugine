import type { MechanicDefinition } from '@/lib/mechanics/types'
import type { HiddenRoleConfig, HiddenRoleItem, HiddenRoleState } from './types'
import { HiddenRoleHostPanel } from './HostComponent'
import { HiddenRolePlayerPanel } from './PlayerComponent'
import { HiddenRoleContentEditor } from './ContentEditor'

// SQL: INSERT INTO mechanics (id, name, description, supported_modes, skill_category, skill_categories)
// VALUES ('hidden_role', 'Hidden Role', 'Each player gets a secret role. Discuss, deduce, and vote to find the spy.',
//         ARRAY['shared'], 'simulations', ARRAY['simulations']);

function validateItem(data: unknown): data is HiddenRoleItem {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return (
    typeof d.roleName === 'string' &&
    typeof d.roleDescription === 'string' &&
    typeof d.secretGoal === 'string' &&
    typeof d.isSpy === 'boolean' &&
    Array.isArray(d.languageConstraints)
  )
}

export const hiddenRoleDefinition: MechanicDefinition<
  HiddenRoleConfig,
  HiddenRoleItem,
  HiddenRoleState
> = {
  id: 'hidden_role',
  name: 'Hidden Role',
  description: 'Each player gets a secret role. Discuss, deduce, and vote to find the spy.',
  skill_category: 'simulations',
  skill_categories: ['simulations'],

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
      { key: 'roleName',             label: 'Role Name',             required: true  },
      { key: 'roleDescription',      label: 'Role Description',      required: true  },
      { key: 'secretGoal',           label: 'Secret Goal',           required: true  },
      { key: 'isSpy',                label: 'Is Spy',                required: false },
      { key: 'languageConstraints',  label: 'Language Constraints',  required: false },
    ],
    placeholder: 'The Thief | You stole the painting. | Stay innocent. | true | Use: I swear...; Avoid direct answers\nSenior Detective | Lead investigator. | Find the thief. | false',
    description: 'Role Name | Role Description | Secret Goal | isSpy (true/false) | Language Constraints (semicolon-separated, optional)',
    defaultSeparator: 'pipe',
    parseLine: (line) => {
      const parts = line.split('|').map(p => p.trim())
      if (parts.length < 3) return null
      const [roleName, roleDescription, secretGoal, isSpyStr, constraintsStr] = parts
      if (!roleName || !roleDescription || !secretGoal) return null
      const languageConstraints = constraintsStr
        ? constraintsStr.split(';').map(s => s.trim()).filter(Boolean)
        : []
      return { roleName, roleDescription, secretGoal, isSpy: isSpyStr?.toLowerCase() === 'true', languageConstraints }
    },
  },
}

export { HiddenRoleHostPanel, HiddenRolePlayerPanel, HiddenRoleContentEditor }
