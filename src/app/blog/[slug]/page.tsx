import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { GraduationCap, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getAllBlogPostSlugs, getBlogPostBySlug, urlForImage } from '@/lib/sanity'
import { PortableText } from '@/components/sanity/portable-text'

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const slugs = await getAllBlogPostSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)

  if (!post) return { title: 'Post not found — Edugine' }

  const title = post.metaTitle || `${post.title} | Edugine Blog`
  const description = post.metaDescription || post.excerpt || undefined
  const url = `https://edugine.app/blog/${post.slug}`
  const imageUrl = post.coverImage
    ? urlForImage(post.coverImage).width(1200).height(630).fit('crop').url()
    : 'https://edugine.app/og-image.png'

  return {
    title,
    description,
    keywords: post.keywords?.join(', '),
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      siteName: 'Edugine',
      title,
      description,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: post.coverImage?.alt ?? post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  }
}

function formatDate(dateString: string | null) {
  if (!dateString) return null
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)

  if (!post) notFound()

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

      <article className="max-w-3xl mx-auto px-6 py-14">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-violet-600 text-sm font-medium mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Link>

        {post.category && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-600 border border-violet-100 mb-4">
            {post.category}
          </span>
        )}

        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight leading-tight">{post.title}</h1>

        {post.publishedAt && (
          <p className="text-slate-400 text-sm mt-3">{formatDate(post.publishedAt)}</p>
        )}

        {post.coverImage && (
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden mt-8">
            <Image
              src={urlForImage(post.coverImage).width(1200).height(675).fit('crop').url()}
              alt={post.coverImage.alt ?? post.title}
              fill
              className="object-cover"
              sizes="(min-width: 768px) 768px, 100vw"
              priority
            />
          </div>
        )}

        {post.body && (
          <div className="mt-10">
            <PortableText value={post.body} />
          </div>
        )}
      </article>
    </div>
  )
}
