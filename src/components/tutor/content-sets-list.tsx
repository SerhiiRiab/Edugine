'use client'

import { useState, useRef, useTransition } from 'react'
import { Search, Library, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ContentSetCard } from './content-set-card'
import { fetchContentSets, type ContentSetListItem } from '@/lib/actions/content-sets'

const PAGE_SIZE = 20

const MECHANIC_OPTIONS: { id: string; label: string }[] = [
  { id: 'swipe_battle',       label: 'Swipe Battle' },
  { id: 'speed_match',        label: 'Speed Match' },
  { id: 'story_builder',      label: 'Story Builder' },
  { id: 'talk_time',          label: 'Talk Time' },
  { id: 'content_block',      label: 'Content Block' },
  { id: 'true_false',         label: 'True / False' },
  { id: 'multiple_choice',    label: 'Multiple Choice' },
  { id: 'fill_the_gap',       label: 'Fill the Gap' },
  { id: 'word_bank',          label: 'Word Bank' },
  { id: 'word_choice',        label: 'Word Choice' },
  { id: 'speed_debate',       label: 'Speed Debate' },
  { id: 'roleplay_quest',     label: 'Roleplay Quest' },
  { id: 'speaking_challenge', label: 'Speaking Challenge' },
  { id: 'correct_the_mistake',label: 'Correct the Mistake' },
  { id: 'debate_roulette',    label: 'Debate Roulette' },
  { id: 'hidden_role',        label: 'Hidden Role' },
  { id: 'mission_briefing',   label: 'Mission Briefing' },
  { id: 'drama_event',        label: 'Drama Event' },
]

interface Props {
  initialItems: ContentSetListItem[]
  initialHasMore: boolean
}

export function ContentSetsList({ initialItems, initialHasMore }: Props) {
  const [items, setItems]       = useState(initialItems)
  const [hasMore, setHasMore]   = useState(initialHasMore)
  const [search, setSearch]     = useState('')
  const [mechanic, setMechanic] = useState('')
  const [offset, setOffset]     = useState(initialItems.length)
  const [isPending, startTransition] = useTransition()
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reqId = useRef(0)

  function load({
    s, m, off, append,
  }: { s: string; m: string; off: number; append: boolean }) {
    const id = ++reqId.current
    startTransition(async () => {
      const result = await fetchContentSets({ search: s, mechanicId: m, offset: off, limit: PAGE_SIZE })
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
    searchTimer.current = setTimeout(() => load({ s: val, m: mechanic, off: 0, append: false }), 400)
  }

  function handleMechanic(val: string) {
    const m = val === 'all' ? '' : val
    setMechanic(m)
    load({ s: search, m, off: 0, append: false })
  }

  function handleLoadMore() {
    load({ s: search, m: mechanic, off: offset, append: true })
  }

  const isEmpty = !isPending && items.length === 0
  const isFiltered = search.trim() !== '' || mechanic !== ''

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <Input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search activities…"
            className="pl-8 h-9 rounded-xl border-slate-200 focus-visible:border-violet-400 focus-visible:ring-violet-400/20"
          />
        </div>
        <Select value={mechanic || 'all'} onValueChange={handleMechanic}>
          <SelectTrigger className="h-9 rounded-xl border-slate-200 w-48 text-sm">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {MECHANIC_OPTIONS.map(o => (
              <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-6 text-slate-200"><Library className="w-20 h-20" /></div>
          {isFiltered ? (
            <>
              <h2 className="text-xl font-bold text-slate-800 mb-2">No activities found</h2>
              <p className="text-slate-400 mb-4 max-w-sm text-sm">Try a different search or filter</p>
              <button
                onClick={() => { setSearch(''); setMechanic(''); load({ s: '', m: '', off: 0, append: false }) }}
                className="text-sm text-violet-600 hover:underline font-medium"
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">No activities yet</h2>
              <p className="text-slate-400 mb-8 max-w-sm">
                Create your first activity to start building interactive lessons
              </p>
              <Link
                href="/tutor/content-sets/new"
                className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-5 py-3 rounded-xl transition-colors"
              >
                Create your first activity
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 transition-opacity ${isPending ? 'opacity-60' : ''}`}>
          {items.map(set => <ContentSetCard key={set.id} set={set} />)}
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
