'use client'

import type { DiffSegment } from './diff'

export interface SentenceDiffViewProps {
  segments: DiffSegment[]
  // changeSegment position (0-based, counting only 'change' segments) → typed correction
  fixes: Record<number, string>
  // 'edit' = student can tap a change segment and type; 'result' = show correct/incorrect coloring
  mode: 'edit' | 'result'
  activeIndex?: number | null
  inputValue?: string
  onActivate?: (changeIndex: number) => void
  onInputChange?: (value: string) => void
  onConfirm?: (changeIndex: number) => void
  onCancel?: () => void
  size?: 'sm' | 'base'
}

export function SentenceDiffView({
  segments, fixes, mode, activeIndex = null, inputValue = '',
  onActivate, onInputChange, onConfirm, onCancel, size = 'base',
}: SentenceDiffViewProps) {
  const textSize = size === 'sm' ? 'text-xs' : 'text-base'
  const pad = size === 'sm' ? 'px-1 py-0.5' : 'px-1.5 py-0.5'
  let changeIndex = -1

  return (
    <div className="flex flex-wrap gap-x-1 gap-y-2 justify-center items-center leading-loose">
      {segments.map((segment, segIdx) => {
        if (segment.type === 'same') {
          return (
            <span key={segIdx} className={`inline-block ${pad} ${textSize} font-semibold text-slate-200`}>
              {segment.word}
            </span>
          )
        }

        changeIndex++
        const myIndex = changeIndex
        const fix = fixes[myIndex]
        const original = segment.iWords.join(' ')
        const correctText = segment.cWords.join(' ')
        const isInsertion = segment.iWords.length === 0
        const displayText = fix !== undefined && fix !== '' ? fix : (isInsertion ? '＋' : original)
        const isActive = mode === 'edit' && activeIndex === myIndex

        if (isActive) {
          return (
            <input
              key={segIdx}
              autoFocus
              value={inputValue}
              onChange={e => onInputChange?.(e.target.value)}
              onBlur={() => onConfirm?.(myIndex)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === 'Tab') {
                  e.preventDefault()
                  onConfirm?.(myIndex)
                } else if (e.key === 'Escape') {
                  onCancel?.()
                }
              }}
              style={{ width: `${Math.max(inputValue.length || original.length || 3, 3) + 2}ch` }}
              className={`inline-block px-2 py-0.5 rounded-lg border-2 border-sky-400 bg-sky-900/30
                text-white ${textSize} font-semibold outline-none text-center transition-all`}
            />
          )
        }

        if (mode === 'result') {
          const isCorrect = (fix ?? '').trim().toLowerCase() === correctText.toLowerCase()
          const colorClass = isCorrect
            ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-600/60'
            : 'bg-red-900/40 text-red-300 border border-red-600/60'
          return (
            <span key={segIdx} className={`inline-block ${pad} rounded-md ${textSize} font-semibold ${colorClass}`}>
              {isCorrect ? displayText : (
                <>
                  {!isInsertion && <span className="line-through opacity-50">{original}</span>}
                  <span className="ml-1 text-emerald-400 no-underline">{correctText}</span>
                </>
              )}
            </span>
          )
        }

        const hasFix = fix !== undefined && fix !== ''
        return (
          <button
            key={segIdx}
            type="button"
            onClick={() => onActivate?.(myIndex)}
            className={`inline-block ${pad} rounded-md ${textSize} font-semibold transition-all active:scale-95
              ${hasFix
                ? 'bg-sky-900/40 text-sky-200 border border-sky-600/60 ring-1 ring-sky-500/30'
                : isInsertion
                  ? 'text-slate-500 border border-dashed border-slate-600 hover:border-sky-400 hover:text-sky-300'
                  : 'text-slate-100 hover:bg-slate-700/60 hover:text-white border border-transparent hover:border-slate-600'
              }`}
          >
            {displayText}
          </button>
        )
      })}
    </div>
  )
}
