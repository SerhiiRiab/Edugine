import type { MechanicDefinition } from '@/lib/mechanics/types'
import type { WordBankConfig, WordBankItem, WordBankIndividualState } from './types'
import { WordBankHostComponent } from './HostComponent'
import { WordBankPlayerComponent } from './PlayerComponent'
import { WordBankContentEditorStub } from './ContentEditor'

function validateWordBankItem(data: unknown): data is WordBankItem {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  if (typeof d.text !== 'string') return false
  if (!Array.isArray(d.blanks)) return false
  if (!Array.isArray(d.wordBank)) return false
  return (d.blanks as unknown[]).every(b => {
    if (typeof b !== 'object' || b === null) return false
    return typeof (b as Record<string, unknown>).answer === 'string'
  })
}

export const wordBankDefinition: MechanicDefinition<WordBankConfig, WordBankItem, WordBankIndividualState> = {
  id: 'word_bank',
  name: 'Word Bank',
  description: 'Fill in the blanks using words from a shared word bank.',
  skill_category: 'interactive-blocks',
  skill_categories: ['interactive-blocks'],
  HostComponent: WordBankHostComponent,
  PlayerComponent: WordBankPlayerComponent,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ContentEditor: WordBankContentEditorStub as any,
  defaultConfig: {},
  validateItem: validateWordBankItem,
}
