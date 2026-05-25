import type { MechanicDefinition, ContentEditorProps } from '@/lib/mechanics/types'
import type { TalkTimeConfig, TalkTimeItem, TalkTimeState } from './types'
import type { ComponentType } from 'react'

function validateTalkTimeItem(data: unknown): data is TalkTimeItem {
  if (typeof data !== 'object' || data === null) return false
  return typeof (data as Record<string, unknown>).prompt === 'string'
}

const ContentEditorStub: ComponentType<ContentEditorProps<TalkTimeItem>> = () => null
const HostStub: ComponentType = () => null
const PlayerStub: ComponentType = () => null

export const talkTimeDefinition: MechanicDefinition<TalkTimeConfig, TalkTimeItem, TalkTimeState> = {
  id: 'talk_time',
  name: 'Talk Time',
  description: 'Speak on a prompt against the clock, taking turns.',
  skill_category: 'speaking',

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HostComponent: HostStub as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PlayerComponent: PlayerStub as any,
  ContentEditor: ContentEditorStub,

  defaultConfig: {},
  validateItem: validateTalkTimeItem,

  bulkImport: {
    enabled: true,
    fields: [{ key: 'prompt', label: 'Prompt', required: true }],
    placeholder: 'Describe your last holiday\nArgue for and against social media\nWhat would you do if you won the lottery?',
    description: 'Paste speaking prompts — one per line',
    defaultSeparator: 'comma',
    parseLine: (line) => {
      const prompt = line.trim()
      return prompt ? { prompt } : null
    },
  },
}
