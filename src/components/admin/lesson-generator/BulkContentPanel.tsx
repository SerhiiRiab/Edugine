'use client'

import { useState } from 'react'
import { Loader2, Sparkles, Trash2, ClipboardCopy, MessageSquarePlus, AlertTriangle, Shuffle } from 'lucide-react'
import { toast } from 'sonner'
import { MECHANICS } from '@/lib/mechanics/registry'
import type { MechanicId } from '@/lib/mechanics/types'
import { separatorChar } from '@/lib/utils/bulk-import-parser'
import type { GeneratedBlock, LessonBrief } from '@/app/admin/lesson-generator/types'
import { bulkEnabledMechanicIds } from '@/app/admin/lesson-generator/types'
import {
  generateBulkBlock, updateGeneratedItem, regenerateGeneratedItem, regenerateBlock,
  deleteGeneratedItem, deleteBlock,
} from '@/app/admin/lesson-generator/actions'
import { checkAlternatingPattern, rebalanceForAlternation } from '@/lib/mechanics/swipe-battle/alternating-check'
import { GeneratedItemCard } from './GeneratedItemCard'
import { fieldsForBlock } from './block-fields'

interface Props {
  draftId: string
  brief: LessonBrief
  blocks: GeneratedBlock[]
  onBlockCreated: (block: GeneratedBlock) => void
  onBlockUpdated: (block: GeneratedBlock) => void
  onBlockDeleted: (blockId: string) => void
}

const BULK_ENABLED = new Set(bulkEnabledMechanicIds())

