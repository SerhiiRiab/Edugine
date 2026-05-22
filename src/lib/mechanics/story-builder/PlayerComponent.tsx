'use client'

import { useState, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { StoryBuilderState, StorySentence } from './types'
import { BookOpen, Send } from 'lucide-react'

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-sky-500',
]
function avatarBg(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }

export interface StoryBuilderPlayerPanelProps {
  sessionId: string
  activityIndex: number
  participantId: string
  nickname: string
  storyState: StoryBuilderState
  participants: { id: string; nickname: string }[]
  channelRef: { current: RealtimeChannel | null }
  onStateUpdate: (newState: StoryBuilderState) => void
}

export function StoryBuilderPlayerPanel({
  sessionId,
  activityIndex,
  participantId,
  nickname,
  storyState,
  participants,
  channelRef,
  onStateUpdate,
}: StoryBuilderPlayerPanelProps) {
  const [inputText, setInputText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const storyEndRef = useRef<HTMLDivElement>(null)

  const myPosition = storyState.turnOrder.indexOf(participantId)
  const isMyTurn = storyState.currentTurnIndex === myPosition && myPosition >= 0
  const currentPlayerId = storyState.turnOrder[storyState.currentTurnIndex] ?? null
  const currentPlayerName = participants.find(p => p.id === currentPlayerId)?.nickname
    ?? (currentPlayerId === participantId ? nickname : 'Someone')

  function insertWord(word: string) {
    if (!isMyTurn) return
    const trimmed = inputText.trimEnd()
    setInputText(trimmed ? `${trimmed} ${word} ` : `${word} `)
  }

  async function handleSubmit() {
    const text = inputText.trim()
    if (!text || !isMyTurn || isSubmitting) return

    setIsSubmitting(true)
    setInputText('')

    const newSentence: StorySentence = {
      author_id: participantId,
      author_name: nickname,
      text,
      ts: new Date().toISOString(),
    }

    const newTurnIndex = (storyState.currentTurnIndex + 1) % Math.max(storyState.turnOrder.length, 1)
    const newState: StoryBuilderState = {
      ...storyState,
      sentences: [...storyState.sentences, newSentence],
      currentTurnIndex: newTurnIndex,
    }

    try {
      const supabase = createClient()
      await supabase.from('shared_activity_state')
        .update({ state: newState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
        .eq('session_id', sessionId)
        .eq('activity_index', activityIndex)

      onStateUpdate(newState)

      channelRef.current?.send({
        type: 'broadcast',
        event: 'story_state_update',
        payload: { state: newState, participantId },
      })

      // scroll to bottom of story feed
      setTimeout(() => storyEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch {
      // restore on failure
      setInputText(text)
      onStateUpdate(storyState)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col gap-0 overflow-hidden">

      {/* Prompt banner */}
      <div className="px-4 pt-4 pb-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-start gap-2">
          <BookOpen className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <p className="text-sm text-slate-300 leading-relaxed">
            {storyState.prompt || 'Tell a story together...'}
          </p>
        </div>
      </div>

      {/* Word bank */}
      {storyState.wordBank.length > 0 && (
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">
            Word Bank — click to insert
          </p>
          <div className="flex flex-wrap gap-2">
            {storyState.wordBank.map((w, i) => (
              <button
                key={i}
                type="button"
                disabled={!isMyTurn}
                onClick={() => insertWord(w.word)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                  isMyTurn
                    ? 'bg-emerald-900/40 border-emerald-700 text-emerald-300 hover:bg-emerald-700/50 active:scale-95'
                    : 'bg-slate-800 border-slate-700 text-slate-500 cursor-default'
                }`}
              >
                {w.word}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Turn indicator */}
      <div className={`px-4 py-2.5 text-sm font-semibold border-b ${
        isMyTurn
          ? 'bg-emerald-900/30 border-emerald-800/50 text-emerald-300'
          : 'bg-slate-800/50 border-slate-800 text-slate-400'
      }`}>
        {isMyTurn
          ? '🟢 Your turn! Write the next sentence.'
          : `⏳ Waiting for ${currentPlayerName}...`
        }
      </div>

      {/* Story feed */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-slate-900/50">
        {storyState.sentences.length === 0 ? (
          <div className="py-8 text-center">
            <div className="text-3xl mb-2">📖</div>
            <p className="text-slate-500 text-sm">The story is just beginning...</p>
          </div>
        ) : (
          storyState.sentences.map((s, i) => {
            const isSelf = s.author_id === participantId
            const pIdx = participants.findIndex(p => p.id === s.author_id)
            return (
              <div
                key={i}
                className={`flex gap-2.5 ${isSelf ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center
                  text-xs font-bold text-white shrink-0 mt-0.5
                  ${avatarBg(pIdx >= 0 ? pIdx : i)}`}>
                  {s.author_name[0]?.toUpperCase() ?? '?'}
                </div>
                <div className={`max-w-[80%] ${isSelf ? 'items-end' : 'items-start'} flex flex-col`}>
                  <span className={`text-[10px] font-semibold text-slate-500 mb-0.5 ${isSelf ? 'text-right' : ''}`}>
                    {isSelf ? 'You' : s.author_name}
                  </span>
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isSelf
                      ? 'bg-violet-600 text-white rounded-tr-sm'
                      : 'bg-slate-800 text-slate-200 rounded-tl-sm'
                  }`}>
                    {s.text}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={storyEndRef} />
      </div>

      {/* Input area */}
      <div className="px-4 py-3 bg-slate-900 border-t border-slate-800">
        <div className="flex gap-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder={
              isMyTurn
                ? 'Write the next sentence...'
                : `Waiting for ${currentPlayerName} to write...`
            }
            disabled={!isMyTurn || isSubmitting}
            rows={2}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5
              text-white placeholder:text-slate-600 text-sm resize-none outline-none
              focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isMyTurn || !inputText.trim() || isSubmitting}
            className="flex items-center justify-center w-11 h-11 self-end
              bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed
              rounded-xl text-white transition-colors active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-slate-600 mt-1.5">
          Press Enter to submit · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
