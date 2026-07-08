'use client'

import { useState } from 'react'
import { RotateCcw, LayoutDashboard, Smartphone, Lock } from 'lucide-react'

const SCENARIO = 'A mid-project client meeting. Both sides need to walk away with a plan for the next phase.'

interface Role {
  name: string
  claimedBy: string
  color: string
  description: string
  secretGoal: string
}

const ROLES: Role[] = [
  {
    name: 'Lead Consultant',
    claimedBy: 'Alex',
    color: 'bg-blue-500',
    description: 'You believe the project is on track.',
    secretGoal: 'Avoid revealing the budget has been cut.',
  },
  {
    name: 'Client Representative',
    claimedBy: 'Maria',
    color: 'bg-teal-500',
    description: 'You have concerns about the timeline.',
    secretGoal: 'Push for a 2-week extension without revealing your board deadline.',
  },
]

export function RoleplayQuestDemo() {
  const [activeRole, setActiveRole] = useState(0)
  const role = ROLES[activeRole]

  function handleReset() {
    setActiveRole(0)
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
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Scenario (visible to all)</p>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">{SCENARIO}</p>

            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Roles claimed</p>
            <div className="space-y-2">
              {ROLES.map((r, i) => (
                <div
                  key={r.name}
                  className={`flex items-center gap-3 rounded-lg border p-2.5 transition-colors ${
                    i === activeRole ? 'border-violet-300 bg-violet-50/60' : 'border-slate-100 bg-white'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-full ${r.color} text-white text-xs font-bold flex items-center justify-center shrink-0`}
                  >
                    {r.claimedBy[0]}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700">{r.claimedBy}</p>
                    <p className="text-xs text-slate-400 truncate">{r.name}</p>
                  </div>
                </div>
              ))}
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

          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 min-h-[220px] flex flex-col">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Scenario</p>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">{SCENARIO}</p>

            <div className="mt-auto bg-slate-900/60 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Lock className="w-3 h-3 text-violet-300" />
                <p className="text-xs font-bold uppercase tracking-wide text-violet-300">
                  Private role — only {role.claimedBy} sees this
                </p>
              </div>
              <p className="text-white font-bold mb-1">{role.name}</p>
              <p className="text-slate-300 text-sm leading-relaxed mb-3">{role.description}</p>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Secret goal</p>
              <p className="text-amber-300 text-sm leading-relaxed">{role.secretGoal}</p>
            </div>

            <button
              type="button"
              onClick={() => setActiveRole((r) => (r === 0 ? 1 : 0))}
              className="mt-4 inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20
                text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors self-start"
            >
              Switch role view
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
