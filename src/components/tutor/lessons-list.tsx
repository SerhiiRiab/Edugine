'use client'

import { useState, useRef, useTransition } from 'react'
import { Search, GraduationCap, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { LessonCard } from './lesson-card'
import { fetchLessons, type LessonListItem } from '@/lib/actions/lessons'

const PAGE_SIZE = 20

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

const LEVEL_PILL: Record<string, string> = {
  A1: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  A2: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100',
  B1: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
  B2: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  C1: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100',
  C2: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
}

interface Props {
  initialItems: LessonListItem[]
  initialHasMore: boolean
}

export function LessonsList({ initialItems, initialHasMore }: Props) {
  const [items, setItems]           = useState(initialItems)
  const [hasMore, setHasMore]       = useState(initialHasMore)
  const [search, setSearch]         = useState('')
  const [level, setLevel]           = useState('')
  const [visibility, setVisibility] = useState('')
  const [offset, setOffset]         = useState(initialItems.length)
  const [isPending, startTransition] = useTransition()
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reqId = useRef(0)

  function load({
    s, lv, vis, off, append,
  }: { s: string; lv: string; vis: string; off: number; append: boolean }) {
    const id = ++reqId.current
    startTransition(async () => {
      const result = await fetchLessons({ search: s, level: lv, visibility: vis, offset: off, limit: PAGE_SIZE })
      if (id !== reqId.current) return
      if (append) {
        setItems(prev => [...prev, ...result.items])
      } else {
        setItems(result.items)
      }
      setHasMore(result.hasMore)
      setOffset(off + result.items.length)
    })
  }

  function handleSearch(val: string) {
    setSearch(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => load({ s: val, lv: level, vis: visibility, off: 0, append: false }), 400)
  }

  function handleTagClick(tag: string) {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    setSearch(tag)
    load({ s: tag, lv: level, vis: visibility, off: 0, append: false })
  }

  function handleLevel(val: string) {
    const lv = val === level ? '' : val
    setLevel(lv)
    load({ s: search, lv, vis: visibility, off: 0, append: false })
  }

  function handleVisibility(val: string) {
    const vis = val === 'all' ? '' : val
    setVisibility(vis)
    load({ s: search, lv: level, vis, off: 0, append: false })
  }

  function handleLoadMore() {
    load({ s: search, lv: level, vis: visibility, off: offset, append: true })
  }

  function clearAll() {
    setSearch('')
    setLevel('')
    setVisibility('')
    load({ s: '', lv: '', vis: '', off: 0, append: false })
  }

  const isEmpty = !isPending && items.length === 0
  const isFiltered = search.trim() !== '' || level !== '' || visibility !== ''

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <Input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search lessons…"
            className="pl-8 h-9 rounded-xl border-slate-200 focus-visible:border-violet-400 focus-visible:ring-violet-400/20"
          />
        </div>
        <Select value={visibility || 'all'} onValueChange={handleVisibility}>
          <SelectTrigger className="h-9 rounded-xl border-slate-200 w-40 text-sm">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All visibility</SelectItem>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="unlisted">Unlisted</SelectItem>
            <SelectItem value="public">Public</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Level pills */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs font-medium text-slate-400 self-center mr-1">Level:</span>
        <button
          onClick={() => { setLevel(''); load({ s: search, lv: '', vis: visibility, off: 0, append: false }) }}
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
            level === ''
              ? 'bg-slate-800 text-white border-slate-800'
              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          All
        </button>
        {LEVELS.map(lv => (
          <button
            key={lv}
            onClick={() => handleLevel(lv)}
            className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
              level === lv
                ? LEVEL_PILL[lv].replace(/hover:\S+/g, '').trim() + ' ring-1 ring-current'
                : `bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50`
            }`}
          >
            {lv}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-6 text-slate-200"><GraduationCap className="w-20 h-20" /></div>
          {isFiltered ? (
            <>
              <h2 className="text-xl font-bold text-slate-800 mb-2">No lessons found</h2>
              <p className="text-slate-400 mb-4 max-w-sm text-sm">Try a different search or filter</p>
              <button
                onClick={clearAll}
                className="text-sm text-violet-600 hover:underline font-medium"
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">No lessons yet</h2>
              <p className="text-slate-400 mb-8 max-w-sm">
                Build your first interactive lesson by combining activities into a sequence
              </p>
              <Link
                href="/tutor/lessons/new"
                className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-5 py-3 rounded-xl transition-colors"
              >
                Build your first lesson
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 transition-opacity ${isPending ? 'opacity-60' : ''}`}>
          {items.map(lesson => <LessonCard key={lesson.id} lesson={lesson} onTagClick={handleTagClick} />)}
        </div>
      )}

      {/* Load more */}
      {hasMore && !isEmpty && (
        <div className="flex justify-center pt-2">
          <button
            onClick={handleLoadMore}
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isPending ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}
