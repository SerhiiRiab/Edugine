import { createClient } from '@/lib/supabase/server'
import { BookOpen, Play, Users, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const name = user?.email?.split('@')[0] ?? 'teacher'

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* Welcome */}
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-slate-800">
          Hey, {name}! 👋
        </h1>
        <p className="text-slate-400 mt-1">Ready to teach something awesome today?</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        <StatCard
          icon={<BookOpen className="w-5 h-5" />}
          label="Content Sets"
          value="0"
          accent="bg-violet-100 text-violet-600"
        />
        <StatCard
          icon={<Play className="w-5 h-5" />}
          label="Active Sessions"
          value="0"
          accent="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Total Plays"
          value="0"
          accent="bg-orange-100 text-orange-600"
        />
      </div>

      {/* CTA banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-violet-500 to-purple-600 rounded-3xl p-8 text-white">
        {/* Decorative blobs */}
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -bottom-12 right-24 w-32 h-32 bg-white/10 rounded-full" />

        <div className="relative">
          <p className="text-violet-200 text-sm font-medium mb-1">Get started</p>
          <h2 className="text-2xl font-extrabold mb-2">Create your first lesson! 🚀</h2>
          <p className="text-violet-100 text-sm mb-6 max-w-md">
            Build a content set and launch a live Swipe Battle session in minutes.
            Students join with a code — no sign-up needed.
          </p>
          <Link
            href="/tutor/content-sets/new"
            className="inline-flex items-center gap-2 bg-white text-violet-700 font-bold px-5 py-2.5 rounded-xl hover:bg-violet-50 transition-colors text-sm"
          >
            Create content set
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent: string
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:scale-[1.02] transition-all duration-200">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-4 ${accent}`}>
        {icon}
      </div>
      <div className="text-3xl font-extrabold text-slate-800 mb-0.5">{value}</div>
      <div className="text-slate-400 text-sm">{label}</div>
    </div>
  )
}
