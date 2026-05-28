'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, FileText, Video } from 'lucide-react'
import type { ContentBlockState } from './types'

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0]
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) return v
      const parts = u.pathname.split('/')
      const embedIdx = parts.indexOf('embed')
      if (embedIdx !== -1) return parts[embedIdx + 1]
    }
  } catch { /* not a valid URL */ }
  return null
}

export interface ContentBlockPlayerPanelProps {
  participantId: string
  state: ContentBlockState
  onGotIt: () => void
}

export function ContentBlockPlayerPanel({ state, onGotIt }: ContentBlockPlayerPanelProps) {
  const [gotIt, setGotIt] = useState(false)
  const { content } = state

  function handleGotIt() {
    if (gotIt) return
    setGotIt(true)
    onGotIt()
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-900 overflow-y-auto">

      {/* Type badge */}
      <div className="px-4 py-2.5 border-b border-slate-800 flex items-center gap-2">
        {content.type === 'text'
          ? <><FileText className="w-3.5 h-3.5 text-orange-400" /><span className="text-xs font-semibold text-slate-400">Reading</span></>
          : <><Video className="w-3.5 h-3.5 text-orange-400" /><span className="text-xs font-semibold text-slate-400">Video</span></>
        }
      </div>

      {/* Main content */}
      <div className="flex-1 px-4 sm:px-6 py-6 max-w-2xl mx-auto w-full">

        {content.type === 'text' ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="bg-slate-800/60 rounded-2xl border border-slate-700/60 px-5 sm:px-7 py-6"
          >
            <p className="text-white leading-[1.8] text-base sm:text-lg font-medium whitespace-pre-wrap">
              {content.text || <span className="text-slate-500 italic">No content</span>}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl overflow-hidden border border-slate-700/60 bg-black aspect-video"
          >
            {content.videoUrl && extractYouTubeId(content.videoUrl) ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${extractYouTubeId(content.videoUrl)}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
                title="Lesson video"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500">
                <div className="text-center space-y-2">
                  <Video className="w-8 h-8 mx-auto" />
                  <p className="text-sm">Video not available</p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Got it button */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="mt-6"
        >
          {gotIt ? (
            <div className="flex items-center justify-center gap-2 py-4 text-emerald-400 font-semibold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              Got it! Waiting for teacher to continue...
            </div>
          ) : (
            <button
              onClick={handleGotIt}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl
                bg-orange-500 hover:bg-orange-600 active:scale-[0.98]
                text-white font-bold text-base transition-all shadow-lg"
            >
              <CheckCircle2 className="w-5 h-5" />
              Got it!
            </button>
          )}
        </motion.div>
      </div>
    </div>
  )
}