export function BulkContentPanel({ draftId, brief, blocks, onBlockCreated, onBlockUpdated, onBlockDeleted }: Props) {
  const candidateMechanics = brief.recommendedMechanics.filter(id => BULK_ENABLED.has(id))
  const [mechanicId, setMechanicId] = useState<MechanicId | ''>(candidateMechanics[0] ?? '')
  const [count, setCount] = useState(8)
  const [generating, setGenerating] = useState(false)

  async function handleGenerate() {
    if (!mechanicId) { toast.error('Pick a mechanic first'); return }
    setGenerating(true)
    try {
      const block = await generateBulkBlock(draftId, mechanicId, count)
      onBlockCreated(block)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-700">Generate bulk activity content</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Mechanic</label>
            <select
              value={mechanicId}
              onChange={(e) => setMechanicId(e.target.value as MechanicId)}
              className="text-sm text-slate-800 bg-white rounded-lg border border-slate-200 px-3 py-2
                focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
            >
              <option value="" disabled>Choose a mechanic...</option>
              {candidateMechanics.map(id => <option key={id} value={id}>{MECHANICS[id].name}</option>)}
            </select>
            {candidateMechanics.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No recommended mechanics support bulk content — edit the brief's mechanics, or pick any below.</p>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Count</label>
            <input
              type="number" min={3} max={20} value={count}
              onChange={(e) => setCount(Math.max(3, Math.min(20, Number(e.target.value) || 8)))}
              className="w-20 text-sm text-slate-800 bg-white rounded-lg border border-slate-200 px-3 py-2
                focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !mechanicId}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700
              disabled:opacity-40 text-white text-sm font-semibold transition-colors"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate
          </button>
        </div>
        {/* Fallback picker for any bulk-enabled mechanic, not just recommended ones */}
        {candidateMechanics.length === 0 && (
          <select
            value={mechanicId}
            onChange={(e) => setMechanicId(e.target.value as MechanicId)}
            className="text-sm text-slate-800 bg-white rounded-lg border border-slate-200 px-3 py-2"
          >
            <option value="" disabled>Any bulk-enabled mechanic...</option>
            {Array.from(BULK_ENABLED).map(id => <option key={id} value={id}>{MECHANICS[id].name}</option>)}
          </select>
        )}
      </div>

      {blocks.map(block => (
        <BulkBlockSection
          key={block.id}
          block={block}
          onBlockUpdated={onBlockUpdated}
          onBlockDeleted={onBlockDeleted}
        />
      ))}
    </div>
  )
}

function BulkBlockSection({
  block, onBlockUpdated, onBlockDeleted,
}: {
  block: GeneratedBlock
  onBlockUpdated: (block: GeneratedBlock) => void
  onBlockDeleted: (blockId: string) => void
}) {
  const [askText, setAskText] = useState('')
  const [askBusy, setAskBusy] = useState(false)
  const mechanicId = block.mechanicId as MechanicId
  const def = MECHANICS[mechanicId]
  const fields = fieldsForBlock(block)

  const alternatingCheck = mechanicId === 'swipe_battle'
    ? checkAlternatingPattern(block.items.map(i => ({ isCorrect: Boolean(i.data.isCorrect) })))
    : null

  function updateItemLocal(itemId: string, patch: Record<string, unknown>) {
    onBlockUpdated({
      ...block,
      items: block.items.map(i => i.id === itemId ? { ...i, data: { ...i.data, ...patch } } : i),
    })
    updateGeneratedItem(block.id, itemId, patch).catch(() => toast.error('Failed to save edit'))
  }

  async function regenerateItem(itemId: string, instruction?: string) {
    try {
      const updated = await regenerateGeneratedItem(block.id, itemId, instruction)
      onBlockUpdated({ ...block, items: block.items.map(i => i.id === itemId ? updated : i) })
    } catch {
      toast.error('Regeneration failed')
    }
  }

  async function deleteItem(itemId: string) {
    onBlockUpdated({ ...block, items: block.items.filter(i => i.id !== itemId) })
    try { await deleteGeneratedItem(block.id, itemId) } catch { toast.error('Delete failed') }
  }

  async function handleAskBlock() {
    if (!askText.trim()) return
    setAskBusy(true)
    try {
      const updated = await regenerateBlock(block.id, askText.trim())
      onBlockUpdated(updated)
      setAskText('')
    } catch {
      toast.error('Failed to apply change')
    } finally {
      setAskBusy(false)
    }
  }

  function handleShuffle() {
    const withFlag = block.items.map(item => ({ item, isCorrect: Boolean(item.data.isCorrect) }))
    const reordered = rebalanceForAlternation(withFlag)
    onBlockUpdated({ ...block, items: reordered.map(r => r.item) })
  }

  function handleCopyBulk() {
    if (!def.bulkImport) return
    const sep = separatorChar(def.bulkImport.defaultSeparator)
    const text = block.items
      .map(item => def.bulkImport!.fields.map(f => (item.data[f.key] as string) ?? '').join(` ${sep} `))
      .join('\n')
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Copied — paste into the Bulk Add box on any content set'))
      .catch(() => toast.error('Copy failed'))
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-slate-100">
        <span className="text-sm font-semibold text-slate-700">{def.name}</span>
        <span className="text-xs text-slate-400">{block.items.length} items</span>
        <button
          type="button"
          onClick={handleCopyBulk}
          className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg text-slate-500 hover:bg-slate-100 ml-auto"
        >
          <ClipboardCopy className="w-3.5 h-3.5" />Copy to bulk import
        </button>
        <button
          type="button"
          onClick={() => { onBlockDeleted(block.id); deleteBlock(block.id).catch(() => toast.error('Delete failed')) }}
          className="p-1.5 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-400"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {alternatingCheck && !alternatingCheck.ok && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-700 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1">{alternatingCheck.issue}</span>
          <button
            type="button"
            onClick={handleShuffle}
            className="flex items-center gap-1 font-semibold px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 whitespace-nowrap"
          >
            <Shuffle className="w-3.5 h-3.5" />Shuffle for balance
          </button>
        </div>
      )}

      <div className="px-4 py-3 flex gap-2 items-center border-b border-slate-100 bg-white/60">
        <MessageSquarePlus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <input
          value={askText}
          onChange={(e) => setAskText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAskBlock() }}
          placeholder="Ask for a change across the whole batch..."
          className="flex-1 text-xs text-slate-700 bg-slate-50 rounded-lg border border-slate-200
            focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none px-2.5 py-1.5"
        />
        <button
          type="button"
          onClick={handleAskBlock}
          disabled={askBusy || !askText.trim()}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white"
        >
          {askBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply to all'}
        </button>
      </div>

      <div className="p-4 space-y-2">
        {block.items.map(item => (
          <GeneratedItemCard
            key={item.id}
            item={item}
            fields={fields}
            onUpdate={(patch) => updateItemLocal(item.id, patch)}
            onRegenerate={(instruction) => regenerateItem(item.id, instruction)}
            onDelete={() => deleteItem(item.id)}
          />
        ))}
      </div>
    </div>
  )
}
