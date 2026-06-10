import Link from 'next/link'
import { Plus, Library } from 'lucide-react'
import { fetchContentSets } from '@/lib/actions/content-sets'
import { ContentSetsList } from '@/components/tutor/content-sets-list'

export default async function ContentSetsPage() {
  const { items, hasMore } = await fetchContentSets({ limit: 20 })

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-extrabold text-slate-800">
            <Library className="w-7 h-7 text-violet-600" />My Activities
          </h1>
          <p className="text-slate-400 mt-1">Build amazing lessons in minutes</p>
        </div>
        <Link
          href="/tutor/content-sets/new"
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />New Activity
        </Link>
      </div>

      <ContentSetsList initialItems={items} initialHasMore={hasMore} />
    </div>
  )
}
