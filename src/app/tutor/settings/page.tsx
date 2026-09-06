import Link from 'next/link'
import { Crown } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from './profile-form'
import { ContactForm } from './contact-form'
import { RecentMessages } from './recent-messages'
import { getRecentContactMessages } from '@/lib/actions/contact'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, pro_expires_at, full_name, country, languages, bio, website')
    .eq('id', user!.id)
    .single()

  const plan = (profile?.plan as 'free' | 'pro') ?? 'free'
  const proExpiresAt = profile?.pro_expires_at ?? null
  const recentMessages = await getRecentContactMessages()

  return (
    <div className="p-8 max-w-2xl space-y-6">

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

      {/* Profile */}
      <ProfileForm
        initialFullName={profile?.full_name ?? ''}
        initialCountry={profile?.country ?? ''}
        initialLanguages={(profile?.languages as string[] | null) ?? []}
        initialBio={profile?.bio ?? ''}
        initialWebsite={profile?.website ?? ''}
      />

      {/* Plan & Billing */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-5">Plan &amp; Billing</h2>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1.5">Current plan</p>
            {plan === 'pro' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r from-violet-500 to-purple-500 text-white">
                <Crown className="w-3.5 h-3.5" /> Pro
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                Free
              </span>
            )}
          </div>

          {plan === 'pro' && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-0.5">Subscription</p>
              <p className="text-slate-700 font-medium text-sm">
                {proExpiresAt ? `Pro until ${formatDate(proExpiresAt)}` : 'Lifetime Pro'}
              </p>
            </div>
          )}

          {plan === 'free' && (
            <div className="pt-1">
              <button
                disabled
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-violet-100 text-violet-400 cursor-not-allowed select-none"
              >
                <Crown className="w-4 h-4" />
                Upgrade to Pro
                <span className="text-xs font-normal text-violet-300 ml-1">— Coming soon</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contact us */}
      <ContactForm />

      <RecentMessages messages={recentMessages} />

    </div>
  )
}
