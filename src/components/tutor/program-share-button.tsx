'use client'

import { useState } from 'react'
import { Share2, Copy, Check, X } from 'lucide-react'

interface Props {
  shareToken: string
}

export function ProgramShareButton({ shareToken }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/programs/share/${shareToken}`
      : `https://edugine.app/programs/share/${shareToken}`

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200
          text-sm font-medium text-slate-600 hover:border-violet-300 hover:text-violet-700
          hover:bg-violet-50 transition-colors"
      >
        <Share2 className="w-3.5 h-3.5" />
        Share
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-slate-800">Share Program</p>
                <p className="text-xs text-slate-400 mt-0.5">Anyone with this link can view this program</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Link + copy */}
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 px-3 py-2.5">
              <span className="flex-1 text-xs text-slate-500 truncate font-mono">{shareUrl}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 flex items-center gap-1 text-xs font-semibold text-violet-600
                  hover:text-violet-800 transition-colors"
              >
                {copied
                  ? <><Check className="w-3.5 h-3.5" />Copied</>
                  : <><Copy className="w-3.5 h-3.5" />Copy</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
