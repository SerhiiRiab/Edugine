'use client'

import { useState } from 'react'
import { Loader2, RefreshCw, MessageSquarePlus, Trash2, X } from 'lucide-react'
import type { GeneratedItem } from '@/app/admin/lesson-generator/types'
import type { BlockField } from './block-fields'

interface Props {
  item: GeneratedItem
  fields: BlockField[]
  onUpdate: (patch: Record<string, unknown>) => void
  onRegenerate: (instruction?: string) => Promise<void>
  onDelete: () => void
}

export function GeneratedItemCard({ item, fields, onUpdate, onRegenerate, onDelete }: Props) {
  const [askOpen, setAskOpen] = useState(false)
  const [askText, setAskText] = useState('')
  const [busy, setBusy] = useState<'regen' | 'ask' | null>(null)

  async function handleRegenerate() {
    setBusy('regen')
    try { await onRegenerate() } finally { setBusy(null) }
  }

  async function handleAsk() {
    if (!askText.trim()) return
    setBusy('ask')
    try {
      await onRegenerate(askText.trim())
      setAskText('')
      setAskOpen(false)
    } finally { setBusy(null) }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2 transition-colors">
      {/* Fields */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: fields.length > 2 && !fields.some(f => f.long) ? '1fr 1fr' : '1fr' }}
      >
        {fields.map(field => (
          <div
            key={field.key}
            className={field.type === 'boolean' ? 'flex items-center gap-2' : ''}
          >
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
              {field.label}
            </label>
            {field.type === 'boolean' ? (
              <button
                type="button"
                onClick={() => onUpdate({ [field.key]: !(item.data[field.key] as boolean) })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                  item.data[field.key] ? 'bg-emerald-400' : 'bg-slate-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  item.data[field.key] ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            ) : (
              <textarea
                value={(item.data[field.key] as string) ?? ''}
                onChange={(e) => onUpdate({ [field.key]: e.target.value })}
                rows={field.long ? 4 : 1}
                className="w-full text-sm text-slate-800 bg-slate-50 rounded-lg border border-slate-200
                  focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none
                  px-2.5 py-1.5 transition-colors resize-y"
              />
            )}
          </div>
        ))}
      </div>

      {/* Diff preview */}
      {item.previousData && (
        <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-1">
          <p className="font-semibold text-amber-700">Before regeneration:</p>
          {fields.filter(f => f.type === 'text').map(f => {
            const before = item.previousData?.[f.key]
            const after = item.data[f.key]
            if (before === after) return null
            return (
              <p key={f.key} className="text-amber-700/80">
                <span className="font-medium">{f.label}:</span> <span className="line-through opacity-60">{String(before ?? '')}</span>
              </p>
            )
          })}
        </div>
      )}

      {/* Ask for a change */}
      {askOpen && (
        <div className="flex gap-2">
          <input
            autoFocus
            value={askText}
            onChange={(e) => setAskText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAsk() }}
            placeholder="e.g. make this harder, use a different verb..."
            className="flex-1 text-xs text-slate-800 bg-white rounded-lg border border-slate-200
              focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none px-2.5 py-1.5"
          />
          <button
            type="button"
            onClick={handleAsk}
            disabled={busy !== null || !askText.trim()}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700
              disabled:opacity-40 text-white transition-colors"
          >
            {busy === 'ask' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
          </button>
          <button type="button" onClick={() => setAskOpen(false)} className="text-slate-300 hover:text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center flex-wrap gap-1.5 pt-1">
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={busy !== null}
          title="Regenerate this one"
          className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg text-slate-500
            hover:bg-slate-100 disabled:opacity-40 transition-colors"
        >
          {busy === 'regen' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Regenerate
        </button>
        <button
          type="button"
          onClick={() => setAskOpen(v => !v)}
          disabled={busy !== null}
          title="Ask for a change"
          className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg text-slate-500
            hover:bg-slate-100 disabled:opacity-40 transition-colors"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
          Ask for a change
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy !== null}
          title="Delete"
          className="p-1 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-400 transition-colors ml-auto"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
