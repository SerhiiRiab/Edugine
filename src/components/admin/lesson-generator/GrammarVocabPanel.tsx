'use client'

import { useState } from 'react'
import { Loader2, Sparkles, Trash2, Table2, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import type { GeneratedBlock } from '@/app/admin/lesson-generator/types'
import {
  generateGrammarBlock, generateVocabBlock, updateGeneratedItem, regenerateGeneratedItem,
  regenerateBlock, deleteGeneratedItem, deleteBlock, updateBlockWhenToUse,
} from '@/app/admin/lesson-generator/actions'
import { GeneratedItemCard } from './GeneratedItemCard'
import { fieldsForBlock } from './block-fields'

interface Props {
  draftId: string
  blocks: GeneratedBlock[]
  onBlockCreated: (block: GeneratedBlock) => void
  onBlockUpdated: (block: GeneratedBlock) => void
  onBlockDeleted: (blockId: string) => void
}

export function GrammarVocabPanel({ draftId, blocks, onBlockCreated, onBlockUpdated, onBlockDeleted }: Props) {
  const grammarBlocks = blocks.filter(b => b.blockType === 'grammar_table')
  const vocabBlocks = blocks.filter(b => b.blockType === 'vocab_cards')

  return (
    <div className="space-y-8">
      <StructuredSection
        title="Grammar Table"
        icon={<Table2 className="w-4 h-4" />}
        blocks={grammarBlocks}
        onGenerate={() => generateGrammarBlock(draftId)}
        onBlockCreated={onBlockCreated}
        onBlockUpdated={onBlockUpdated}
        onBlockDeleted={onBlockDeleted}
      />
      <StructuredSection
        title="Vocabulary Cards"
        icon={<BookOpen className="w-4 h-4" />}
        blocks={vocabBlocks}
        onGenerate={() => generateVocabBlock(draftId)}
        onBlockCreated={onBlockCreated}
        onBlockUpdated={onBlockUpdated}
        onBlockDeleted={onBlockDeleted}
      />
    </div>
  )
}

function StructuredSection({
  title, icon, blocks, onGenerate, onBlockCreated, onBlockUpdated, onBlockDeleted,
}: {
  title: string
  icon: React.ReactNode
  blocks: GeneratedBlock[]
  onGenerate: () => Promise<GeneratedBlock>
  onBlockCreated: (block: GeneratedBlock) => void
  onBlockUpdated: (block: GeneratedBlock) => void
  onBlockDeleted: (blockId: string) => void
}) {
  const [generating, setGenerating] = useState(false)

  async function handleGenerate() {
    setGenerating(true)
    try {
      const block = await onGenerate()
      onBlockCreated(block)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700
            disabled:opacity-40 text-white text-xs font-semibold transition-colors"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Generate {title}
        </button>
      </div>

      {blocks.map(block => (
        <StructuredBlockSection
          key={block.id}
          block={block}
          onBlockUpdated={onBlockUpdated}
          onBlockDeleted={onBlockDeleted}
        />
      ))}
    </div>
  )
}

function StructuredBlockSection({
  block, onBlockUpdated, onBlockDeleted,
}: {
  block: GeneratedBlock
  onBlockUpdated: (block: GeneratedBlock) => void
  onBlockDeleted: (blockId: string) => void
}) {
  const [askText, setAskText] = useState('')
  const [askBusy, setAskBusy] = useState(false)
  const [whenToUse, setWhenToUse] = useState(block.whenToUse ?? '')
  const fields = fieldsForBlock(block)

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

  function handleWhenToUseBlur() {
    if (whenToUse === (block.whenToUse ?? '')) return
    onBlockUpdated({ ...block, whenToUse })
    updateBlockWhenToUse(block.id, whenToUse).catch(() => toast.error('Failed to save'))
  }

  async function handleAskBlock() {
    if (!askText.trim()) return
    setAskBusy(true)
    try {
      const updated = await regenerateBlock(block.id, askText.trim())
      onBlockUpdated(updated)
      setWhenToUse(updated.whenToUse ?? '')
      setAskText('')
    } catch {
      toast.error('Failed to apply change')
    } finally {
      setAskBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-slate-100">
        <input
          value={whenToUse}
          onChange={(e) => setWhenToUse(e.target.value)}
          onBlur={handleWhenToUseBlur}
          placeholder="When to use this..."
          className="flex-1 text-xs text-slate-600 bg-transparent outline-none placeholder:text-slate-300"
        />
        <button
          type="button"
          onClick={() => { onBlockDeleted(block.id); deleteBlock(block.id).catch(() => toast.error('Delete failed')) }}
          className="p-1.5 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-400"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-3 py-2 flex gap-2 items-center border-b border-slate-100 bg-white/60">
        <input
          value={askText}
          onChange={(e) => setAskText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAskBlock() }}
          placeholder="Ask for a change across all rows/cards..."
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

      <div className="p-3 space-y-2">
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
