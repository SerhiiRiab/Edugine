import type { MechanicDefinition } from '@/lib/mechanics/types'
import type { WordChoiceConfig, WordChoiceItem, WordChoiceIndividualState } from './types'
import { WordChoiceHostComponent } from './HostComponent'
import { WordChoicePlayerComponent } from './PlayerComponent'
import { WordChoiceContentEditor } from './ContentEditor'

function validateWordChoiceItem(data: unknown): data is WordChoiceItem {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  if (typeof d.sentence !== 'string') return false
  if (!Array.isArray(d.blanks)) return false
  return (d.blanks as unknown[]).every(b => {
    if (typeof b !== 'object' || b === null) return false
    const blank = b as Record<string, unknown>
    return (
      Array.isArray(blank.options) &&
      (blank.options as unknown[]).length >= 2 &&
      typeof blank.correctIndex === 'number'
    )
  })
}

export const wordChoiceDefinition: MechanicDefinition<WordChoiceConfig, WordChoiceItem, WordChoiceIndividualState> = {
  id: 'word_choice',
  name: 'Word Choice',
  description: 'Choose the correct word to complete each sentence from a dropdown.',
  skill_category: 'grammar',
  skill_categories: ['grammar', 'vocabulary', 'reading'],

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HostComponent: WordChoiceHostComponent as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PlayerComponent: WordChoicePlayerComponent as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ContentEditor: WordChoiceContentEditor as any,

  defaultConfig: {},
  validateItem: validateWordChoiceItem,

  bulkImport: {
    enabled: true,
    fields: [
      { key: 'sentence', label: 'Sentence (with ___)', required: true },
      { key: 'answers', label: 'Correct answer(s)', required: true },
    ],
    placeholder: `She ___ to school every day. | goes | go, goes, went, gone\nHe ___ and ___ yesterday. | ate, slept | ate,eat,eating | slept,sleep,sleeping`,
    description: 'sentence | correct answer(s) | options for blank 1 | options for blank 2 …',
    defaultSeparator: 'pipe',
    parseLine: (line) => {
      const parts = line.split('|').map(p => p.trim())
      if (parts.length < 3) return null
      const sentence = parts[0]
      if (!sentence || !sentence.includes('___')) return null
      const blankCount = (sentence.match(/___/g) ?? []).length
      const answers = parts[1].split(',').map(a => a.trim()).filter(Boolean)
      if (answers.length === 0) return null
      const blanks: Array<{ options: string[]; correctIndex: number }> = []
      for (let i = 0; i < blankCount; i++) {
        const answer = answers[i]?.trim()
        if (!answer) return null
        const optStr = parts[i + 2]
        if (!optStr) return null
        const rawOptions = optStr.split(',').map(o => o.trim()).filter(Boolean)
        if (!rawOptions.includes(answer)) rawOptions.push(answer)
        if (rawOptions.length < 2) return null
        // shuffle so correct answer lands in a random position
        for (let j = rawOptions.length - 1; j > 0; j--) {
          const k = Math.floor(Math.random() * (j + 1));
          [rawOptions[j], rawOptions[k]] = [rawOptions[k], rawOptions[j]]
        }
        blanks.push({ options: rawOptions, correctIndex: rawOptions.indexOf(answer) })
      }
      return { sentence, blanks }
    },
  },
}
