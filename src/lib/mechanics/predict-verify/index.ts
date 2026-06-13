import type { MechanicDefinition } from '@/lib/mechanics/types'
import type { PredictVerifyConfig, PredictVerifyItem, PredictVerifyState } from './types'
import { PredictVerifyHostComponent } from './HostComponent'
import { PredictVerifyPlayerComponent } from './PlayerComponent'
import { PredictVerifyContentEditor } from './ContentEditor'

// SQL: INSERT INTO mechanics (id, name, description, supported_modes, skill_category, skill_categories)
// VALUES ('predict_verify', 'Predict & Verify', 'Students predict what an article is about from the headline, read the full text, then discuss whose prediction was closest.',
//         ARRAY['shared'], 'reading', ARRAY['reading', 'speaking']);

function validateItem(data: unknown): data is PredictVerifyItem {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return typeof d.headline === 'string' && d.headline.trim().length > 0 &&
    typeof d.text === 'string' && d.text.trim().length > 0
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const predictVerifyDefinition: MechanicDefinition<PredictVerifyConfig, PredictVerifyItem, PredictVerifyState> = {
  id: 'predict_verify',
  name: 'Predict & Verify',
  description: 'Students predict what an article is about from the headline, read the full text, then discuss whose prediction was closest.',
  skill_category: 'reading',
  skill_categories: ['reading', 'speaking'],

  HostComponent: PredictVerifyHostComponent,
  PlayerComponent: PredictVerifyPlayerComponent,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ContentEditor: (() => null) as any,

  defaultConfig: { predictionMode: 'written' },
  validateItem,

  bulkImport: {
    enabled: true,
    fields: [
      { key: 'headline', label: 'Headline', required: true },
      { key: 'text',     label: 'Text',     required: true },
    ],
    placeholder: 'Why Remote Work Is Changing Leadership Forever | Remote work has fundamentally transformed how leaders operate...\nThe Hidden Cost of Meetings | Studies show that the average employee spends 31 hours per month in unproductive meetings...',
    description: 'Headline | Full text',
    defaultSeparator: 'pipe',
    parseLine: (line) => {
      const pipeIndex = line.indexOf('|')
      if (pipeIndex < 0) return null
      const headline = line.slice(0, pipeIndex).trim()
      const text = line.slice(pipeIndex + 1).trim()
      if (!headline || !text) return null
      return { headline, text }
    },
  },
}

export { PredictVerifyHostComponent, PredictVerifyPlayerComponent, PredictVerifyContentEditor }
