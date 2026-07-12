import type { Metadata } from 'next'
import Link from 'next/link'
import { Fragment } from 'react'
import { Zap, Users, Play, BookOpen, ArrowRight, ArrowDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  alternates: { canonical: 'https://edugine.app' },
}

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700">

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <span className="text-white font-extrabold text-xl tracking-tight">Edugine</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/library"
            className="px-4 py-2 text-white/80 font-medium hover:text-white transition-colors text-sm"
          >
            Library
          </Link>
          <Link
            href="/blog"
            className="px-4 py-2 text-white/80 font-medium hover:text-white transition-colors text-sm"
          >
            Blog
          </Link>
          <Link
            href="/teaching-lab"
            className="px-4 py-2 text-white/80 font-medium hover:text-white transition-colors text-sm"
          >
            Teaching Lab
          </Link>
          {user ? (
            <Link
              href="/tutor/dashboard"
              className="px-5 py-2 bg-white text-violet-700 font-semibold rounded-xl hover:bg-white/90 transition-colors text-sm shadow-sm"
            >
              Go to Dashboard →
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-white/90 font-medium hover:text-white transition-colors text-sm"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2 bg-white text-violet-700 font-semibold rounded-xl hover:bg-white/90 transition-colors text-sm shadow-sm"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-28 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-1.5 text-white/80 text-sm font-medium mb-8">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Free for tutors
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-tight mb-6">
          Turn online lessons into live multiplayer experiences
        </h1>
        <p className="text-violet-200 text-lg md:text-xl mb-10 max-w-2xl leading-relaxed">
          Create interactive lesson flows with collaborative activities, speaking challenges and pair work for 1–4 learners.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href={user ? '/tutor/dashboard' : '/signup'}
            className="px-8 py-4 bg-white text-violet-700 font-bold text-lg rounded-2xl hover:bg-white/90 transition-colors shadow-xl shadow-violet-900/20"
          >
            Start Free
          </Link>
          {!user && (
            <Link
              href="/login"
              className="px-8 py-4 bg-white/10 backdrop-blur text-white font-bold text-lg rounded-2xl hover:bg-white/20 transition-colors border border-white/20"
            >
              Sign in
            </Link>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            How it works
          </h2>
          <p className="text-violet-200/80 text-sm mt-2">
            From lesson idea to live session in minutes
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-0">
          {([
            {
              num: 1, Icon: BookOpen,
              title: 'Create your lesson',
              body: 'Build a lesson from interactive activities — vocabulary games, speaking challenges, debates and more.',
            },
            {
              num: 2, Icon: Play,
              title: 'Launch a live session',
              body: 'Students join instantly with a session code. No accounts, no downloads.',
            },
            {
              num: 3, Icon: Zap,
              title: 'Students interact',
              body: 'Everyone participates in real time — individually or as a group. No more passive watching.',
            },
          ] as const).map((step, i) => (
            <Fragment key={step.num}>
              <div className="relative w-full md:flex-1 bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 pt-8">
                <div className="absolute -top-3.5 left-6 w-7 h-7 rounded-full bg-white flex items-center justify-center text-violet-700 text-xs font-extrabold shadow-sm">
                  {step.num}
                </div>
                <step.Icon className="w-7 h-7 text-white/75 mb-3" />
                <h3 className="font-bold text-white text-lg mb-2">{step.title}</h3>
                <p className="text-violet-200 text-sm leading-relaxed">{step.body}</p>
              </div>
              {i < 2 && (
                <>
                  <ArrowDown className="w-5 h-5 text-white/30 md:hidden shrink-0" />
                  <ArrowRight className="w-5 h-5 text-white/30 hidden md:block shrink-0 mx-3" />
                </>
              )}
            </Fragment>
          ))}
        </div>
      </section>

      {/* What's inside */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {([
            { Icon: Zap, title: 'Activity Library', body: 'Swipe battles, debates, fill-the-gap, word bank and more. Pick and launch in seconds.' },
            { Icon: Users, title: 'Built for small groups', body: '1-on-1, pairs or groups of 3–4. Every student interacts, not just watches.' },
            { Icon: Play, title: 'Live session engine', body: 'Launch a lesson, students join by code. Real-time collaboration without screen sharing.' },
          ] as const).map((card) => (
            <div
              key={card.title}
              className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-5"
            >
              <div className="mb-3 text-white/80"><card.Icon className="w-8 h-8" /></div>
              <div className="font-bold text-white mb-1">{card.title}</div>
              <div className="text-violet-200 text-sm leading-relaxed">{card.body}</div>
            </div>
          ))}
        </div>
      </section>

    </main>
  )
}
