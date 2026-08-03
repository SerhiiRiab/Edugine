'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, ChevronUp, User, Users, BarChart2, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { updateActivity } from '@/lib/actions/lessons'
import { INDIVIDUAL_ONLY, SHARED_ONLY, VOTE_CAPABLE, TIMER_SUPPORTED } from '@/lib/mechanics/activity-mode-capabilities'
import { DEFAULT_RIGHT_LABEL, DEFAULT_LEFT_LABEL } from '@/lib/mechanics/swipe-battle/types'

interface Props {
  activityId: string
  mechanicId: string
  initialMode: 'individual' | 'shared' | 'vote'
  initialConfig: Record<string, unknown>
}

export function ActivitySettingsPanel({ activityId, mechanicId, initialMode, initialConfig }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [mode, setMode] = useState(initialMode)
  const [timerSeconds, setTimerSeconds] = useState(
    typeof initialConfig.timerSeconds === 'number' ? String(initialConfig.timerSeconds) : '',
  )
  const [instructions, setInstructions] = useState(
    typeof initialConfig.instructions === 'string' ? initialConfig.instructions : '',
  )
  const [rightLabel, setRightLabel] = useState(
    typeof initialConfig.rightLabel === 'string' ? initialConfig.rightLabel : '',
  )
  const [leftLabel, setLeftLabel] = useState(
    typeof initialConfig.leftLabel === 'string' ? initialConfig.leftLabel : '',
  )
  const [saving, startSaving] = useTransition()

  const indOnly = INDIVIDUAL_ONLY.has(mechanicId)
  const sharedOnly = SHARED_ONLY.has(mechanicId)
  const voteCap = VOTE_CAPABLE.has(mechanicId)
  const timerSupported = TIMER_SUPPORTED.has(mechanicId)

  function handleSave() {
    startSaving(async () => {
      try {
        const secs = timerSeconds ? parseInt(timerSeconds, 10) : null
        const cfg: Record<string, unknown> = {}
        if (secs && !isNaN(secs)) cfg.timerSeconds = secs
        if (instructions.trim()) cfg.instructions = instructions.trim()
        if (mechanicId === 'swipe_battle') {
          if (rightLabel.trim()) cfg.rightLabel = rightLabel.trim()
          if (leftLabel.trim()) cfg.leftLabel = leftLabel.trim()
        }
        await updateActivity(activityId, { mode, config: cfg })
        toast.success('Settings saved')
      } catch {
        toast.error('Failed to save settings')
      }
    })
  }

  return (
    <div className="max-w-3xl mx-auto px-6 pt-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <span>Settings</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {expanded && (
          <div className="px-5 pb-5 pt-4 border-t border-slate-100 space-y-5">
            {/* Mode */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">Mode</p>
              <div className="flex gap-2 max-w-md">
                {!sharedOnly && (
                  <button
                    type="button"
                    onClick={() => setMode('individual')}
                    className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      mode === 'individual'
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                        : 'border-slate-100 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <User className="w-4 h-4 shrink-0" /> Individual
                  </button>
                )}
                {voteCap && (
                  <button
                    type="button"
                    onClick={() => setMode('vote')}
                    className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      mode === 'vote'
                        ? 'border-amber-400 bg-amber-50 text-amber-700'
                        : 'border-slate-100 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <BarChart2 className="w-4 h-4 shrink-0" /> Vote
                  </button>
                )}
                {!indOnly && !voteCap && (
                  <button
                    type="button"
                    onClick={() => setMode('shared')}
                    className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      mode === 'shared'
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-slate-100 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <Users className="w-4 h-4 shrink-0" /> Shared
                  </button>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-2 max-w-md">
              <label className="text-sm font-semibold text-slate-700 block">
                Instructions{' '}
                <span className="text-slate-400 font-normal text-xs">optional</span>
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                maxLength={200}
                rows={2}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400
                  focus-visible:border-violet-400 resize-none transition-colors placeholder:text-slate-300"
              />
            </div>

            {/* Swipe meaning */}
            {mechanicId === 'swipe_battle' && (
              <div className="space-y-2 max-w-md">
                <label className="text-sm font-semibold text-slate-700 block">
                  Swipe meaning{' '}
                  <span className="text-slate-400 font-normal text-xs">optional — for standalone statement cards</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-emerald-600 font-medium">Swipe right means</label>
                    <input
                      type="text"
                      value={rightLabel}
                      onChange={(e) => setRightLabel(e.target.value)}
                      placeholder={DEFAULT_RIGHT_LABEL}
                      maxLength={40}
                      className="w-full mt-1 rounded-lg border border-input bg-transparent px-3 py-2 text-sm
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400
                        focus-visible:border-violet-400 transition-colors placeholder:text-slate-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-red-500 font-medium">Swipe left means</label>
                    <input
                      type="text"
                      value={leftLabel}
                      onChange={(e) => setLeftLabel(e.target.value)}
                      placeholder={DEFAULT_LEFT_LABEL}
                      maxLength={40}
                      className="w-full mt-1 rounded-lg border border-input bg-transparent px-3 py-2 text-sm
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400
                        focus-visible:border-violet-400 transition-colors placeholder:text-slate-300"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Timer */}
            {timerSupported && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">
                  Time limit{' '}
                  <span className="text-slate-400 font-normal text-xs">optional</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="10"
                    max="3600"
                    value={timerSeconds}
                    onChange={(e) => setTimerSeconds(e.target.value)}
                    placeholder="e.g. 120"
                    className="w-28 rounded-lg border border-input bg-transparent px-3 py-2 text-sm
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400
                      focus-visible:border-violet-400 transition-colors"
                  />
                  <span className="text-sm text-slate-400">seconds</span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50
                text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save settings
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
