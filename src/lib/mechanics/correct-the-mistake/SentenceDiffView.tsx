'use client'

import type { DiffSegment } from './diff'

export interface SentenceDiffViewProps {
  segments: DiffSegment[]
  // segment index (position in `segments`) → typed correction
  fixes: Record<number, string>
  // 'edit' = student can tap any word and type; 'result' = show correct/incorrect coloring
  mode: 'edit' | 'result'
  activeIndex?: number | null
  inputValue?: string
  onActivate?: (segIdx: number) => void
  onInputChange?: (value: string) => void
  onConfirm?: (segIdx: number) => void
  onCancel?: () => void
  size?: 'sm' | 'base'
}

export function SentenceDiffView({
  segments, fixes, mode, activeIndex = null, inputValue = '',
  onActivate, onInputChange, onConfirm, onCancel, size = 'base',
}: SentenceDiffViewProps) {
  const textSize = size === 'sm' ? 'text-xs' : 'text-base'

  return (
    <div className="flex flex-wrap gap-x-1.5 gap-y-2 justify-center items-center leading-relaxed">
      {segments.map((segment, segIdx) => {
        const isChange = segment.type === 'change'
        const original = isChange ? segment.iWords.join(' ') : segment.word
        const correctText = isChange ? segment.cWords.join(' ') : segment.word
        const isInsertion = isChange && segment.iWords.length === 0
        const fix = fixes[segIdx]
        const hasFix = fix !== undefined && fix !== ''
        const displayText = hasFix ? fix : (isInsertion ? '＋' : original)
        const isActive = mode === 'edit' && activeIndex === segIdx

        if (isActive) {
          return (
            <input
              key={segIdx}
              autoFocus
              value={inputValue}
              onChange={e => onInputChange?.(e.target.value)}
              onBlur={() => onConfirm?.(segIdx)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === 'Tab') {
                  e.preventDefault()
                  onConfirm?.(segIdx)
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
          if (isChange) {
            const isCorrect = (fix ?? '').trim().toLowerCase() === correctText.toLowerCase()
            const colorClass = isCorrect
              ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-600/60'
              : 'bg-red-900/40 text-red-300 border border-red-600/60'
            return (
              <span key={segIdx} className={`inline-block px-1.5 py-0.5 rounded-md ${textSize} font-semibold ${colorClass}`}>
                {isCorrect ? displayText : (
                  <>
                    {!isInsertion && <span className="line-through opacity-50">{original}</span>}
                    <span className="ml-1 text-emerald-400 no-underline">{correctText}</span>
                  </>
                )}
              </span>
            )
          }
          if (hasFix) {
            return (
              <span key={segIdx} className={`inline-block px-1.5 py-0.5 rounded-md ${textSize} font-semibold
                bg-amber-900/30 text-amber-300 border border-amber-600/50`}>
                {original}
              </span>
            )
          }
          return (
            <span key={segIdx} className={`inline-block px-0.5 ${textSize} font-semibold text-slate-200`}>
              {original}
            </span>
          )
        }

        // edit mode, not active — every word is tappable so the student has to find the mistake
        return (
          <button
            key={segIdx}
            type="button"
            onClick={() => onActivate?.(segIdx)}
            className={`inline-block rounded-md ${textSize} font-semibold transition-all active:scale-95
              ${hasFix
                ? 'px-1.5 py-0.5 bg-sky-900/40 text-sky-200 border border-sky-600/60 ring-1 ring-sky-500/30'
                : isInsertion
                  ? 'px-1.5 py-0.5 text-slate-500 border border-dashed border-slate-600 hover:border-sky-400 hover:text-sky-300'
                  : 'px-0.5 py-0.5 text-slate-100 border border-transparent hover:bg-slate-700/60 hover:text-white hover:border-slate-600'
              }`}
          >
            {displayText}
          </button>
        )
      })}
    </div>
  )
}
