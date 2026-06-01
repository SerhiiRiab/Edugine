'use client'

import { useState, useTransition } from 'react'
import { Plus, X } from 'lucide-react'
import { createProgram } from '@/lib/actions/programs'

export function ProgramsPageClient({ primary }: { primary?: boolean }) {
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!title.trim()) return
    startTransition(async () => {
      try { await createProgram(title.trim(), description.trim() || undefined) }
      catch { /* redirect expected */ }
    })
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-2 font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm ${
          primary
            ? 'bg-violet-600 hover:bg-violet-700 text-white'
            : 'bg-violet-600 hover:bg-violet-700 text-white'
        }`}
      >
        <Plus className="w-4 h-4" />
        Create Program
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-lg">New Program</h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                  placeholder='e.g. "B2 Speaking Course"'
                  maxLength={100}
                  className="w-full rounded-xl border-2 border-slate-200 focus:border-violet-400 focus:ring-2
                    focus:ring-violet-400/20 outline-none px-3 py-2.5 text-sm transition-colors
                    placeholder:text-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Optional description…"
                  maxLength={500}
                  rows={3}
                  className="w-full rounded-xl border-2 border-slate-200 focus:border-violet-400 focus:ring-2
                    focus:ring-violet-400/20 outline-none px-3 py-2.5 text-sm resize-none transition-colors
                    placeholder:text-slate-300"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500
                  hover:bg-slate-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!title.trim() || isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700
                  text-white text-sm font-semibold disabled:opacity-40 transition-colors"
              >
                {isPending ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
