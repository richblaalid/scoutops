'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { MeritBadgeIcon } from './merit-badge-icon'
import { cn } from '@/lib/utils'
import { Star, Check, Clock, Circle } from 'lucide-react'

// Minimal type for merit badge progress - works with both local and full types
interface BadgeProgressItem {
  id: string
  status: string
  bsa_merit_badges: {
    id: string
    code: string | null
    name: string
    is_eagle_required: boolean | null
    category: string | null
    image_url?: string | null
  }
}

// Eagle-required badges grouped by requirement slot
// Some slots have alternatives - scout only needs ONE from the group
interface EagleRequirementSlot {
  id: string
  name: string
  codes: string[]
  isAlternative?: boolean
}

const EAGLE_REQUIREMENT_SLOTS: EagleRequirementSlot[] = [
  { id: 'camping', name: 'Camping', codes: ['camping'] },
  { id: 'cic', name: 'Citizenship in the Community', codes: ['citizenship_community'] },
  { id: 'cin', name: 'Citizenship in the Nation', codes: ['citizenship_nation'] },
  { id: 'ciw', name: 'Citizenship in the World', codes: ['citizenship_world'] },
  { id: 'cis', name: 'Citizenship in Society', codes: ['citizenship_society'] },
  { id: 'communication', name: 'Communication', codes: ['communication'] },
  { id: 'cooking', name: 'Cooking', codes: ['cooking'] },
  { id: 'emergency', name: 'Emergency Prep / Lifesaving', codes: ['emergency_preparedness', 'lifesaving'], isAlternative: true },
  { id: 'environmental', name: 'Env. Science / Sustainability', codes: ['environmental_science', 'sustainability'], isAlternative: true },
  { id: 'family_life', name: 'Family Life', codes: ['family_life'] },
  { id: 'first_aid', name: 'First Aid', codes: ['first_aid'] },
  { id: 'personal_fitness', name: 'Personal Fitness', codes: ['personal_fitness'] },
  { id: 'personal_management', name: 'Personal Management', codes: ['personal_management'] },
  { id: 'physical', name: 'Swimming / Hiking / Cycling', codes: ['swimming', 'hiking', 'cycling'], isAlternative: true },
]

const TOTAL_EAGLE_REQUIRED = 14

type SlotStatus = 'earned' | 'in_progress' | 'not_started'

interface SlotProgress {
  slot: EagleRequirementSlot
  status: SlotStatus
  badge: BadgeProgressItem | null // The badge being tracked or earned for this slot
  alternativeBadges?: BadgeProgressItem[] // Other alternatives being tracked
}

interface EagleProgressCardProps {
  meritBadgeProgress: BadgeProgressItem[]
  className?: string
  compact?: boolean
}

