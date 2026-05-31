import type { MechanicDefinition } from '@/lib/mechanics/types'
import type { FillTheGapConfig, FillTheGapItem, FillTheGapState } from './types'
import { FillTheGapHostComponent } from './HostComponent'
import { FillTheGapPlayerComponent } from './PlayerComponent'
import { FillTheGapContentEditorStub } from './ContentEditor'

function validateFillTheGapItem(data: unknown): data is FillTheGapItem {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  if (typeof d.sentence !== 'string') return false
  if (!Array.isArray(d.blanks)) return false
  return (d.blanks as unknown[]).every(b => {
    if (typeof b !== 'object' || b === null) return false
    const blank = b as Record<string, unknown>
    return typeof blank.answer === 'string'
  })
}

export const fillTheGapDefinition: MechanicDefinition<FillTheGapConfig, FillTheGapItem, FillTheGapState> = {
  id: 'fill_the_gap',
  name: 'Fill the Gap',
  description: 'Complete sentences by filling in the missing words.',
  skill_category: 'grammar',
  skill_categories: ['grammar', 'writing'],

  HostComponent: FillTheGapHostComponent,
  PlayerComponent: FillTheGapPlayerComponent,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ContentEditor: FillTheGapContentEditorStub as any,

  defaultConfig: {},
  validateItem: validateFillTheGapItem,

  bulkImport: {
    enabled: true,
    fields: [
      { key: 'sentence', label: 'Sentence (with ___)', required: true },
      { key: 'answers', label: 'Correct answer(s)', required: true },
    ],
    placeholder: `She ___ to school every day. | goes
He ___ to the store. | went | went, goes, gone, go
She ___ and ___ yesterday. | ate, slept | ate,eat,eating | slept,sleep,sleeping`,
    description: 'sentence with ___ | answers | options for blank 1 | options for blank 2 ...',
    defaultSeparator: 'comma',
    parseLine: (line) => {
      const parts = line.split('|').map(p => p.trim())
      if (parts.length < 2) return null
      const sentence = parts[0]
      if (!sentence || !sentence.includes('___')) return null
      const blankCount = (sentence.match(/___/g) ?? []).length
      const answers = parts[1].split(',').map(a => a.trim()).filter(Boolean)
      if (answers.length === 0) return null
      const blanks: Array<{ answer: string; options?: string[] }> = []
      for (let i = 0; i < blankCount; i++) {
        const answer = answers[i] ?? ''
        if (!answer) return null
        const optStr = parts[i + 2]
        const options = optStr ? optStr.split(',').map(o => o.trim()).filter(Boolean) : []
        blanks.push({ answer, ...(options.length > 0 ? { options } : {}) })
      }
      return { sentence, blanks }
    },
  },
}
