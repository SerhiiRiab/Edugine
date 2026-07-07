'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

interface Props {
  emoji: string
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export function CollapsibleSection({ emoji, title, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="group flex items-center gap-2.5 mb-5 w-full text-left"
      >
        <ChevronRight
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ${open ? 'rotate-90' : 'rotate-0'}`}
        />
        <span className="text-2xl leading-none">{emoji}</span>
        <h2 className="text-xl font-bold text-slate-800 group-hover:text-violet-700 transition-colors">{title}</h2>
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          {children}
        </div>
      </div>
    </section>
  )
}
