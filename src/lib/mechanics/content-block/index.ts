import type { MechanicDefinition, ContentEditorProps } from '@/lib/mechanics/types'
import type { ContentBlockConfig, ContentBlockItem, ContentBlockState } from './types'
import type { ComponentType } from 'react'

function validateContentBlockItem(data: unknown): data is ContentBlockItem {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return (d.type === 'text' || d.type === 'video' || d.type === 'grammar_table' || d.type === 'vocab_cards')
    && typeof d.text === 'string'
    && typeof d.videoUrl === 'string'
}

const ContentEditorStub: ComponentType<ContentEditorProps<ContentBlockItem>> = () => null
const HostStub: ComponentType = () => null
const PlayerStub: ComponentType = () => null

export const contentBlockDefinition: MechanicDefinition<ContentBlockConfig, ContentBlockItem, ContentBlockState> = {
  id: 'content_block',
  name: 'Content Block',
  description: 'Present text or video material to students.',
  skill_category: 'content',
  skill_categories: ['content'],

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HostComponent: HostStub as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PlayerComponent: PlayerStub as any,
  ContentEditor: ContentEditorStub,

  defaultConfig: {},
  validateItem: validateContentBlockItem,
}
