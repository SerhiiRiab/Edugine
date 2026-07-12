import { PortableText as PortableTextRenderer, type PortableTextComponents } from '@portabletext/react'
import Link from 'next/link'
import type { PortableTextBody } from '@/lib/sanity'

const components: PortableTextComponents = {
  block: {
    h1: ({ children }) => <h1 className="text-3xl font-extrabold text-slate-800 mt-10 mb-4">{children}</h1>,
    h2: ({ children }) => <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-3">{children}</h2>,
    h3: ({ children }) => <h3 className="text-xl font-bold text-slate-800 mt-6 mb-2">{children}</h3>,
    normal: ({ children }) => <p className="text-slate-600 leading-relaxed mb-4">{children}</p>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-violet-200 pl-4 italic text-slate-500 my-6">{children}</blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => <ul className="list-disc list-outside pl-5 text-slate-600 space-y-1.5 mb-4">{children}</ul>,
    number: ({ children }) => <ol className="list-decimal list-outside pl-5 text-slate-600 space-y-1.5 mb-4">{children}</ol>,
  },
  marks: {
    strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    link: ({ value, children }) => {
      const href = (value?.href as string) ?? '#'
      const isExternal = /^https?:\/\//.test(href) && !href.includes('edugine.app')
      return (
        <Link
          href={href}
          className="text-violet-600 hover:text-violet-700 font-medium underline underline-offset-2"
          {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {children}
        </Link>
      )
    },
  },
}

export function PortableText({ value }: { value: PortableTextBody }) {
  return <PortableTextRenderer value={value as never} components={components} />
}
