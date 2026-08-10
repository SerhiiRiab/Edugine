import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { GraduationCap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getBlogPosts, urlForImage } from '@/lib/sanity'

export const metadata: Metadata = {
  title: 'Blog — Teaching Tips & Platform Updates | Edugine',
  description:
    'Practical teaching tips, business English ideas, and Edugine platform updates for online tutors and language educators.',
  alternates: { canonical: 'https://edugine.app/blog' },
  openGraph: {
    type: 'website',
    url: 'https://edugine.app/blog',
    siteName: 'Edugine',
    title: 'Blog — Teaching Tips & Platform Updates | Edugine',
    description:
      'Practical teaching tips, business English ideas, and Edugine platform updates for online tutors and language educators.',
    images: [{ url: 'https://edugine.app/og-image.png', width: 1200, height: 630, alt: 'Edugine Blog' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog — Teaching Tips & Platform Updates | Edugine',
    description:
      'Practical teaching tips, business English ideas, and Edugine platform updates for online tutors and language educators.',
    images: ['https://edugine.app/og-image.png'],
  },
}

function formatDate(dateString: string | null) {
  if (!dateString) return null
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default async function BlogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const posts = await getBlogPosts()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50/30">

      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-3 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <GraduationCap className="w-5 h-5 text-violet-600" />
            <span className="font-extrabold text-slate-800 text-lg tracking-tight">Edugine</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-6">
            <Link href="/public-lessons" className="text-slate-500 hover:text-violet-600 font-medium text-sm transition-colors">
              Public Lessons
            </Link>
            <Link href="/blog" className="text-violet-600 font-semibold text-sm">
              Blog
            </Link>
            <Link href="/teaching-lab" className="text-slate-500 hover:text-violet-600 font-medium text-sm transition-colors">
              Teaching Lab
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/tutor/dashboard"
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                Dashboard →
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-slate-600 font-medium hover:text-slate-900 transition-colors text-sm"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl text-sm transition-colors"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 pt-14 pb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight">Blog</h1>
        <p className="text-violet-600 font-semibold text-lg mt-3">Teaching tips, ideas, and platform updates</p>
        <p className="text-slate-500 max-w-2xl mx-auto mt-4 leading-relaxed">
          Practical advice for online tutors — from lesson design to business English to what&apos;s new on Edugine.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-24">
        {posts.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
            <p className="text-slate-400 font-medium">No posts yet — check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map((post) => (
              <Link
                key={post._id}
                href={`/blog/${post.slug}`}
                className="group flex flex-col bg-white rounded-2xl border-2 border-slate-100 overflow-hidden
                  hover:border-violet-300 hover:shadow-md transition-all"
              >
                {post.coverImage && (
                  <div className="relative w-full h-40">
                    <Image
                      src={urlForImage(post.coverImage).width(600).height(340).fit('crop').url()}
                      alt={post.coverImage.alt ?? post.title}
                      fill
                      className="object-cover"
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-2 p-5">
                  {post.category && (
                    <span className="inline-flex items-center self-start px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-600 border border-violet-100">
                      {post.category}
                    </span>
                  )}
                  <h2 className="font-bold text-slate-800 text-base group-hover:text-violet-700 transition-colors">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-slate-400 text-sm leading-relaxed line-clamp-3">{post.excerpt}</p>
                  )}
                  {post.publishedAt && (
                    <span className="text-slate-400 text-xs mt-1">{formatDate(post.publishedAt)}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
