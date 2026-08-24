import type { MechanicDefinition } from '@/lib/mechanics/types'
import type { CorrectTheMistakeConfig, CorrectTheMistakeItem, CorrectTheMistakeIndividualState } from './types'
import { CorrectTheMistakeHostComponent } from './HostComponent'
import { CorrectTheMistakePlayerComponent } from './PlayerComponent'
import { CorrectTheMistakeContentEditor } from './ContentEditor'

// SQL: INSERT INTO mechanics (id, name, description, skill_category, skill_categories, supported_modes)
// VALUES ('correct_the_mistake', 'Correct the Mistake', 'Find and fix the grammatical mistake in each sentence.',
//         'knowledge-check', ARRAY['knowledge-check'], ARRAY['individual','shared']);

function validateItem(data: unknown): data is CorrectTheMistakeItem {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return typeof d.incorrect === 'string' && typeof d.correct === 'string'
}

export const correctTheMistakeDefinition: MechanicDefinition<
  CorrectTheMistakeConfig,
  CorrectTheMistakeItem,
  CorrectTheMistakeIndividualState
> = {
  id: 'correct_the_mistake',
  name: 'Correct the Mistake',
  description: 'Find and fix the grammatical mistake in each sentence.',
  skill_category: 'knowledge-check',
  skill_categories: ['knowledge-check'],

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HostComponent: CorrectTheMistakeHostComponent as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PlayerComponent: CorrectTheMistakePlayerComponent as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ContentEditor: CorrectTheMistakeContentEditor as any,

  defaultConfig: {},
  validateItem,

  bulkImport: {
    enabled: true,
    fields: [
      { key: 'incorrect', label: 'Incorrect sentence', required: true },
      { key: 'correct', label: 'Correct sentence', required: true },
    ],
    placeholder: 'She go to school every day. | She goes to school every day.\nHe don\'t like coffee. | He doesn\'t like coffee.',
    description: 'incorrect sentence | correct sentence',
    defaultSeparator: 'pipe',
    parseLine: (line) => {
      const parts = line.split('|').map(p => p.trim())
      if (parts.length < 2) return null
      const incorrect = parts[0]
      const correct = parts[1]
      if (!incorrect || !correct) return null
      return { incorrect, correct }
    },
  },
}
