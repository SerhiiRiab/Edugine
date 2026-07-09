'use client'

import { useEffect, useRef, useState } from 'react'
import { RotateCcw, LayoutDashboard, Smartphone, Play, Bell } from 'lucide-react'

interface Topic {
  topic: string
  context: string
}

const TOPICS: Topic[] = [
  {
    topic: "Pitch your company's service to a new client",
    context: 'You have 60 seconds to convince a busy potential client that your service is worth a follow-up meeting.',
  },
  {
    topic: 'Pitch a budget increase to a skeptical CFO',
    context: 'You have 60 seconds to make the financial case before the decision is final.',
  },
]

const USEFUL_PHRASES = [
  'We specialize in...',
  'Unlike other providers, we...',
  'Our clients typically see [result] within [timeframe]...',
  'What makes us different is...',
]

const PARTICIPANTS = ['You', 'Alex', 'Maria']

const TIME_LIMIT = 60

function playBeep() {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.35)
    osc.onended = () => ctx.close()
  } catch {
    // audio unavailable — the visual "Time's up!" indication still shows
  }
}

export function ElevatorPitchDemo() {
  const [activeSpeaker, setActiveSpeaker] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT)
  const [running, setRunning] = useState(false)
  const [timesUp, setTimesUp] = useState(false)
  const beepedRef = useRef(false)

  const topic = TOPICS[activeSpeaker % TOPICS.length]

  useEffect(() => {
    if (!running) return
    if (timeLeft <= 0) {
      if (!beepedRef.current) {
        beepedRef.current = true
        playBeep()
      }
      setRunning(false)
      setTimesUp(true)
      return
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [running, timeLeft])

  function handleStart() {
    if (running) return
    beepedRef.current = false
    setTimesUp(false)
    setTimeLeft(TIME_LIMIT)
    setRunning(true)
  }

  function handleNextSpeaker() {
    setActiveSpeaker((i) => (i + 1) % PARTICIPANTS.length)
    setRunning(false)
    setTimesUp(false)
    setTimeLeft(TIME_LIMIT)
    beepedRef.current = false
  }

  function handleReset() {
    setActiveSpeaker(0)
    setRunning(false)
    setTimesUp(false)
    setTimeLeft(TIME_LIMIT)
    beepedRef.current = false
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-6">
        <p className="text-slate-400 text-xs">Try the demo below — no sign-up needed</p>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-violet-600
            border border-slate-200 hover:border-violet-200 rounded-lg px-3 py-1.5 transition-colors shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset demo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Tutor View */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LayoutDashboard className="w-4 h-4 text-violet-500" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">What the tutor sees</span>
          </div>
          <h3 className="font-bold text-slate-800 mb-4">Tutor View</h3>

          <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Topic</p>
            <p className="text-slate-700 font-semibold leading-relaxed mb-1">{topic.topic}</p>
            <p className="text-slate-500 text-sm leading-relaxed mb-4">{topic.context}</p>

            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Participants</p>
            <div className="space-y-2 mb-5">
              {PARTICIPANTS.map((name, i) => (
                <div
                  key={name}
                  className={`flex items-center justify-between rounded-lg border p-2.5 transition-colors ${
                    i === activeSpeaker ? 'border-violet-300 bg-violet-50/60' : 'border-slate-100 bg-white'
                  }`}
                >
                  <span className="text-sm font-semibold text-slate-700">{name}</span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      i === activeSpeaker ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {i === activeSpeaker ? 'Presenting' : 'Waiting'}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div
                className={`w-14 h-14 rounded-full bg-white border-2 flex items-center justify-center shrink-0 ${
                  timesUp ? 'border-rose-300' : 'border-violet-200'
                }`}
              >
                <span className={`text-lg font-bold ${timesUp ? 'text-rose-500' : 'text-violet-600'}`}>{timeLeft}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Timer</p>
                <p className="text-sm text-slate-600">
                  {timesUp ? "Time's up!" : running ? 'Presenting…' : 'Not started'}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleStart}
                disabled={running}
                className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200
                  disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                {running ? 'Running…' : 'Start'}
              </button>
              <button
                type="button"
                onClick={handleNextSpeaker}
                className="inline-flex items-center gap-1.5 border border-slate-200 hover:border-violet-200 hover:text-violet-600
                  text-slate-600 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
              >
                Next Speaker
              </button>
            </div>
          </div>
        </div>

        {/* Student View */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-4 h-4 text-violet-500" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">What the student sees</span>
          </div>
          <h3 className="font-bold text-slate-800 mb-4">Student View</h3>

          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 min-h-[260px] flex flex-col">
            <p className="text-white font-bold text-lg leading-relaxed text-center mb-2">{topic.topic}</p>
            <p className="text-slate-300 text-sm leading-relaxed text-center mb-5">{topic.context}</p>

            <div className="flex flex-col items-center mb-5">
              <div
                className={`w-16 h-16 rounded-full bg-slate-900/60 border-2 flex items-center justify-center mb-2 transition-colors ${
                  timesUp ? 'border-rose-400' : 'border-violet-400'
                }`}
              >
                <span className={`text-xl font-bold ${timesUp ? 'text-rose-400' : 'text-white'}`}>{timeLeft}</span>
              </div>
              {timesUp && (
                <p className="flex items-center gap-1.5 text-rose-300 font-semibold text-sm">
                  <Bell className="w-4 h-4" />
                  Time&rsquo;s up!
                </p>
              )}
            </div>

            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 mt-auto">Useful Phrases</p>
            <div className="flex flex-wrap gap-1.5">
              {USEFUL_PHRASES.map((phrase) => (
                <span
                  key={phrase}
                  className="text-xs bg-slate-700 border border-slate-600 text-slate-300 rounded-full px-2.5 py-1"
                >
                  {phrase}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
