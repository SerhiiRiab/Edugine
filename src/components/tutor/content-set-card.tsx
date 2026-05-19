'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { MoreHorizontal, Edit2, Copy, Trash2, BookOpen, Clock } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { deleteContentSet, duplicateContentSet } from '@/app/tutor/content-sets/actions'

interface ContentSetProps {
  set: {
    id: string
    title: string
    description: string | null
    mechanic_id: string
    item_count: number
    updated_at: string
  }
}

const MECHANIC_META: Record<string, { label: string; classes: string }> = {
  swipe_battle: {
    label: 'Swipe Battle 🎯',
    classes: 'bg-violet-100 text-violet-700 border-violet-200',
  },
  speed_debate: {
    label: 'Speed Debate 💬',
    classes: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  roleplay_quest: {
    label: 'Roleplay Quest 🎭',
    classes: 'bg-orange-100 text-orange-700 border-orange-200',
  },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ContentSetCard({ set }: ContentSetProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const mechanic = MECHANIC_META[set.mechanic_id] ?? {
    label: set.mechanic_id,
    classes: 'bg-slate-100 text-slate-600 border-slate-200',
  }

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    if (!window.confirm(`Delete "${set.title}"? This cannot be undone.`)) return
    setBusy(true)
    try {
      await deleteContentSet(set.id)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleDuplicate(e: React.MouseEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await duplicateContentSet(set.id)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Link
      href={`/tutor/content-sets/${set.id}/edit`}
      aria-disabled={busy}
      className={`group relative flex flex-col bg-white rounded-2xl border-2 border-slate-100 p-5 shadow-sm
        hover:border-violet-200 hover:shadow-md transition-all
        ${busy ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {/* Dropdown — stops link propagation via the wrapper div */}
      <div
        className="absolute top-3 right-3"
        onClick={(e) => e.preventDefault()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 transition-all">
              <MoreHorizontal className="w-4 h-4 text-slate-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem asChild>
              <Link href={`/tutor/content-sets/${set.id}/edit`} className="flex items-center gap-2">
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDuplicate}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              variant="destructive"
              className="flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mechanic badge */}
      <span
        className={`self-start mb-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${mechanic.classes}`}
      >
        {mechanic.label}
      </span>

      {/* Title */}
      <h3 className="font-bold text-slate-800 text-base leading-snug mb-1.5 pr-6 group-hover:text-violet-700 transition-colors">
        {set.title}
      </h3>

      {/* Description */}
      {set.description && (
        <p className="text-slate-400 text-sm line-clamp-2 mb-2">{set.description}</p>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Meta row */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <BookOpen className="w-3.5 h-3.5" />
          {set.item_count} {set.item_count === 1 ? 'item' : 'items'}
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <Clock className="w-3.5 h-3.5" />
          {formatDate(set.updated_at)}
        </span>
      </div>
    </Link>
  )
}
