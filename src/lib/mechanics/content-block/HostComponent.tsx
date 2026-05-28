'use client'

import { ChevronRight, StopCircle, Users, Eye, FileText, Video } from 'lucide-react'
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

export interface ContentBlockHostPanelProps {
  state: ContentBlockState
  participants: { id: string; nickname: string; online: boolean }[]
  isLastActivity: boolean
  isAdvancing: boolean
  isLesson?: boolean
  onNextActivity: () => void
  onEndLesson: () => void
}

export function ContentBlockHostPanel({
  state,
  participants,
  isLastActivity,
  isAdvancing,
  isLesson = true,
  onNextActivity,
  onEndLesson,
}: ContentBlockHostPanelProps) {
  const { content, viewedByParticipantIds } = state
  const viewedCount = viewedByParticipantIds.length
  const totalCount = participants.length

  return (
    <div className="max-w-3xl mx-auto space-y-4">

      {/* Header badge */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full
          bg-orange-100 text-orange-700 border border-orange-200">
          {content.type === 'text'
            ? <><FileText className="w-3 h-3" /> Text</>
            : <><Video className="w-3 h-3" /> Video</>
          }
        </span>
        <span className="text-xs text-slate-400">
          Content Block — students view this material
        </span>
      </div>

      {/* Content preview */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {content.type === 'text' ? (
          <div className="px-6 py-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Text content (student view)
            </p>
            <div className="bg-slate-50 rounded-xl border border-slate-100 px-5 py-4">
              <p className="text-slate-800 leading-relaxed whitespace-pre-wrap text-base font-medium">
                {content.text || <span className="text-slate-300 italic">No text content</span>}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 px-2">
              Video (student view)
            </p>
            {content.videoUrl && extractYouTubeId(content.videoUrl) ? (
              <div className="aspect-video rounded-xl overflow-hidden bg-slate-100">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${extractYouTubeId(content.videoUrl)}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                  title="Content video"
                />
              </div>
            ) : (
              <div className="aspect-video rounded-xl bg-slate-50 border-2 border-dashed border-slate-200
                flex items-center justify-center text-slate-300">
                <div className="text-center space-y-2">
                  <Video className="w-8 h-8 mx-auto" />
                  <p className="text-sm">No valid YouTube URL</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Viewed counter */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
        <div className="flex items-center gap-3">
          <Eye className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm font-semibold text-slate-700">Students who clicked &quot;Got it&quot;</span>
          <span className="ml-auto text-sm font-bold text-slate-800 tabular-nums">
            {viewedCount}
            <span className="text-slate-400 font-normal">/{totalCount}</span>
          </span>
        </div>
        {totalCount > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {participants.map(p => {
              const viewed = viewedByParticipantIds.includes(p.id)
              return (
                <span
                  key={p.id}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                    viewed
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}
                >
                  {viewed && <span className="mr-1">✓</span>}
                  {p.nickname}
                </span>
              )
            })}
          </div>
        )}
        {totalCount === 0 && (
          <div className="flex items-center gap-2 mt-2 text-slate-400">
            <Users className="w-4 h-4" />
            <span className="text-sm">No participants</span>
          </div>
        )}
      </div>

      {/* Actions */}
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
