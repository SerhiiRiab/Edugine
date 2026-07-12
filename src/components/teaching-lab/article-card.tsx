import Link from 'next/link'
import type { TeachingLabArticle } from '@/lib/sanity'

export function ArticleCard({ article }: { article: TeachingLabArticle }) {
  return (
    <Link
      href={`/teaching-lab/articles/${article.slug}`}
      className="group flex flex-col bg-white rounded-2xl border-2 border-slate-100 p-5
        hover:border-violet-300 hover:shadow-md transition-all"
    >
      <h3 className="font-bold text-slate-800 text-sm mb-1.5 group-hover:text-violet-700 transition-colors">
        {article.title}
      </h3>
      {article.excerpt && (
        <p className="text-slate-400 text-xs leading-relaxed line-clamp-3">{article.excerpt}</p>
      )}
    </Link>
  )
}
