import type { Metadata } from 'next'

// Auth forms are thin, templated content with no search value of their own —
// keep them crawlable (so shared links still preview) but out of results.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
