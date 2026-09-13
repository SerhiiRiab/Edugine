'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CODE_LENGTH = 6

export function JoinLessonForm() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim()
    if (trimmed.length !== CODE_LENGTH) {
      setError(`Enter the ${CODE_LENGTH}-character code your teacher gave you`)
      return
    }
    router.push(`/play/${trimmed}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="code" className="block text-sm font-medium text-slate-700">
          Session code
        </label>
        <input
          id="code"
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          autoFocus
          maxLength={CODE_LENGTH}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
            setError('')
          }}
          placeholder="ABC123"
          className="w-full px-4 py-4 rounded-xl border border-slate-200 text-slate-800 text-center
            text-2xl font-bold tracking-[0.3em] placeholder:text-slate-300 placeholder:tracking-[0.3em]
            focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
        />
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <button
        type="submit"
        disabled={code.length !== CODE_LENGTH}
        className="w-full py-3.5 px-6 bg-violet-600 hover:bg-violet-700 active:bg-violet-800
          disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl
          transition-colors text-base"
      >
        Join →
      </button>
    </form>
  )
}
