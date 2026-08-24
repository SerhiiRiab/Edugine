'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowRight, Compass, Gamepad2, Star } from 'lucide-react'
import { addFavoriteMechanic, removeFavoriteMechanic } from '@/lib/actions/favorites'
import {
  DiscoverActivitiesModal,
  MECHANIC_ICONS,
  CATEGORY_COLORS,
  DEFAULT_COLORS,
  type CatalogMechanic,
} from './discover-activities-modal'

interface Props {
  mechanics: CatalogMechanic[]
  initialFavoriteIds: string[]
}

export function MyFavouritesSection({ mechanics, initialFavoriteIds }: Props) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set(initialFavoriteIds))
  const [modalOpen, setModalOpen] = useState(false)

  function toggleFavorite(mechanicId: string) {
    const wasFavorited = favoriteIds.has(mechanicId)
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      if (wasFavorited) next.delete(mechanicId)
      else next.add(mechanicId)
      return next
    })

    const action = wasFavorited ? removeFavoriteMechanic : addFavoriteMechanic
    action(mechanicId).then((res) => {
      if (res.error) {
        toast.error(res.error)
        setFavoriteIds((prev) => {
          const next = new Set(prev)
          if (wasFavorited) next.add(mechanicId)
          else next.delete(mechanicId)
          return next
        })
      }
    })
  }

  const favorites = mechanics.filter((m) => favoriteIds.has(m.id))

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-800">My Favourites</h2>
        {favorites.length > 0 && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <Compass className="w-4 h-4" />
            Discover Activities
          </button>
        )}
      </div>

      {favorites.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center text-center gap-2">
          <Star className="w-8 h-8 text-slate-300" />
          <p className="text-slate-600 font-semibold text-sm">No favourites yet</p>
          <p className="text-slate-400 text-sm mb-2">Star the activity types you use most for quick access here</p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            Discover Activities
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {favorites.map((m) => {
            const Icon = MECHANIC_ICONS[m.id] ?? Gamepad2
            const colors = CATEGORY_COLORS[m.skill_category ?? ''] ?? DEFAULT_COLORS
            return (
              <Link
                key={m.id}
                href={`/tutor/content-sets/new?mechanic=${m.id}`}
                className={`group relative flex flex-col gap-3 bg-white border-2 border-slate-100 rounded-2xl p-4
                  hover:shadow-md transition-all duration-150 ${colors.tile}`}
              >
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(m.id) }}
                  title="Remove from favourites"
                  className="absolute top-3 right-3 p-1 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                </button>
                <div className="flex items-start gap-3 pr-6">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colors.icon}`}>
                    <Icon className="w-[18px] h-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm leading-snug group-hover:text-violet-700 transition-colors">
                      {m.name}
                    </p>
                    {m.description && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {m.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <DiscoverActivitiesModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mechanics={mechanics}
        favoriteIds={favoriteIds}
        onToggleFavorite={toggleFavorite}
      />
    </section>
  )
}
