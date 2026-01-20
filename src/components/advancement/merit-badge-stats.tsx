'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Star, Award } from 'lucide-react'

interface MeritBadgeProgress {
  id: string
  status: string
  bsa_merit_badges: {
    id: string
    code: string | null
    name: string
    is_eagle_required: boolean | null
    category: string | null
  }
}

interface MeritBadgeStatsProps {
  meritBadgeProgress: MeritBadgeProgress[]
  className?: string
}

const EAGLE_REQUIRED_TOTAL = 14
const TOTAL_REQUIRED_FOR_EAGLE = 21

export function MeritBadgeStats({ meritBadgeProgress, className }: MeritBadgeStatsProps) {
  const stats = useMemo(() => {
    const earned = meritBadgeProgress.filter(b => b.status === 'awarded' || b.status === 'approved')
    const eagleRequiredEarned = earned.filter(b => b.bsa_merit_badges.is_eagle_required === true)

    return {
      totalEarned: earned.length,
      eagleRequiredEarned: eagleRequiredEarned.length,
    }
  }, [meritBadgeProgress])

  const eaglePercent = Math.round((stats.eagleRequiredEarned / EAGLE_REQUIRED_TOTAL) * 100)
  const totalPercent = Math.round((stats.totalEarned / TOTAL_REQUIRED_FOR_EAGLE) * 100)

  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      {/* Eagle Required Progress */}
      <div className="rounded-lg border bg-gradient-to-br from-amber-50/50 to-orange-50/50 p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
            <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold tabular-nums text-amber-700">
                {stats.eagleRequiredEarned}
              </span>
              <span className="text-sm text-amber-600/70">/ {EAGLE_REQUIRED_TOTAL}</span>
            </div>
            <p className="text-xs text-amber-700/70">Eagle Required</p>
          </div>
        </div>
        <div className="mt-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-amber-200/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
              style={{ width: `${Math.min(eaglePercent, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Total Badges Progress */}
      <div className="rounded-lg border bg-gradient-to-br from-forest-50/50 to-emerald-50/50 p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest-100">
            <Award className="h-4 w-4 text-forest-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold tabular-nums text-forest-700">
                {stats.totalEarned}
              </span>
              <span className="text-sm text-forest-600/70">/ {TOTAL_REQUIRED_FOR_EAGLE}</span>
            </div>
            <p className="text-xs text-forest-700/70">Total Badges</p>
          </div>
        </div>
        <div className="mt-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-forest-200/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-forest-400 to-forest-500 transition-all duration-500"
              style={{ width: `${Math.min(totalPercent, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
