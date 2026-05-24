import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Library } from 'lucide-react'
import { ContentSetCard } from '@/components/tutor/content-set-card'
import { Suspense } from 'react'

export default async function ContentSetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: sets } = await supabase
    .from('content_sets')
    .select('*, content_items(id)')
    .eq('owner_id', user!.id)
    .order('updated_at', { ascending: false })

  const enriched = (sets ?? []).map((s) => ({
    ...s,
    item_count: ((s.content_items ?? []) as { id: string }[]).length,
  }))

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-extrabold text-slate-800"><Library className="w-7 h-7 text-violet-600" />My Content Sets</h1>
          <p className="text-slate-400 mt-1">Build amazing lessons in minutes</p>
        </div>
        <Link
          href="/tutor/content-sets/new"
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New Set
        </Link>
      </div>

      {enriched.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-6 text-slate-200"><Library className="w-20 h-20" /></div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">No content sets yet</h2>
          <p className="text-slate-400 mb-8 max-w-sm">
            Create your first content set to start building interactive lessons
          </p>
          <Link
            href="/tutor/content-sets/new"
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-5 py-3 rounded-xl transition-colors"
          >
            Create your first set
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {enriched.map((set) => (
            <ContentSetCard key={set.id} set={set} />
          ))}
        </div>
      )}
    </div>
  )
}
