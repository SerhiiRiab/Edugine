import type { MechanicDefinition, ContentEditorProps } from '@/lib/mechanics/types'
import type { StoryBuilderConfig, StoryBuilderItem, StoryBuilderState } from './types'
import type { ComponentType } from 'react'

function validateStoryBuilderItem(data: unknown): data is StoryBuilderItem {
  if (typeof data !== 'object' || data === null) return false
  return typeof (data as Record<string, unknown>).word === 'string'
}

// ContentEditor and Host/PlayerComponent are used directly by pages, not via registry.
// We satisfy the types with stubs here so the registry compiles.
const ContentEditorStub: ComponentType<ContentEditorProps<StoryBuilderItem>> = () => null
const HostStub: ComponentType = () => null
const PlayerStub: ComponentType = () => null

export const storyBuilderDefinition: MechanicDefinition<
  StoryBuilderConfig,
  StoryBuilderItem,
  StoryBuilderState
> = {
  id: 'story_builder',
  name: 'Group Story Builder',
  description: 'Collaborative turn-based story writing with a shared word bank.',
  skill_category: 'simulations',
  skill_categories: ['simulations'],

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HostComponent: HostStub as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PlayerComponent: PlayerStub as any,
  ContentEditor: ContentEditorStub,

  defaultConfig: {},
  validateItem: validateStoryBuilderItem,

  bulkImport: {
    enabled: true,
    fields: [{ key: 'word', label: 'Word', required: true }],
    placeholder: 'airport\nsuitcase\ndelayed\npassport',
    description: 'Paste target words — one per line',
    defaultSeparator: 'comma',
    parseLine: (line) => {
      const word = line.trim()
      return word ? { word } : null
    },
  },
}
