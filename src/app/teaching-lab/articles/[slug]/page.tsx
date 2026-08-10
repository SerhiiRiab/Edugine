import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GraduationCap, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getTeachingLabArticleBySlug } from '@/lib/sanity'
import { PortableText } from '@/components/sanity/portable-text'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = await getTeachingLabArticleBySlug(slug)

  if (!article) return { title: 'Article not found — Edugine' }

  const title = article.metaTitle || `${article.title} | Edugine Teaching Lab`
  const description = article.metaDescription || article.excerpt || undefined
  const url = `https://edugine.app/teaching-lab/articles/${article.slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      siteName: 'Edugine',
      title,
      description,
      images: [{ url: 'https://edugine.app/og-image.png', width: 1200, height: 630, alt: article.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['https://edugine.app/og-image.png'],
    },
  }
}

export default async function TeachingLabArticlePage({ params }: Props) {
  const { slug } = await params
  const article = await getTeachingLabArticleBySlug(slug)

  if (!article) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
            <Link href="/library" className="text-slate-500 hover:text-violet-600 font-medium text-sm transition-colors">
              Public Lessons
            </Link>
            <Link href="/blog" className="text-slate-500 hover:text-violet-600 font-medium text-sm transition-colors">
              Blog
            </Link>
            <Link href="/teaching-lab" className="text-violet-600 font-semibold text-sm">
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

      <article className="max-w-3xl mx-auto px-6 py-14">
        <Link href="/teaching-lab" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-violet-600 text-sm font-medium mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Teaching Lab
        </Link>

        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-600 border border-violet-100 mb-4">
          {article.section}
        </span>

        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight leading-tight">{article.title}</h1>

        {article.body && (
          <div className="mt-10">
            <PortableText value={article.body} />
          </div>
        )}
      </article>
    </div>
  )
}
