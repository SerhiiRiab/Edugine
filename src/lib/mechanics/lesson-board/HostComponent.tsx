'use client'

import dynamic from 'next/dynamic'
import { PenLine, StopCircle, ChevronRight } from 'lucide-react'
import type { LessonBoardState } from './types'
import { ErrorBoundary } from '@/components/error-boundary'

const TldrawHostCanvas = dynamic(() => import('./TldrawHostCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
      Loading canvas…
    </div>
  ),
})

export interface LessonBoardHostPanelProps {
  state: LessonBoardState
  isLastActivity: boolean
  isAdvancing: boolean
  isLesson?: boolean
  onNextActivity: () => void
  onEndLesson: () => void
  onSnapshotChange: (snapshot: unknown) => void
}

export function LessonBoardHostPanel({
  state,
  isLastActivity,
  isAdvancing,
  isLesson = true,
  onNextActivity,
  onEndLesson,
  onSnapshotChange,
}: LessonBoardHostPanelProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full
          bg-orange-100 text-orange-700 border border-orange-200">
          <PenLine className="w-3 h-3" />Lesson Board
        </span>
        <span className="text-xs text-slate-400">
          Draw, write and explain — students watch live
        </span>
      </div>

      <div className="h-[60vh] min-h-[420px] rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative bg-white">
        <ErrorBoundary fallback="The board crashed. Your last saved snapshot is safe — try again to reload the canvas.">
          <TldrawHostCanvas initialSnapshot={state.snapshot} onSnapshotChange={onSnapshotChange} />
        </ErrorBoundary>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onEndLesson}
          disabled={isAdvancing}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl
            border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200
            hover:text-red-600 text-slate-400 text-sm font-semibold
            disabled:opacity-50 transition-colors"
        >
          <StopCircle className="w-4 h-4" />
          {isLesson ? 'End lesson' : 'End activity'}
        </button>
        <button
          onClick={onNextActivity}
          disabled={isAdvancing}
          className="flex-1 flex items-center justify-center gap-2 bg-violet-600
            hover:bg-violet-700 disabled:opacity-50 text-white font-bold
            px-6 py-3 rounded-xl text-sm transition-colors shadow-sm"
        >
          {isAdvancing
            ? 'Loading...'
            : isLastActivity
              ? isLesson ? 'Finish lesson!' : 'Finish'
              : <>Next activity <ChevronRight className="w-4 h-4" /></>
          }
        </button>
      </div>
    </div>
  )
}
