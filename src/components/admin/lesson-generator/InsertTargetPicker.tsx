'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { MechanicId } from '@/lib/mechanics/types'
import { listInsertTargets, createInsertTargetSet } from '@/app/admin/lesson-generator/actions'

interface Target { id: string; title: string; itemCount: number }

interface Props {
  mechanicId: MechanicId
  value: string | null
  onChange: (setId: string) => void
  defaultTitle: string
}

export function InsertTargetPicker({ mechanicId, value, onChange, defaultTitle }: Props) {
  const [targets, setTargets] = useState<Target[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState(defaultTitle)
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listInsertTargets(mechanicId)
      .then(result => { if (!cancelled) setTargets(result) })
      .catch(() => toast.error('Failed to load content sets'))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [mechanicId])

  async function handleCreate() {
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      const created = await createInsertTargetSet(mechanicId, newTitle.trim())
      setTargets(prev => [{ id: created.id, title: created.title, itemCount: 0 }, ...prev])
      onChange(created.id)
      setShowNew(false)
    } catch {
      toast.error('Failed to create content set')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {loading ? (
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />Loading sets...
        </span>
      ) : showNew ? (
        <>
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
            placeholder="New content set title"
            className="text-xs text-slate-800 bg-white rounded-lg border border-slate-200
              focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none px-2.5 py-1.5 flex-1"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !newTitle.trim()}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700
              disabled:opacity-40 text-white transition-colors"
          >
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create'}
          </button>
          <button type="button" onClick={() => setShowNew(false)} className="text-xs text-slate-400 hover:text-slate-600">
            Cancel
          </button>
        </>
      ) : (
        <>
          <select
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="text-xs text-slate-800 bg-white rounded-lg border border-slate-200
              focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none px-2.5 py-1.5 flex-1"
          >
            <option value="" disabled>Choose a content set...</option>
            {targets.map(t => (
              <option key={t.id} value={t.id}>{t.title} ({t.itemCount} items)</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => { setNewTitle(defaultTitle); setShowNew(true) }}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg
              border border-dashed border-slate-300 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />New set
          </button>
        </>
      )}
    </div>
  )
}
