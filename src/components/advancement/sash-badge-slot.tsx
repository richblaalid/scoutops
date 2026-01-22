'use client'

import { cn } from '@/lib/utils'
import { MeritBadgeIcon } from './merit-badge-icon'
import { Check, Clock } from 'lucide-react'

interface MeritBadgeProgress {
  id: string
  status: string
  started_at: string | null
  completed_at: string | null
  awarded_at: string | null
  counselor_name: string | null
  bsa_merit_badges: {
    id: string
    code: string | null
    name: string
    is_eagle_required: boolean | null
    category: string | null
    image_url?: string | null
  }
  scout_merit_badge_requirement_progress: Array<{
    id: string
    status: string
    completed_at: string | null
  }>
}

interface SashBadgeSlotProps {
  badge: MeritBadgeProgress
  onClick: () => void
  className?: string
}

export function SashBadgeSlot({ badge, onClick, className }: SashBadgeSlotProps) {
  const isEarned = badge.status === 'awarded' || badge.status === 'approved'
  const isInProgress = badge.status === 'in_progress' || badge.status === 'completed'

  // Calculate requirement progress
  const totalReqs = badge.scout_merit_badge_requirement_progress.length
  const completedReqs = badge.scout_merit_badge_requirement_progress.filter(
    r => r.status === 'completed' || r.status === 'approved'
  ).length
  const progressPercent = totalReqs > 0 ? Math.round((completedReqs / totalReqs) * 100) : 0

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex flex-col items-center gap-1 rounded-lg p-2 transition-all',
        'hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50',
        className
      )}
    >
      {/* Badge Container with Status Ring */}
      <div className={cn(
        'relative rounded-full p-0.5 transition-all duration-200',
        isEarned && 'ring-2 ring-amber-400 shadow-sm shadow-amber-200/50',
        isInProgress && 'ring-2 ring-forest-400 shadow-sm shadow-forest-200/50',
        !isEarned && !isInProgress && 'ring-2 ring-stone-300/50'
      )}>
        <MeritBadgeIcon
          badge={{
            id: badge.bsa_merit_badges.id,
            code: badge.bsa_merit_badges.code,
            name: badge.bsa_merit_badges.name,
            category: badge.bsa_merit_badges.category,
            description: null,
            is_eagle_required: badge.bsa_merit_badges.is_eagle_required,
            is_active: true,
            image_url: badge.bsa_merit_badges.image_url ?? null,
            pamphlet_url: null,
          }}
          size="md"
          className={cn(
            'transition-transform duration-200 group-hover:scale-105',
            isEarned && 'opacity-100',
            isInProgress && 'opacity-100',
            !isEarned && !isInProgress && 'opacity-50 grayscale'
          )}
          showBorder={false}
        />

        {/* Status Indicator */}
        <div className={cn(
          'absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white shadow-sm',
          isEarned && 'bg-amber-500',
          isInProgress && 'bg-forest-500',
          !isEarned && !isInProgress && 'bg-stone-300'
        )}>
          {isEarned ? (
            <Check className="h-3 w-3 text-white" strokeWidth={3} />
          ) : isInProgress ? (
            <Clock className="h-2.5 w-2.5 text-white" strokeWidth={2} />
          ) : null}
        </div>
      </div>

      {/* Badge Name */}
      <span className={cn(
        'w-full truncate text-center text-[10px] font-medium leading-tight',
        isEarned && 'text-amber-100',
        isInProgress && 'text-white',
        !isEarned && !isInProgress && 'text-white/60'
      )}>
        {badge.bsa_merit_badges.name.split(' ')[0]}
      </span>

      {/* Progress indicator for in-progress badges */}
      {isInProgress && totalReqs > 0 && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-forest-700 px-1.5 py-0.5 text-[8px] font-medium text-white">
            {completedReqs}/{totalReqs}
          </span>
        </div>
      )}
    </button>
  )
}
