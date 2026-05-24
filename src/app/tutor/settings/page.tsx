import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="p-8 max-w-2xl">

      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Settings</h1>
        <p className="text-slate-400 mt-1">Manage your account.</p>
      </div>

      {/* Account */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-5">Account</h2>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-slate-400 mb-0.5">Email address</p>
            <p className="text-slate-800 font-medium">{user?.email}</p>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-100">
          <Link
            href="/reset-password"
            className="text-sm font-semibold text-violet-600 hover:text-violet-800 transition-colors"
          >
            Change password →
          </Link>
        </div>
      </div>

    </div>
  )
}
