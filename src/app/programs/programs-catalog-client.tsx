'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, X, BookOpen, FolderOpen, LayoutList, ArrowRight } from 'lucide-react'
import type { PublicProgram } from './page'
import { AvatarInitials } from '@/components/ui/avatar-initials'

function ProgramCard({ program }: { program: PublicProgram }) {
  return (
    <div className="group bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4
      hover:border-violet-200 hover:shadow-md transition-all duration-200">

      {/* Top row: counts */}
      <div className="flex items-center gap-3 text-xs text-slate-400">
        {program.module_count > 0 && (
          <span className="flex items-center gap-1">
            <FolderOpen className="w-3.5 h-3.5" />
            {program.module_count} {program.module_count === 1 ? 'module' : 'modules'}
          </span>
        )}
        <span className="flex items-center gap-1">
          <LayoutList className="w-3.5 h-3.5" />
          {program.lesson_count} {program.lesson_count === 1 ? 'lesson' : 'lessons'}
        </span>
      </div>

      {/* Title */}
      <div className="flex-1 space-y-1.5">
        <h2 className="font-bold text-slate-800 text-base leading-snug group-hover:text-violet-700 transition-colors">
          {program.title}
        </h2>
        {program.description && (
          <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed">
            {program.description}
          </p>
        )}
        {program.author_name && (
          <div className="flex items-center gap-1.5 pt-0.5">
            <AvatarInitials name={program.author_name} size="sm" />
            <span className="text-xs text-slate-400">by <span className="font-medium text-slate-500">{program.author_name}</span></span>
          </div>
        )}
      </div>

      {/* CTA */}
      <Link
        href={`/programs/share/${program.share_token}`}
        className="self-end flex items-center gap-1.5 px-4 py-2 bg-violet-50 hover:bg-violet-100
          text-violet-700 font-semibold text-sm rounded-xl transition-colors"
      >
        View Program
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  )
}

export function ProgramsCatalogContent({ programs }: { programs: PublicProgram[] }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return programs
    return programs.filter((p) =>
      p.title.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q)
    )
  }, [programs, search])

  const isEmpty = programs.length === 0
  const noResults = !isEmpty && filtered.length === 0

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-6 py-10">

      {/* Page heading */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-6 h-6 text-violet-600" />
          <h1 className="text-2xl font-extrabold text-slate-800">Public Programs</h1>
        </div>
        <p className="text-slate-400 text-sm">Ready-made lesson sequences shared by tutors</p>
      </div>

      {/* Search */}
      {!isEmpty && (
        <div className="mb-8">
          <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 border border-slate-200 shadow-sm max-w-md">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search programs…"
              className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-slate-300 hover:text-slate-500 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results count */}
      {!isEmpty && !noResults && search && (
        <p className="text-sm text-slate-400 mb-4">
          {filtered.length} {filtered.length === 1 ? 'program' : 'programs'} found
        </p>
      )}

      {/* Empty catalog */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-violet-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">No programs yet</h2>
          <p className="text-slate-400 text-sm mb-6">Be the first to publish a program!</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-5 py-3 rounded-xl text-sm transition-colors"
          >
            Create an account — it&apos;s free
          </Link>
        </div>
      )}

      {/* No results from search */}
      {noResults && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <Search className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-slate-600 font-semibold mb-1">No programs found</p>
          <p className="text-slate-400 text-sm">Try a different search term</p>
          <button
            onClick={() => setSearch('')}
            className="mt-4 text-sm text-violet-600 hover:text-violet-700 font-medium transition-colors"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Program grid */}
      {!isEmpty && !noResults && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </div>
      )}
    </main>
  )
}
