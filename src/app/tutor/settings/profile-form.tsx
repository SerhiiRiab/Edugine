'use client'

import { useActionState, useEffect, useState } from 'react'
import { AvatarInitials } from '@/components/ui/avatar-initials'
import { updateProfile, type UpdateProfileResult } from '@/lib/actions/profile'
import { X } from 'lucide-react'

interface Props {
  initialFullName: string
  initialCountry: string
  initialLanguages: string[]
  initialBio: string
  initialWebsite: string
}

const INITIAL: UpdateProfileResult = { error: '' }

export function ProfileForm({
  initialFullName,
  initialCountry,
  initialLanguages,
  initialBio,
  initialWebsite,
}: Props) {
  const [state, action, pending] = useActionState(updateProfile, INITIAL)

  const [fullName, setFullName] = useState(initialFullName)
  const [languages, setLanguages] = useState<string[]>(initialLanguages)
  const [langInput, setLangInput] = useState('')
  const [bio, setBio] = useState(initialBio)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if ('ok' in state && state.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }, [state])

  function addLanguage() {
    const trimmed = langInput.trim()
    if (trimmed && !languages.includes(trimmed)) {
      setLanguages((prev) => [...prev, trimmed])
    }
    setLangInput('')
  }

  function removeLanguage(lang: string) {
    setLanguages((prev) => prev.filter((l) => l !== lang))
  }

  function handleLangKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addLanguage()
    }
  }

  return (
    <form action={action} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-5">Profile</h2>

      {/* Avatar preview */}
      <div className="flex items-center gap-4 mb-6">
        <AvatarInitials name={fullName || null} size="lg" />
        <div>
          <p className="text-sm font-semibold text-slate-700">{fullName || 'Your name'}</p>
          <p className="text-xs text-slate-400">Initials are generated from your name</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Full name */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1" htmlFor="full_name">
            Full name <span className="text-rose-400">*</span>
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Smith"
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50"
          />
        </div>

        {/* Country */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1" htmlFor="country">
            Country
          </label>
          <input
            id="country"
            name="country"
            type="text"
            defaultValue={initialCountry}
            placeholder="e.g. United Kingdom"
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50"
          />
        </div>

        {/* Languages */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Languages I teach
          </label>
          <input type="hidden" name="languages" value={languages.join(',')} />
          {languages.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {languages.map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold"
                >
                  {lang}
                  <button
                    type="button"
                    onClick={() => removeLanguage(lang)}
                    className="hover:text-violet-900 transition-colors"
                    aria-label={`Remove ${lang}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={langInput}
              onChange={(e) => setLangInput(e.target.value)}
              onKeyDown={handleLangKeyDown}
              onBlur={addLanguage}
              placeholder="e.g. English, Spanish…"
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50"
            />
            <button
              type="button"
              onClick={addLanguage}
              className="px-3 py-2 text-sm font-semibold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1">Press Enter or comma to add</p>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1" htmlFor="bio">
            Bio <span className="text-slate-300 font-normal">({bio.length}/160)</span>
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            maxLength={160}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A short intro about you and your teaching style…"
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50 resize-none"
          />
        </div>

        {/* Website */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1" htmlFor="website">
            Website
          </label>
          <input
            id="website"
            name="website"
            type="url"
            defaultValue={initialWebsite}
            placeholder="https://yoursite.com"
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50"
          />
        </div>
      </div>

      {'error' in state && state.error && (
        <p className="mt-3 text-sm text-rose-500">{state.error}</p>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? 'Saving…' : 'Save profile'}
        </button>
        {saved && <span className="text-sm text-emerald-600 font-medium">Saved!</span>}
      </div>
    </form>
  )
}
