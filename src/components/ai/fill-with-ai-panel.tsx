'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Sparkles, Loader2, RefreshCw, ChevronUp, AlertTriangle, Shuffle, Check, X,
} from 'lucide-react'
import type { MechanicId } from '@/lib/mechanics/types'
import type { BulkSeparator } from '@/lib/utils/bulk-import-parser'
import { MECHANICS } from '@/lib/mechanics/registry'
import {
  formatFillItems, correctFlagsFor, fieldsForTarget,
  type FillBlock, type FillContext, type FillItem, type FillTargetKind,
} from '@/lib/ai/fill-format'
import {
  getFillContext, generateFillBlock, regenerateFillBlock,
  regenerateFillLine, updateFillLine, deleteFillLine, reorderFillLines,
} from '@/lib/actions/ai-fill'
import { checkAlternatingPattern, rebalanceForAlternation } from '@/lib/mechanics/swipe-battle/alternating-check'
import { GeneratedItemCard } from '@/components/admin/lesson-generator/GeneratedItemCard'

// Inline "✨ Fill with AI" panel, rendered next to a mechanic editor's bulk
// field. Admin-only: the parent only mounts it when the server said the viewer
// is the platform owner, and every action re-checks that server-side.
//
// Nothing reaches the editor's field until the admin clicks "Use this" — the
// panel owns its own preview state, and edits there never touch content_items.

export interface FillTargetOption {
  kind: FillTargetKind
  label: string
  hint?: string
}

interface Props {
  contentSetId: string
  lessonId: string | null
  mechanicId: MechanicId
  /** One option renders no selector; several render a mode row. */
  targets: FillTargetOption[]
  /** Separator the destination field is currently set to, when it has a choice. */
  separator?: BulkSeparator
  /**
   * Receives the text to drop into the bulk field. `correctFlags` is non-null
   * only for Swipe Battle pairs, whose per-card correct/incorrect values can't
   * be expressed in the two-column bulk format.
   */
  onUse: (text: string, correctFlags: boolean[] | null) => void
  accent?: 'violet' | 'orange'
  className?: string
}

const ACCENTS = {
  violet: {
    button: 'border-violet-200 text-violet-600 hover:border-violet-400 hover:bg-violet-50',
    panel: 'border-violet-200 bg-violet-50/40',
    solid: 'bg-violet-600 hover:bg-violet-700',
    ring: 'focus:border-violet-400 focus:ring-violet-100',
    chip: 'bg-violet-100 text-violet-700',
  },
  orange: {
    button: 'border-orange-200 text-orange-600 hover:border-orange-400 hover:bg-orange-50',
    panel: 'border-orange-200 bg-orange-50/40',
    solid: 'bg-orange-500 hover:bg-orange-600',
    ring: 'focus:border-orange-400 focus:ring-orange-100',
    chip: 'bg-orange-100 text-orange-700',
  },
}

