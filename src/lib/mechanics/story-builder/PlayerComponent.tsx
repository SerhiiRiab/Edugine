'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { StoryBuilderState, StorySentence, StoryWordEntry } from './types'
import { BookOpen, Check, Send, Trophy } from 'lucide-react'

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-sky-500',
]
function avatarBg(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function findNewWords(text: string, wordBank: StoryWordEntry[], alreadyUsed: string[]): string[] {
  const result: string[] = []
  for (const entry of wordBank) {
    const key = entry.word.toLowerCase()
    if (alreadyUsed.includes(key)) continue
    const re = new RegExp(`\\b${escapeRegex(entry.word)}\\b`, 'i')
    if (re.test(text)) result.push(key)
  }
  return result
}

export interface StoryBuilderPlayerPanelProps {
  sessionId: string
  activityIndex: number
  participantId: string
  nickname: string
  storyState: StoryBuilderState
  participants: { id: string; nickname: string }[]
  channelRef: { current: RealtimeChannel | null }
  onStateUpdate: (newState: StoryBuilderState) => void
  typingUser?: { participantId: string; name: string } | null
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
  typingUser,
}: StoryBuilderPlayerPanelProps) {
  const [inputText, setInputText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const storyEndRef = useRef<HTMLDivElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)

  const teamScore = storyState.teamScore ?? 0
  const usedWords = storyState.usedWords ?? []
  const hasWordBank = storyState.wordBank.length > 0
  const usedCount = storyState.wordBank.filter(w => w.used).length
  const totalWords = storyState.wordBank.length

  const myPosition = storyState.turnOrder.indexOf(participantId)
  const isMyTurn = storyState.currentTurnIndex === myPosition && myPosition >= 0
  const currentPlayerId = storyState.turnOrder[storyState.currentTurnIndex] ?? null
  const currentPlayerName = participants.find(p => p.id === currentPlayerId)?.nickname
    ?? (currentPlayerId === participantId ? nickname : 'Someone')

  const broadcastTyping = useCallback((isTyping: boolean) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing_indicator',
      payload: { participantId, name: nickname, isTyping },
    })
    isTypingRef.current = isTyping
  }, [channelRef, participantId, nickname])

  function handleInputChange(value: string) {
    setInputText(value)
    if (!isMyTurn) return
    if (!isTypingRef.current) broadcastTyping(true)
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => broadcastTyping(false), 2500)
  }

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      if (isTypingRef.current) broadcastTyping(false)
    }
  }, [broadcastTyping])

  function insertWord(word: string) {
    if (!isMyTurn) return
    const trimmed = inputText.trimEnd()
    setInputText(trimmed ? `${trimmed} ${word} ` : `${word} `)
  }

  async function handleSubmit() {
    const text = inputText.trim()
    if (!text || !isMyTurn || isSubmitting) return

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    if (isTypingRef.current) broadcastTyping(false)

    setIsSubmitting(true)
    setInputText('')

    const newlyUsed = findNewWords(text, storyState.wordBank, usedWords)
    const newUsedWords = [...usedWords, ...newlyUsed]
    const newTeamScore = teamScore + newlyUsed.length * 10
    const newWordBank = storyState.wordBank.map(w => ({
      ...w,
      used: newUsedWords.includes(w.word.toLowerCase()),
    }))

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
      wordBank: newWordBank,
      usedWords: newUsedWords,
      teamScore: newTeamScore,
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

      setTimeout(() => storyEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch {
      setInputText(text)
      onStateUpdate(storyState)
    } finally {
      setIsSubmitting(false)
    }
  }

  const showTypingIndicator = typingUser
    && typingUser.participantId !== participantId
    && !isMyTurn

  // ── Finish screen ────────────────────────────────────────────────────────────
  if (storyState.status === 'finished') {
    return (
      <div className="flex-1 overflow-y-auto bg-slate-900 flex flex-col">
        {/* Header */}
        <div className="text-center px-6 pt-8 pb-4">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.6 }}
            className="text-5xl mb-3"
          >
            🎉
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-2xl font-bold text-white mb-1"
          >
            Story Complete!
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-slate-400 text-sm"
          >
            Your teacher will continue the lesson
          </motion.p>
        </div>

        {/* Team score */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mx-4 mb-3 bg-gradient-to-r from-violet-900/60 to-purple-900/60
            border border-violet-700/50 rounded-2xl px-5 py-4 flex items-center gap-4"
        >
          <Trophy className="w-8 h-8 text-yellow-400 shrink-0" />
          <div>
            <p className="text-xs text-violet-300 font-semibold uppercase tracking-wide">Team Score</p>
            <p className="text-3xl font-bold text-white">{teamScore} <span className="text-lg text-violet-300">pts</span></p>
          </div>
        </motion.div>

        {/* Words used */}
        {hasWordBank && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="mx-4 mb-3 bg-slate-800/60 border border-slate-700 rounded-2xl px-5 py-4"
          >
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-3">
              Target Words — {usedCount}/{totalWords} used
            </p>
            <div className="flex flex-wrap gap-2">
              {storyState.wordBank.map((w, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                    w.used
                      ? 'bg-emerald-900/60 border-emerald-600 text-emerald-300'
                      : 'bg-slate-700/50 border-slate-600 text-slate-500'
                  }`}
                >
                  {w.used && <Check className="w-3 h-3" />}
                  {w.word}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Full story */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mx-4 mb-6 bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden"
        >
          <div className="px-5 py-3 border-b border-slate-700">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">
              The Story ({storyState.sentences.length} sentences)
            </p>
          </div>
          <div className="px-5 py-4 space-y-3 max-h-64 overflow-y-auto">
            {storyState.sentences.map((s, i) => {
              const isSelf = s.author_id === participantId
              const pIdx = participants.findIndex(p => p.id === s.author_id)
              return (
                <div key={i} className={`flex gap-2.5 ${isSelf ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center
                    text-[10px] font-bold text-white shrink-0 mt-0.5 ${avatarBg(pIdx >= 0 ? pIdx : i)}`}>
                    {s.author_name[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className={`max-w-[80%] flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] font-semibold text-slate-500 mb-0.5">
                      {isSelf ? 'You' : s.author_name}
                    </span>
                    <div className={`px-3 py-2 rounded-xl text-sm leading-relaxed ${
                      isSelf ? 'bg-violet-700/70 text-white' : 'bg-slate-700 text-slate-200'
                    }`}>
                      {s.text}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Active screen ────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col gap-0 overflow-hidden">

      {/* Team score bar */}
      {(hasWordBank || teamScore > 0) && (
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-bold text-white">Team: {teamScore} pts</span>
          </div>
          {hasWordBank && (
            <span className="text-xs text-slate-400 font-medium">
              Words: {usedCount}/{totalWords}
            </span>
          )}
        </div>
      )}

      {/* Prompt banner */}
      <div className="px-4 pt-3 pb-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-start gap-2">
          <BookOpen className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <p className="text-sm text-slate-300 leading-relaxed">
            {storyState.prompt || 'Tell a story together...'}
          </p>
        </div>
      </div>

      {/* Word bank */}
      {hasWordBank && (
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">
            Word Bank — click to insert
          </p>
          <div className="flex flex-wrap gap-2">
            {storyState.wordBank.map((w, i) => (
              <button
                key={i}
                type="button"
                disabled={!isMyTurn || w.used}
                onClick={() => insertWord(w.word)}
                className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5
                  rounded-full border transition-all duration-300 ${
                  w.used
                    ? 'bg-emerald-900/50 border-emerald-700 text-emerald-400 cursor-default'
                    : isMyTurn
                    ? 'bg-emerald-900/40 border-emerald-700 text-emerald-300 hover:bg-emerald-700/50 active:scale-95'
                    : 'bg-slate-800 border-slate-700 text-slate-500 cursor-default'
                }`}
              >
                {w.used && <Check className="w-3 h-3 text-emerald-400" />}
                {w.word}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Turn indicator */}
      <div className={`px-4 py-2.5 border-b ${
        isMyTurn ? 'bg-emerald-900/30 border-emerald-800/50' : 'bg-slate-800/50 border-slate-800'
      }`}>
        <div className={`text-sm font-semibold ${isMyTurn ? 'text-emerald-300' : 'text-slate-400'}`}>
          {isMyTurn
            ? '🟢 Your turn! Write the next sentence.'
            : `⏳ Waiting for ${currentPlayerName}...`}
        </div>
        {showTypingIndicator && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs text-slate-500">{typingUser!.name} is typing</span>
            <span className="flex gap-0.5">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full bg-slate-500 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
                />
              ))}
            </span>
          </div>
        )}
      </div>

      {/* Story feed */}
      <div className="flex-1 overflow-y-auto px-4 py-3 bg-slate-900/50">
        {storyState.sentences.length === 0 && (
          <div className="py-8 text-center">
            <div className="text-3xl mb-2">📖</div>
            <p className="text-slate-500 text-sm">The story is just beginning...</p>
          </div>
        )}
        <div className="space-y-3">
          <AnimatePresence>
            {storyState.sentences.map((s, i) => {
              const isSelf = s.author_id === participantId
              const pIdx = participants.findIndex(p => p.id === s.author_id)
              return (
                <motion.div
                  key={s.ts + i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
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
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
        <div ref={storyEndRef} />
      </div>

      {/* Input area */}
      <div className="px-4 py-3 bg-slate-900 border-t border-slate-800">
        <div className="flex gap-2">
          <textarea
            value={inputText}
            onChange={(e) => handleInputChange(e.target.value)}
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
