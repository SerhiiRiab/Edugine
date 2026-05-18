'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  BookOpen,
  Play,
  Settings,
  LogOut,
  Zap,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/tutor/dashboard',     label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/tutor/content-sets',  label: 'Content Sets', icon: BookOpen },
  { href: '/tutor/sessions',      label: 'Sessions',     icon: Play },
  { href: '/tutor/settings',      label: 'Settings',     icon: Settings },
]

interface Props {
  email: string
  children: React.ReactNode
}

export function TutorShell({ email, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-60 shrink-0 bg-violet-950 text-white flex flex-col">

        {/* Logo */}
        <div className="px-6 py-5 border-b border-violet-800/60">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 bg-yellow-400 rounded-lg">
              <Zap className="w-4 h-4 text-violet-900" />
            </div>
            <span className="text-lg font-extrabold tracking-tight">Edugine</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
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
          <div className="px-3 py-2">
            <p className="text-xs text-violet-400 truncate">{email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-violet-300 hover:bg-violet-800/60 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
