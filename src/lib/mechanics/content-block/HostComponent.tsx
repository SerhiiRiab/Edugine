'use client'

import { useState } from 'react'
import { ChevronRight, StopCircle, Users, Eye, FileText, Video, MessageSquare, ToggleLeft, Check, ChevronLeft, Table2, BookOpen } from 'lucide-react'
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
  onStartDiscussion: () => Promise<void>
  onNextQuestion: () => Promise<void>
  onEndDiscussion: () => Promise<void>
  onStartTF: () => Promise<void>
  onRevealTF: () => Promise<void>
  onNextTFCard: () => Promise<void>
}

export function ContentBlockHostPanel({
  state,
  participants,
  isLastActivity,
  isAdvancing,
  isLesson = true,
  onNextActivity,
  onEndLesson,
  onStartDiscussion,
  onNextQuestion,
  onEndDiscussion,
  onStartTF,
  onRevealTF,
  onNextTFCard,
}: ContentBlockHostPanelProps) {
  const [isBusy, setIsBusy] = useState(false)
  const { content, viewedByParticipantIds } = state
  const viewedCount = viewedByParticipantIds.length
  const totalCount = participants.length

  const hasDiscussion = content.discussionQuestions.length > 0
  const hasTF = content.trueFalseCards.length > 0
  const inDiscussion = state.discussionIndex !== null
  const inTF = state.tfIndex !== null
  const currentQuestion = inDiscussion && state.discussionIndex !== null ? content.discussionQuestions[state.discussionIndex] : null
  const currentTFCard = inTF && state.tfIndex !== null ? content.trueFalseCards[state.tfIndex] : null
  const isLastQuestion = state.discussionIndex !== null && state.discussionIndex >= content.discussionQuestions.length - 1
  const isLastTFCard = state.tfIndex !== null && state.tfIndex >= content.trueFalseCards.length - 1

  function wrap(fn: () => Promise<void>) {
    return async () => {
      if (isBusy) return
      setIsBusy(true)
      try { await fn() } finally { setIsBusy(false) }
    }
  }

  const tfVoteCount = Object.keys(state.tfVotes).length
  const tfTrueCount = Object.values(state.tfVotes).filter(v => v === true).length
  const tfFalseCount = Object.values(state.tfVotes).filter(v => v === false).length

  return (
    <div className="max-w-3xl mx-auto space-y-4">

      {/* Header badge */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full
          bg-orange-100 text-orange-700 border border-orange-200">
          {content.type === 'text'
            ? <><FileText className="w-3 h-3" /> Text</>
            : content.type === 'video'
            ? <><Video className="w-3 h-3" /> Video</>
            : content.type === 'grammar_table'
            ? <><Table2 className="w-3 h-3" /> Grammar Table</>
            : <><BookOpen className="w-3 h-3" /> Vocabulary Cards</>
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
            <div className="bg-slate-50 rounded-xl border border-slate-100 px-5 py-4 max-h-40 overflow-y-auto">
              <p className="text-slate-800 leading-relaxed whitespace-pre-wrap text-base font-medium">
                {content.text || <span className="text-slate-300 italic">No text content</span>}
              </p>
            </div>
          </div>
        ) : content.type === 'video' ? (
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
        ) : content.type === 'grammar_table' ? (
          <div className="px-6 py-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Grammar Table (student view)
            </p>
            <div className="bg-slate-50 rounded-xl border border-slate-100 px-5 py-4 max-h-56 overflow-y-auto space-y-2">
              {content.grammarTable.whenToUse && (
                <p className="text-xs text-orange-600 font-semibold mb-2">{content.grammarTable.whenToUse}</p>
              )}
              {content.grammarTable.rows.length === 0 ? (
                <p className="text-slate-300 italic text-sm">No rows yet</p>
              ) : (
                content.grammarTable.rows.map((row, i) => (
                  <div key={i} className="text-sm border-b border-slate-100 last:border-0 pb-2 last:pb-0">
                    <p className="font-semibold text-slate-800">{row.form}</p>
                    <p className="text-slate-500 italic">{row.example}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="px-6 py-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Vocabulary Cards (student view)
            </p>
            <div className="bg-slate-50 rounded-xl border border-slate-100 px-5 py-4 max-h-56 overflow-y-auto space-y-2">
              {content.vocabCards.whenToUse && (
                <p className="text-xs text-orange-600 font-semibold mb-2">{content.vocabCards.whenToUse}</p>
              )}
              {content.vocabCards.cards.length === 0 ? (
                <p className="text-slate-300 italic text-sm">No cards yet</p>
              ) : (
                content.vocabCards.cards.map((card, i) => (
                  <div key={i} className="text-sm border-b border-slate-100 last:border-0 pb-2 last:pb-0">
                    <p className="font-semibold text-slate-800">{card.word} <span className="text-xs font-normal text-slate-400">({card.pos})</span></p>
                    <p className="text-slate-500">{card.definition}</p>
                  </div>
                ))
              )}
            </div>
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

      {/* ── Discussion Questions section ── */}
      {hasDiscussion && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
            <MessageSquare className="w-4 h-4 text-orange-500 shrink-0" />
            <span className="text-sm font-semibold text-slate-700">Discussion Questions</span>
            <span className="ml-auto text-xs text-slate-400">
              {state.discussionIndex !== null ? `${state.discussionIndex + 1} / ${content.discussionQuestions.length}` : `${content.discussionQuestions.length} question${content.discussionQuestions.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          <div className="px-5 py-4 space-y-3">
            {!inDiscussion ? (
              <>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {content.discussionQuestions.map((q, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-xs font-bold text-orange-400 shrink-0 mt-0.5">Q{i + 1}</span>
                      <span className="leading-relaxed">{q}</span>
                    </div>
                  ))}
                </div>
                <button onClick={wrap(onStartDiscussion)} disabled={isBusy}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold text-sm transition-colors">
                  <MessageSquare className="w-4 h-4" />Start Discussion
                </button>
              </>
            ) : (
              <>
                {/* Current question display */}
                <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                  <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wide mb-1">
                    Question {(state.discussionIndex ?? 0) + 1} of {content.discussionQuestions.length}
                  </p>
                  <p className="text-sm font-semibold text-slate-800 leading-relaxed">{currentQuestion}</p>
                </div>
                <div className="flex gap-2">
                  {!isLastQuestion ? (
                    <button onClick={wrap(onNextQuestion)} disabled={isBusy}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold text-sm transition-colors">
                      Next question <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button onClick={wrap(onEndDiscussion)} disabled={isBusy}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-600 hover:bg-slate-700 disabled:opacity-40 text-white font-bold text-sm transition-colors">
                      <Check className="w-4 h-4" />End Discussion
                    </button>
                  )}
                </div>
                {/* All questions at a glance */}
                <div className="space-y-1">
                  {content.discussionQuestions.map((q, i) => (
                    <div key={i} className={`flex items-start gap-2 text-xs px-2 py-1 rounded-lg ${i === state.discussionIndex ? 'bg-orange-50 text-orange-700 font-semibold' : i < (state.discussionIndex ?? 0) ? 'text-slate-400 line-through' : 'text-slate-500'}`}>
                      <span className="font-bold shrink-0">{i + 1}.</span>
                      <span className="leading-relaxed truncate">{q}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── True/False section ── */}
      {hasTF && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
            <ToggleLeft className="w-4 h-4 text-orange-500 shrink-0" />
            <span className="text-sm font-semibold text-slate-700">True / False Comprehension</span>
            <span className="ml-auto text-xs text-slate-400">
              {state.tfIndex !== null ? `${state.tfIndex + 1} / ${content.trueFalseCards.length}` : `${content.trueFalseCards.length} card${content.trueFalseCards.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          <div className="px-5 py-4 space-y-3">
            {!inTF ? (
              <button onClick={wrap(onStartTF)} disabled={isBusy}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold text-sm transition-colors">
                <ToggleLeft className="w-4 h-4" />Start Comprehension Check
              </button>
            ) : (
              <>
                {/* Current T/F card */}
                {currentTFCard && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                      Card {(state.tfIndex ?? 0) + 1} of {content.trueFalseCards.length}
                    </p>
                    <p className="text-sm font-semibold text-slate-800 leading-relaxed">{currentTFCard.statement}</p>

                    {/* Vote counts */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                        <span className="text-xs font-bold text-emerald-700">TRUE</span>
                        <span className="text-sm font-extrabold text-emerald-700">{tfTrueCount}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200">
                        <span className="text-xs font-bold text-rose-700">FALSE</span>
                        <span className="text-sm font-extrabold text-rose-700">{tfFalseCount}</span>
                      </div>
                      <span className="text-xs text-slate-400 ml-auto">{tfVoteCount}/{totalCount} voted</span>
                    </div>

                    {/* Answer reveal */}
                    {state.tfRevealed && (
                      <div className={`rounded-xl px-4 py-2.5 text-center font-bold text-sm ${currentTFCard.isTrue ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'}`}>
                        Answer: {currentTFCard.isTrue ? 'TRUE ✓' : 'FALSE ✗'}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  {!state.tfRevealed ? (
                    <button onClick={wrap(onRevealTF)} disabled={isBusy}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold text-sm transition-colors">
                      <Eye className="w-4 h-4" />Reveal Answer
                    </button>
                  ) : !isLastTFCard ? (
                    <button onClick={wrap(onNextTFCard)} disabled={isBusy}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold text-sm transition-colors">
                      Next card <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold">
                      <Check className="w-4 h-4" />Comprehension check done!
                    </div>
                  )}
                </div>

                {/* Card list */}
                <div className="space-y-1">
                  {content.trueFalseCards.map((card, i) => (
                    <div key={i} className={`flex items-center gap-2 text-xs px-2 py-1 rounded-lg ${i === state.tfIndex ? 'bg-orange-50 text-slate-700 font-semibold' : i < (state.tfIndex ?? 0) ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span className={`font-bold px-1.5 rounded shrink-0 ${card.isTrue ? 'text-emerald-600' : 'text-rose-600'}`}>{card.isTrue ? 'T' : 'F'}</span>
                      <span className="leading-relaxed truncate">{card.statement}</span>
                      {i < (state.tfIndex ?? 0) && <ChevronLeft className="w-3 h-3 ml-auto shrink-0 text-slate-300" />}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
