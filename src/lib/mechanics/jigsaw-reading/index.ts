import type { MechanicDefinition } from '@/lib/mechanics/types'
import type { JigsawReadingConfig, JigsawReadingItem, JigsawReadingState } from './types'
import { JigsawReadingHostPanel } from './HostComponent'
import { JigsawReadingPlayerPanel } from './PlayerComponent'
import { JigsawReadingContentEditor } from './ContentEditor'

// SQL: INSERT INTO mechanics (id, name, description, supported_modes, skill_category, skill_categories)
// VALUES ('jigsaw_reading', 'Jigsaw Reading', 'Each student reads a different passage privately, then shares with the group. Together they answer discussion questions.',
//         ARRAY['shared'], 'reading', ARRAY['reading', 'speaking']);

function validateItem(data: unknown): data is JigsawReadingItem {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return typeof d.title === 'string' && d.title.trim().length > 0 &&
    typeof d.text === 'string' && d.text.trim().length > 0
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const jigsawReadingDefinition: MechanicDefinition<JigsawReadingConfig, JigsawReadingItem, JigsawReadingState> = {
  id: 'jigsaw_reading',
  name: 'Jigsaw Reading',
  description: 'Each student reads a different passage privately, then shares with the group. Together they answer discussion questions.',
  skill_category: 'reading',
  skill_categories: ['reading', 'speaking'],

  HostComponent: (() => null) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  PlayerComponent: (() => null) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  ContentEditor: (() => null) as any, // eslint-disable-line @typescript-eslint/no-explicit-any

  defaultConfig: {},
  validateItem,

  bulkImport: {
    enabled: true,
    fields: [
      { key: 'title', label: 'Title', required: true },
      { key: 'text',  label: 'Text',  required: true },
    ],
    placeholder: 'Part 1: The Origins | In 1995, a small team of engineers gathered in a garage in Silicon Valley...\nPart 2: The Breakthrough | By 2003, the company had grown to over 500 employees...',
    description: 'Title | Text',
    defaultSeparator: 'pipe',
    parseLine: (line) => {
      const pipeIndex = line.indexOf('|')
      if (pipeIndex < 0) return null
      const title = line.slice(0, pipeIndex).trim()
      const text = line.slice(pipeIndex + 1).trim()
      if (!title || !text) return null
      return { title, text }
    },
  },
}

export { JigsawReadingHostPanel, JigsawReadingPlayerPanel, JigsawReadingContentEditor }
