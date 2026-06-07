'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { MoreHorizontal, Edit2, Copy, Trash2, BookOpen, Clock, Target, Zap, PenLine, Mic, Mic2, MessageCircle, Theater } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { deleteContentSet, duplicateContentSet } from '@/lib/actions/content-sets'

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

const MECHANIC_META: Record<string, { label: string; Icon: React.ComponentType<{ className?: string }>; classes: string }> = {
  swipe_battle: {
    label: 'Swipe Battle',
    Icon: Target,
    classes: 'bg-violet-100 text-violet-700 border-violet-200',
  },
  speed_match: {
    label: 'Speed Match',
    Icon: Zap,
    classes: 'bg-sky-100 text-sky-700 border-sky-200',
  },
  story_builder: {
    label: 'Story Builder',
    Icon: PenLine,
    classes: 'bg-teal-100 text-teal-700 border-teal-200',
  },
  talk_time: {
    label: 'Talk Time',
    Icon: Mic,
    classes: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  speed_debate: {
    label: 'Speed Debate',
    Icon: MessageCircle,
    classes: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  roleplay_quest: {
    label: 'Roleplay Quest',
    Icon: Theater,
    classes: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  speaking_challenge: {
    label: 'Speaking Challenge',
    Icon: Mic2,
    classes: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  hidden_role: {
    label: 'Hidden Role',
    Icon: Theater,
    classes: 'bg-rose-100 text-rose-700 border-rose-200',
  },
  mission_briefing: {
    label: 'Mission Briefing',
    Icon: Target,
    classes: 'bg-violet-100 text-violet-700 border-violet-200',
  },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function ContentSetCard({ set }: ContentSetProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const mechanic = MECHANIC_META[set.mechanic_id] ?? {
    label: set.mechanic_id,
    Icon: null as React.ComponentType<{ className?: string }> | null,
    classes: 'bg-slate-100 text-slate-600 border-slate-200',
  }
  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    if (!window.confirm(`Delete "${set.title}"? This cannot be undone.`)) return
    setBusy(true)
    try {
      const result = await deleteContentSet(set.id)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Activity deleted')
        router.refresh()
      }
    } catch {
      toast.error('Failed to delete')
    } finally {
      setBusy(false)
    }
  }

  async function handleDuplicate(e: React.MouseEvent) {
    e.preventDefault()
    setBusy(true)
    const tid = toast.loading('Duplicating...')
    try {
      await duplicateContentSet(set.id)
      toast.success('Activity duplicated!', { id: tid })
      router.refresh()
    } catch {
      toast.error('Failed to duplicate', { id: tid })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Link
      href={`/tutor/content-sets/${set.id}/edit`}
      aria-disabled={busy}
      className={`group relative flex flex-col bg-white rounded-2xl border-2 border-slate-100 p-5 shadow-sm
        hover:border-violet-200 hover:shadow-md hover:scale-[1.02] transition-all duration-200
        ${busy ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {/* Dropdown */}
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
      <div className="flex items-center gap-1.5 mb-3">
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${mechanic.classes}`}>
          {mechanic.Icon && <mechanic.Icon className="w-3 h-3" />}
          {mechanic.label}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-bold text-slate-800 text-base leading-snug mb-1.5 pr-6 group-hover:text-violet-700 transition-colors truncate">
        {set.title}
      </h3>

      {/* Description */}
      {set.description && (
        <p className="text-slate-400 text-sm line-clamp-2 mb-2">{set.description}</p>
      )}

      <div className="flex-1" />

      {/* Meta row */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <BookOpen className="w-3.5 h-3.5" />
          {set.item_count} {set.item_count === 1 ? 'card' : 'cards'}
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <Clock className="w-3.5 h-3.5" />
          Updated {timeAgo(set.updated_at)}
        </span>
      </div>
    </Link>
  )
}