export function FillWithAiPanel({
  contentSetId, lessonId, mechanicId, targets,
  separator, onUse, accent = 'violet', className = '',
}: Props) {
  const [open, setOpen] = useState(false)
  const [ctx, setCtx] = useState<FillContext | null>(null)
  const [ctxError, setCtxError] = useState<string | null>(null)
  const [kind, setKind] = useState<FillTargetKind>(targets[0].kind)
  const [extraNote, setExtraNote] = useState('')
  const [block, setBlock] = useState<FillBlock | null>(null)
  const [busy, setBusy] = useState<'generate' | 'regenerate' | null>(null)

  const theme = ACCENTS[accent]
  const items = block?.items ?? []

  const alternating = kind === 'swipe_pairs' && items.length > 0
    ? checkAlternatingPattern(items.map(i => ({ isCorrect: i.data.isCorrect !== false })))
    : null
  const incorrectCount = kind === 'swipe_pairs'
    ? items.filter(i => i.data.isCorrect === false).length
    : 0

  async function handleOpen() {
    setOpen(true)
    if (ctx || ctxError) return
    try {
      setCtx(await getFillContext(contentSetId, lessonId))
    } catch (e) {
      setCtxError(e instanceof Error ? e.message : 'Could not load lesson context')
    }
  }

  async function handleGenerate() {
    setBusy('generate')
    try {
      setBlock(await generateFillBlock(contentSetId, lessonId, kind, extraNote))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setBusy(null)
    }
  }

  async function handleRegenerateAll() {
    if (!block) return
    setBusy('regenerate')
    try {
      setBlock(await regenerateFillBlock(block.id, extraNote))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Regeneration failed')
    } finally {
      setBusy(null)
    }
  }

  async function handleRegenerateLine(itemId: string, instruction?: string) {
    if (!block) return
    try {
      const updated = await regenerateFillLine(block.id, itemId, instruction)
      setBlock(b => b && { ...b, items: b.items.map(i => i.id === itemId ? updated : i) })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Regeneration failed')
    }
  }

  function handleUpdateLine(itemId: string, patch: Record<string, unknown>) {
    if (!block) return
    setBlock(b => b && {
      ...b,
      items: b.items.map(i => i.id === itemId
        ? { ...i, data: { ...i.data, ...patch }, previousData: undefined }
        : i),
    })
    updateFillLine(block.id, itemId, patch).catch(() => toast.error('Failed to save that edit'))
  }

  function handleDeleteLine(itemId: string) {
    if (!block) return
    setBlock(b => b && { ...b, items: b.items.filter(i => i.id !== itemId) })
    deleteFillLine(block.id, itemId).catch(() => toast.error('Failed to remove that line'))
  }

  function handleShuffle() {
    if (!block) return
    const tagged = block.items.map(item => ({ item, isCorrect: item.data.isCorrect !== false }))
    const reordered = rebalanceForAlternation(tagged).map(t => t.item)
    setBlock(b => b && { ...b, items: reordered })
    reorderFillLines(block.id, reordered.map(i => i.id)).catch(() => { /* display order only */ })
  }

  function handleUse() {
    const text = formatFillItems(kind, mechanicId, items, separator)
    if (!text.trim()) { toast.error('Nothing to use — the preview is empty'); return }
    onUse(text, correctFlagsFor(kind, items))
    setOpen(false)
    setBlock(null)
  }

  function handleClose() {
    setOpen(false)
    setBlock(null)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-dashed
          text-sm font-semibold transition-all whitespace-nowrap ${theme.button} ${className}`}
      >
        <Sparkles className="w-4 h-4" />
        Fill with AI
      </button>
    )
  }

  const fields = fieldsForTarget(kind, mechanicId)
  const activeTarget = targets.find(t => t.kind === kind) ?? targets[0]

  return (
    <div className={`rounded-2xl border-2 p-4 space-y-3 ${theme.panel} ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-slate-500 shrink-0" />
        <p className="text-sm font-bold text-slate-700 flex-1">Fill with AI</p>
        <button
          type="button"
          onClick={handleClose}
          title="Close"
          className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600"
        >
          <ChevronUp className="w-3.5 h-3.5" />Close
        </button>
      </div>

      {/* Lesson context pulled from the current lesson */}
      {ctxError ? (
        <p className="text-xs text-amber-600 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{ctxError}
        </p>
      ) : !ctx ? (
        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />Reading lesson context…
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          {ctx.lessonTitle ? (
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${theme.chip}`}>
              {ctx.lessonTitle}
            </span>
          ) : (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              Not in a lesson — using this activity&apos;s title only
            </span>
          )}
          {ctx.cefrLevel && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
              {ctx.cefrLevel}
            </span>
          )}
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
            {ctx.category}
          </span>
          {ctx.lessonTitle && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white text-slate-500 border border-slate-200">
              {ctx.existingActivities.length === 0
                ? 'first activity'
                : `${ctx.existingActivities.length} other ${ctx.existingActivities.length === 1 ? 'activity' : 'activities'} in this lesson`}
            </span>
          )}
        </div>
      )}

      {/* Mode selector — Swipe Battle's two card shapes */}
      {targets.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {targets.map(t => (
            <button
              key={t.kind}
              type="button"
              onClick={() => { setKind(t.kind); setBlock(null) }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                kind === t.kind
                  ? `${theme.solid} border-transparent text-white`
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      {activeTarget.hint && <p className="text-[11px] text-slate-500">{activeTarget.hint}</p>}

      {/* Extra context + generate */}
      <div className="flex flex-wrap gap-2">
        <input
          value={extraNote}
          onChange={e => setExtraNote(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !busy) handleGenerate() }}
          placeholder="Optional: one line of extra context, e.g. focus on remote work conflicts"
          className={`flex-1 min-w-0 text-xs text-slate-700 bg-white rounded-lg border border-slate-200
            outline-none focus:ring-2 px-2.5 py-2 transition-colors placeholder:text-slate-300 ${theme.ring}`}
        />
        <button
          type="button"
          onClick={handleGenerate}
          disabled={busy !== null}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-bold
            disabled:opacity-40 transition-colors shrink-0 ${theme.solid}`}
        >
          {busy === 'generate'
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating…</>
            : <><Sparkles className="w-3.5 h-3.5" />{block ? 'Generate again' : 'Generate'}</>}
        </button>
      </div>

      {/* Preview */}
      {block && (
        <div className="space-y-2">
          <div className="flex items-center flex-wrap gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Preview — {items.length} {items.length === 1 ? 'line' : 'lines'}
            </p>
            {kind === 'swipe_pairs' && items.length > 0 && (
              <span className="text-[11px] text-slate-500">
                {incorrectCount} incorrect ({Math.round((incorrectCount / items.length) * 100)}%)
              </span>
            )}
            <button
              type="button"
              onClick={handleRegenerateAll}
              disabled={busy !== null}
              className="ml-auto flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg
                text-slate-500 hover:bg-white disabled:opacity-40 transition-colors"
            >
              {busy === 'regenerate'
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <RefreshCw className="w-3 h-3" />}
              Regenerate all
            </button>
          </div>

          {alternating && !alternating.ok && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2
              text-[11px] text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span className="flex-1 leading-relaxed">{alternating.issue}</span>
              <button
                type="button"
                onClick={handleShuffle}
                className="flex items-center gap-1 font-bold px-2 py-1 rounded-lg bg-amber-100
                  hover:bg-amber-200 whitespace-nowrap shrink-0"
              >
                <Shuffle className="w-3 h-3" />Shuffle
              </button>
            </div>
          )}

          <div className="space-y-2">
            {items.map((item: FillItem) => (
              <GeneratedItemCard
                key={item.id}
                item={item}
                fields={fields}
                onUpdate={patch => handleUpdateLine(item.id, patch)}
                onRegenerate={instruction => handleRegenerateLine(item.id, instruction)}
                onDelete={() => handleDeleteLine(item.id)}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleUse}
              disabled={items.length === 0}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold
                disabled:opacity-40 transition-colors ${theme.solid}`}
            >
              <Check className="w-3.5 h-3.5" />Use this
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white
                text-slate-500 text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />Discard
            </button>
            <p className="text-[11px] text-slate-400 ml-auto">
              Goes into the {MECHANICS[mechanicId].name} field below — nothing is saved until you apply it there.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
