'use client'

import { memo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Award, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MeritBadgeCardProps {
  badge: {
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
    }
    scout_merit_badge_requirement_progress: Array<{
      id: string
      status: string
      completed_at: string | null
    }>
  }
  scoutId: string
  unitId: string
  canEdit: boolean
}

export const MeritBadgeCard = memo(function MeritBadgeCard({ badge, scoutId, unitId, canEdit }: MeritBadgeCardProps) {
  const completedCount = badge.scout_merit_badge_requirement_progress.filter(
    (r) => r.status === 'completed' || r.status === 'approved' || r.status === 'awarded'
  ).length
  const totalCount = badge.scout_merit_badge_requirement_progress.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const isAwarded = badge.status === 'awarded'
  const isEagleRequired = badge.bsa_merit_badges.is_eagle_required === true

  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-all',
        isAwarded ? 'border-forest-200 bg-forest-50/50' : 'hover:border-stone-300 hover:bg-stone-50'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full',
              isAwarded ? 'bg-forest-100' : 'bg-stone-100'
            )}
          >
            <Award className={cn('h-4 w-4', isAwarded ? 'text-forest-600' : 'text-stone-400')} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-medium text-stone-900">{badge.bsa_merit_badges.name}</h4>
              {isEagleRequired && (
                <span title="Eagle Required">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                </span>
              )}
            </div>
            {badge.bsa_merit_badges.category && (
              <p className="text-xs text-stone-500">{badge.bsa_merit_badges.category}</p>
            )}
          </div>
        </div>
        {isAwarded && (
          <Badge className="bg-forest-100 text-forest-700">Earned</Badge>
        )}
      </div>

      {!isAwarded && totalCount > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Progress</span>
            <span>
              {completedCount}/{totalCount}
            </span>
          </div>
          <Progress value={progressPercent} className="mt-1 h-1.5" />
        </div>
      )}

      {badge.counselor_name && (
        <p className="mt-2 text-xs text-stone-500">Counselor: {badge.counselor_name}</p>
      )}

      {badge.awarded_at && (
        <p className="mt-2 text-xs text-stone-400">
          Awarded: {new Date(badge.awarded_at).toLocaleDateString()}
        </p>
      )}
    </div>
  )
})
