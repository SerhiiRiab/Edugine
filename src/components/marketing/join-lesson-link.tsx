import Link from 'next/link'

// Shown next to "Sign in" in public headers so a student who landed on a
// marketing/content page (not a tutor) has an obvious way to get to their
// session — tutors never see this, they launch sessions from the dashboard.
export function JoinLessonLink({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  return (
    <Link
      href="/play"
      className={
        variant === 'dark'
          ? 'px-4 py-2 text-white/80 font-medium hover:text-white transition-colors text-sm'
          : 'px-4 py-2 text-slate-500 font-medium hover:text-violet-600 transition-colors text-sm'
      }
    >
      Join lesson
    </Link>
  )
}
