'use client'

import dynamic from 'next/dynamic'
import { PenLine } from 'lucide-react'
import type { LessonBoardState } from './types'

const TldrawPlayerCanvas = dynamic(() => import('./TldrawPlayerCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
      Loading canvas…
    </div>
  ),
})

export interface LessonBoardPlayerPanelProps {
  state: LessonBoardState
}

export function LessonBoardPlayerPanel({ state }: LessonBoardPlayerPanelProps) {
  if (!state.snapshot) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <PenLine className="w-12 h-12 text-orange-400" />
        <div className="space-y-1">
          <p className="text-white font-bold text-lg">Lesson Board</p>
          <p className="text-slate-400 text-sm">Waiting for the tutor to start drawing…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 relative bg-white">
      <TldrawPlayerCanvas snapshot={state.snapshot} />
    </div>
  )
}
