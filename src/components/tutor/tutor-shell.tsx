'use client'

import { useState } from 'react'
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
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/tutor/dashboard',     label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/tutor/programs',      label: 'Programs',     icon: BookOpen },
  { href: '/tutor/lessons',       label: 'Lessons',      icon: GraduationCap },
  { href: '/tutor/content-sets',  label: 'Activities',   icon: Library },
  { href: '/tutor/settings',      label: 'Settings',     icon: Settings },
]

interface Props {
  email: string
  children: React.ReactNode
}

export function TutorShell({ email, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function closeMobile() { setMobileOpen(false) }

  const SidebarContent = () => (
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
    </>
  )

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* ── Desktop sidebar ───────────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-60 shrink-0 bg-violet-950 text-white flex-col">
        <SidebarContent />
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
        <SidebarContent />
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
    </div>
  )
}
