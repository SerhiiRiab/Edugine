'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface Props {
  title: string
  subtitle: string
  children: React.ReactNode
}

export function LessonDesignCard({ title, subtitle, children }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-100 hover:border-violet-200 hover:shadow-md transition-all">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="group w-full flex items-start justify-between gap-3 text-left p-5"
      >
        <div>
          <h3 className="font-bold text-slate-800 text-sm mb-1 group-hover:text-violet-700 transition-colors">{title}</h3>
          <p className="text-slate-400 text-xs leading-relaxed">{subtitle}</p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 mt-0.5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="mx-5 pt-3 pb-5 border-t border-slate-100 text-sm text-slate-600 leading-relaxed space-y-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