export function EagleProgressCard({
  meritBadgeProgress,
  className,
  compact = false,
}: EagleProgressCardProps) {
  // Calculate slot statuses
  const slotProgress = useMemo(() => {
    return EAGLE_REQUIREMENT_SLOTS.map((slot): SlotProgress => {
      // Find all badges matching this slot's codes
      const matchingBadges = meritBadgeProgress.filter(
        mb => slot.codes.includes(mb.bsa_merit_badges.code || '')
      )

      // Check if any are earned
      const earnedBadge = matchingBadges.find(
        mb => mb.status === 'awarded' || mb.status === 'approved'
      )
      if (earnedBadge) {
        return { slot, status: 'earned', badge: earnedBadge }
      }

      // Check if any are in progress
      const inProgressBadges = matchingBadges.filter(
        mb => ['in_progress', 'completed', 'pending_approval'].includes(mb.status)
      )
      if (inProgressBadges.length > 0) {
        return {
          slot,
          status: 'in_progress',
          badge: inProgressBadges[0],
          alternativeBadges: inProgressBadges.slice(1),
        }
      }

      return { slot, status: 'not_started', badge: null }
    })
  }, [meritBadgeProgress])

  const earnedCount = slotProgress.filter(s => s.status === 'earned').length
  const inProgressCount = slotProgress.filter(s => s.status === 'in_progress').length
  const progressPercent = Math.round((earnedCount / TOTAL_EAGLE_REQUIRED) * 100)

  // Status styling
  const getStatusStyles = (status: SlotStatus) => {
    switch (status) {
      case 'earned':
        return {
          ring: 'ring-2 ring-amber-400',
          bg: 'bg-amber-50',
          icon: <Check className="h-3 w-3 text-white" strokeWidth={3} />,
          iconBg: 'bg-amber-500',
        }
      case 'in_progress':
        return {
          ring: 'ring-2 ring-forest-400',
          bg: 'bg-forest-50/50',
          icon: <Clock className="h-3 w-3 text-white" strokeWidth={2} />,
          iconBg: 'bg-forest-500',
        }
      default:
        return {
          ring: 'ring-1 ring-stone-200',
          bg: 'bg-stone-50',
          icon: <Circle className="h-3 w-3 text-stone-400" strokeWidth={2} />,
          iconBg: 'bg-stone-200',
        }
    }
  }

  return (
    <Card className={cn(
      'overflow-hidden border-amber-200/50 bg-gradient-to-br from-amber-50/30 via-white to-orange-50/20',
      className
    )}>
      <CardHeader className={cn('pb-3', compact && 'pb-2')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Eagle icon */}
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-md">
              <Star className="h-5 w-5 fill-white text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-stone-900">
                Eagle Progress
              </CardTitle>
              <p className="text-sm text-stone-500">
                Required merit badges
              </p>
            </div>
          </div>

          {/* Progress badge */}
          <div className="text-right">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tabular-nums text-amber-600">
                {earnedCount}
              </span>
              <span className="text-lg text-stone-400">/</span>
              <span className="text-lg font-medium text-stone-500">
                {TOTAL_EAGLE_REQUIRED}
              </span>
            </div>
            <p className="text-xs text-stone-500">badges earned</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-stone-500">
              {inProgressCount > 0 && `${inProgressCount} in progress`}
            </span>
            <span className="font-semibold text-amber-600">{progressPercent}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn('pt-0', compact && 'pb-4')}>
        {/* Badge grid */}
        <div className={cn(
          'grid gap-2',
          compact ? 'grid-cols-7' : 'grid-cols-7 sm:grid-cols-7'
        )}>
          {slotProgress.map(({ slot, status, badge }) => {
            const styles = getStatusStyles(status)

            return (
              <div
                key={slot.id}
                className="group relative flex flex-col items-center"
                title={`${slot.name}${slot.isAlternative ? ' (choose one)' : ''}`}
              >
                {/* Badge container */}
                <div className={cn(
                  'relative rounded-full p-0.5 transition-all duration-200',
                  styles.ring,
                  styles.bg,
                  status !== 'not_started' && 'shadow-sm'
                )}>
                  {badge?.bsa_merit_badges ? (
                    <MeritBadgeIcon
                      badge={{
                        ...badge.bsa_merit_badges,
                        description: null,
                        is_active: true,
                        image_url: badge.bsa_merit_badges.image_url ?? null,
                        pamphlet_url: null,
                      }}
                      size="sm"
                      className={cn(
                        'transition-transform duration-200',
                        status === 'not_started' && 'opacity-40 grayscale',
                        status !== 'not_started' && 'group-hover:scale-105'
                      )}
                    />
                  ) : (
                    // Placeholder for not started
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full',
                      'bg-stone-100 text-stone-400'
                    )}>
                      <span className="text-[10px] font-bold uppercase">
                        {slot.name.split(' ')[0].slice(0, 3)}
                      </span>
                    </div>
                  )}

                  {/* Status indicator */}
                  <div className={cn(
                    'absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full shadow-sm',
                    styles.iconBg
                  )}>
                    {styles.icon}
                  </div>
                </div>

                {/* Alternative indicator */}
                {slot.isAlternative && (
                  <div className="mt-0.5">
                    <Badge
                      variant="secondary"
                      className="h-3 px-1 text-[8px] font-normal bg-stone-100 text-stone-500"
                    >
                      OR
                    </Badge>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Legend - only show in non-compact mode */}
        {!compact && (
          <div className="mt-4 flex items-center justify-center gap-4 border-t border-stone-100 pt-3 text-xs text-stone-500">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span>Earned</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-forest-500" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-stone-300" />
              <span>Not Started</span>
            </div>
          </div>
        )}

        {/* Completion message */}
        {earnedCount === TOTAL_EAGLE_REQUIRED && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-100 to-yellow-100 px-4 py-3 text-amber-800">
            <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
            <span className="font-semibold">All Eagle-required badges earned!</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
