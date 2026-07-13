'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, FileText, Video, MessageSquare, Table2, BookOpen } from 'lucide-react'
import type { RealtimeChannel } from '@supabase/supabase-js'
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
  channelRef: { current: RealtimeChannel | null }
}

export function ContentBlockPlayerPanel({ participantId, state, onGotIt, channelRef }: ContentBlockPlayerPanelProps) {
  const [gotIt, setGotIt] = useState(false)
  const [myTFVote, setMyTFVote] = useState<boolean | null>(null)
  const { content } = state

  // Reset T/F vote when card changes
  useEffect(() => {
    setMyTFVote(null)
  }, [state.tfIndex])

  // Sync gotIt with state (handles reconnect)
  useEffect(() => {
    if (state.viewedByParticipantIds.includes(participantId)) {
      setGotIt(true)
    }
  }, [state.viewedByParticipantIds, participantId])

  function handleGotIt() {
    if (gotIt) return
    setGotIt(true)
    onGotIt()
  }

  function sendTFVote(vote: boolean) {
    if (myTFVote !== null) return
    setMyTFVote(vote)
    channelRef.current?.send({
      type: 'broadcast',
      event: 'content_block_tf_vote',
      payload: { participantId, vote },
    })
  }

  const inDiscussion = state.discussionIndex !== null
  const inTF = state.tfIndex !== null
  const currentQuestion = inDiscussion && state.discussionIndex !== null
    ? content.discussionQuestions[state.discussionIndex] ?? null
    : null
  const currentTFCard = inTF && state.tfIndex !== null
    ? content.trueFalseCards[state.tfIndex] ?? null
    : null

  return (
    <div className="flex-1 flex flex-col bg-slate-900 overflow-y-auto">

      {/* Type badge */}
      <div className="px-4 py-2.5 border-b border-slate-800 flex items-center gap-2">
        {content.type === 'text'
          ? <><FileText className="w-3.5 h-3.5 text-orange-400" /><span className="text-xs font-semibold text-slate-400">Reading</span></>
          : content.type === 'video'
          ? <><Video className="w-3.5 h-3.5 text-orange-400" /><span className="text-xs font-semibold text-slate-400">Video</span></>
          : content.type === 'grammar_table'
          ? <><Table2 className="w-3.5 h-3.5 text-orange-400" /><span className="text-xs font-semibold text-slate-400">Grammar</span></>
          : <><BookOpen className="w-3.5 h-3.5 text-orange-400" /><span className="text-xs font-semibold text-slate-400">Vocabulary</span></>
        }
      </div>

      {/* ── T/F phase (takes over screen) ── */}
      {inTF && currentTFCard && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-5 py-8">
          <div className="text-center space-y-1">
            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wide">
              Card {(state.tfIndex ?? 0) + 1} of {content.trueFalseCards.length}
            </p>
            <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">True or False?</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-2xl px-5 py-5 w-full max-w-sm text-center">
            <p className="text-white font-semibold text-base leading-relaxed">{currentTFCard.statement}</p>
          </div>

          {state.tfRevealed ? (
            <div className={`w-full max-w-sm rounded-2xl px-5 py-4 text-center space-y-1 ${currentTFCard.isTrue ? 'bg-emerald-900/40 border border-emerald-600/50' : 'bg-rose-900/40 border border-rose-600/50'}`}>
              <p className={`text-2xl font-extrabold ${currentTFCard.isTrue ? 'text-emerald-300' : 'text-rose-300'}`}>
                {currentTFCard.isTrue ? 'TRUE ✓' : 'FALSE ✗'}
              </p>
              {myTFVote !== null && (
                <p className={`text-xs font-semibold ${myTFVote === currentTFCard.isTrue ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {myTFVote === currentTFCard.isTrue ? 'You got it right!' : 'You got it wrong'}
                </p>
              )}
            </div>
          ) : myTFVote !== null ? (
            <div className="flex items-center gap-2 py-3 text-slate-400 text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Vote submitted — waiting for reveal…
            </div>
          ) : (
            <div className="flex gap-3 w-full max-w-sm">
              <button onClick={() => sendTFVote(true)}
                className="flex-1 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.97]
                  text-white font-extrabold text-lg transition-all shadow-md">
                TRUE
              </button>
              <button onClick={() => sendTFVote(false)}
                className="flex-1 py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-[0.97]
                  text-white font-extrabold text-lg transition-all shadow-md">
                FALSE
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Discussion phase ── */}
      {!inTF && inDiscussion && currentQuestion && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-5 py-8">
          <div className="text-center space-y-1">
            <MessageSquare className="w-6 h-6 text-orange-400 mx-auto" />
            <p className="text-xs font-semibold text-orange-400 uppercase tracking-wide">
              Discussion — Question {(state.discussionIndex ?? 0) + 1} of {content.discussionQuestions.length}
            </p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl px-5 py-5 w-full max-w-sm text-center">
            <p className="text-white font-semibold text-base leading-relaxed">{currentQuestion}</p>
          </div>
          <p className="text-slate-500 text-xs text-center">Discuss with your class!</p>
        </div>
      )}

      {/* ── Content phase (default) ── */}
      {!inTF && !inDiscussion && (
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
          ) : content.type === 'video' ? (
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
          ) : content.type === 'grammar_table' ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="bg-slate-800/60 rounded-2xl border border-slate-700/60 px-5 sm:px-7 py-6"
            >
              {content.grammarTable.whenToUse && (
                <div className="flex items-start gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3 mb-5">
                  <Table2 className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <p className="text-orange-200 text-sm leading-relaxed">{content.grammarTable.whenToUse}</p>
                </div>
              )}
              {content.grammarTable.rows.length === 0 ? (
                <p className="text-slate-500 italic">No rows yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-separate border-spacing-y-2">
                    <thead>
                      <tr className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                        <th className="pb-1 pr-4">Form</th>
                        <th className="pb-1 pr-4">Example</th>
                        <th className="pb-1">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {content.grammarTable.rows.map((row, i) => (
                        <tr key={i} className="bg-slate-900/50 align-top">
                          <td className="rounded-l-xl px-3 py-3 text-white font-semibold whitespace-pre-wrap">{row.form}</td>
                          <td className="px-3 py-3 text-slate-300 italic whitespace-pre-wrap">{row.example}</td>
                          <td className="rounded-r-xl px-3 py-3 text-slate-400 text-sm whitespace-pre-wrap">{row.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              {content.vocabCards.whenToUse && (
                <div className="flex items-start gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3 mb-5">
                  <BookOpen className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <p className="text-orange-200 text-sm leading-relaxed">{content.vocabCards.whenToUse}</p>
                </div>
              )}
              {content.vocabCards.cards.length === 0 ? (
                <p className="text-slate-500 italic">No cards yet</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {content.vocabCards.cards.map((card, i) => (
                    <div key={i} className="bg-slate-800/60 rounded-2xl border border-slate-700/60 px-5 py-4">
                      <div className="flex items-baseline gap-2 mb-1.5">
                        <span className="text-white font-bold text-lg">{card.word}</span>
                        {card.pos && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-orange-300 bg-orange-500/10 rounded-full px-2 py-0.5">
                            {card.pos}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed">{card.definition}</p>
                      {card.example && (
                        <p className="text-slate-500 text-sm italic mt-1.5">&ldquo;{card.example}&rdquo;</p>
                      )}
                    </div>
                  ))}
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
      )}
    </div>
  )
}
