'use client'

// TODO: Implement SwipeBattle content editor
// Lets tutors add/edit word + translation + isCorrect entries.

import type { ContentEditorProps } from '@/lib/mechanics/types'
import type { SwipeBattleItem } from './types'

export function SwipeBattleContentEditor(
  _props: ContentEditorProps<SwipeBattleItem>,
) {
  return (
    <div className="flex items-center justify-center p-8 text-muted-foreground">
      SwipeBattle — Content editor (coming soon)
    </div>
  )
}
