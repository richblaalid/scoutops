'use client'

import { Star, Users } from 'lucide-react'
import { MeritBadgeIcon } from './merit-badge-icon'
import type { BsaMeritBadge } from '@/types/advancement'

interface MeritBadgeGridCardProps {
  badge: BsaMeritBadge
  inProgressCount: number
  completedCount: number
  onClick: () => void
}

export function MeritBadgeGridCard({
  badge,
  inProgressCount,
  completedCount,
  onClick,
}: MeritBadgeGridCardProps) {
  const hasActivity = inProgressCount > 0 || completedCount > 0

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center rounded-xl border border-stone-200 bg-white p-4 text-center transition-all duration-200 hover:border-stone-300 hover:shadow-lg hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:ring-offset-2"
    >
      {/* Eagle Required Badge */}
      {badge.is_eagle_required && (
        <div className="absolute -right-1 -top-1 z-10">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-md ring-2 ring-white">
            <Star className="h-3 w-3 fill-white text-white" />
          </div>
        </div>
      )}

      {/* Badge Icon */}
      <div className="relative mb-3">
        <MeritBadgeIcon
          badge={badge}
          size="lg"
          className="transition-transform duration-200 group-hover:scale-105"
        />
      </div>

      {/* Badge Name */}
      <h3 className="line-clamp-2 text-sm font-semibold text-stone-900 group-hover:text-forest-700">
        {badge.name}
      </h3>

      {/* Category */}
      <p className="mt-1 text-xs text-stone-500">{badge.category || 'General'}</p>

      {/* Activity Indicator */}
      {hasActivity && (
        <div className="mt-2 flex items-center gap-1 text-xs text-stone-500">
          <Users className="h-3 w-3" />
          <span>
            {inProgressCount > 0 && `${inProgressCount} tracking`}
            {inProgressCount > 0 && completedCount > 0 && ' · '}
            {completedCount > 0 && `${completedCount} earned`}
          </span>
        </div>
      )}
    </button>
  )
}
