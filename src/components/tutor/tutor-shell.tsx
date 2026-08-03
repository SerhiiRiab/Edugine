'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Settings,
  LogOut,
  Library,
  Menu,
  X,
  Globe,
  FlaskConical,
  Newspaper,
} from 'lucide-react'
import { AvatarInitials } from '@/components/ui/avatar-initials'
import { WelcomeScreen } from '@/components/onboarding/welcome-screen'
import { OnboardingTour } from '@/components/onboarding/onboarding-tour'

const NAV_ITEMS = [
  { href: '/tutor/dashboard',     label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/tutor/programs',      label: 'Programs',     icon: BookOpen },
  { href: '/tutor/lessons',       label: 'My Lessons',   icon: GraduationCap },
  { href: '/tutor/content-sets',  label: 'Activities',   icon: Library },
  { href: '/library',             label: 'Public Library', icon: Globe },
  { href: '/blog',                label: 'Blog',          icon: Newspaper },
  { href: '/teaching-lab',        label: 'Teaching Lab', icon: FlaskConical },
  { href: '/tutor/settings',      label: 'Settings',     icon: Settings },
]

interface Props {
  email: string
  fullName: string | null
  plan: 'free' | 'pro'
  proExpiresAt: string | null
  showWelcome: boolean
  autoStartTour: boolean
  children: React.ReactNode
}

export function TutorShell({ email, fullName, plan, proExpiresAt, showWelcome, autoStartTour, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [welcomeDismissed, setWelcomeDismissed] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function closeMobile() { setMobileOpen(false) }

  // Rendered once for the desktop sidebar and once for the mobile drawer —
  // only tag the desktop copy for the tour so driver.js doesn't highlight
  // whichever instance happens to be display:none on the current viewport.
  const SidebarContent = ({ tourEnabled }: { tourEnabled: boolean }) => (
    <>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-violet-800/60 flex items-center justify-between">
        <img src="/edugine-lockup-dark.svg" alt="Edugine" className="h-8" />
        {/* Close button — mobile only */}
        <button
          onClick={closeMobile}
          className="md:hidden w-8 h-8 flex items-center justify-center text-violet-300 hover:text-white rounded-lg hover:bg-violet-800/60"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={closeMobile}
              data-tour={tourEnabled && href === '/library' ? 'nav-library' : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-violet-600 text-white'
                  : 'text-violet-300 hover:bg-violet-800/60 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-violet-800/60 space-y-1">
        <div className="px-3 py-2 flex items-center gap-3">
          <AvatarInitials name={fullName} size="sm" />
          <div className="min-w-0">
            {fullName && (
              <p className="text-sm font-semibold text-white truncate leading-tight">{fullName}</p>
            )}
            <p className="text-xs text-violet-400 truncate">{email}</p>
            {plan === 'pro' ? (
              <span className="inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 text-white tracking-wide">
                Pro
              </span>
            ) : (
              <span className="inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-900 border border-violet-700 text-violet-400 tracking-wide">
                Free
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-violet-300 hover:bg-violet-800/60 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Logout
        </button>
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* ── Desktop sidebar ───────────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-60 shrink-0 bg-violet-950 text-white flex-col">
        <SidebarContent tourEnabled />
      </aside>

      {/* ── Mobile sidebar backdrop ───────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMobile}
        />
      )}

      {/* ── Mobile sidebar drawer ─────────────────────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-violet-950 text-white flex flex-col
        transform transition-transform duration-300 ease-in-out
        md:hidden
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <SidebarContent tourEnabled={false} />
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-violet-950 text-white shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-8 h-8 flex items-center justify-center text-violet-300 hover:text-white rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <img src="/edugine-lockup-dark.svg" alt="Edugine" className="h-6" />
        </div>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {showWelcome && !welcomeDismissed && (
        <WelcomeScreen onDone={() => setWelcomeDismissed(true)} />
      )}

      <Suspense fallback={null}>
        <OnboardingTour autoStart={autoStartTour} />
      </Suspense>
    </div>
  )
}
