import type { MechanicDefinition, ContentEditorProps } from '@/lib/mechanics/types'
import type { LessonBoardConfig, LessonBoardItem, LessonBoardState } from './types'
import type { ComponentType } from 'react'
import { LessonBoardHostPanel } from './HostComponent'
import { LessonBoardPlayerPanel } from './PlayerComponent'
import { LessonBoardContentEditor } from './ContentEditor'

// SQL: INSERT INTO mechanics (id, name, description, supported_modes, skill_category, skill_categories)
// VALUES ('lesson_board', 'Lesson Board', 'A live shared whiteboard — the host draws, writes and explains while students watch in real time.',
//         ARRAY['shared'], 'content', ARRAY['content']);

function validateItem(_data: unknown): _data is LessonBoardItem {
  return true
}

const ContentEditorStub: ComponentType<ContentEditorProps<LessonBoardItem>> = () => null

export const lessonBoardDefinition: MechanicDefinition<
  LessonBoardConfig,
  LessonBoardItem,
  LessonBoardState
> = {
  id: 'lesson_board',
  name: 'Lesson Board',
  description: 'A live shared whiteboard — the host and students draw, write and explain together in real time.',
  skill_category: 'content',
  skill_categories: ['content'],

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HostComponent: (() => null) as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PlayerComponent: (() => null) as any,
  ContentEditor: ContentEditorStub,

  defaultConfig: {},
  validateItem,
}

export { LessonBoardHostPanel, LessonBoardPlayerPanel, LessonBoardContentEditor }
