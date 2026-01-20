'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { RankIcon } from './rank-icon'
import { Check, MapPin, Flag } from 'lucide-react'
import type { RankProgress, AdvancementStatus, BsaRank } from '@/types/advancement'

interface RankTrailVisualizationProps {
  rankProgress: RankProgress[]
  currentRank: string | null
  className?: string
}

// All BSA ranks in order for the trail with image URLs
const ALL_RANKS: Array<{ code: string; name: string; display_order: number; image_url: string }> = [
  { code: 'scout', name: 'Scout', display_order: 1, image_url: '/images/ranks/scout100.png' },
  { code: 'tenderfoot', name: 'Tenderfoot', display_order: 2, image_url: '/images/ranks/tenderfoot100.png' },
  { code: 'second_class', name: 'Second Class', display_order: 3, image_url: '/images/ranks/secondclass100.png' },
  { code: 'first_class', name: 'First Class', display_order: 4, image_url: '/images/ranks/firstclass100.png' },
  { code: 'star', name: 'Star', display_order: 5, image_url: '/images/ranks/star100.png' },
  { code: 'life', name: 'Life', display_order: 6, image_url: '/images/ranks/life100.png' },
  { code: 'eagle', name: 'Eagle', display_order: 7, image_url: '/images/ranks/eagle.png' },
]

type RankState = 'awarded' | 'in_progress' | 'future'

function getRankState(
  rankCode: string,
  rankProgress: RankProgress[],
  currentRank: string | null
): { state: RankState; progress?: RankProgress } {
  const progress = rankProgress.find(
    rp => rp.bsa_ranks.code === rankCode || rp.bsa_ranks.name.toLowerCase().replace(/\s+/g, '_') === rankCode
  )

  if (progress) {
    if (progress.status === 'awarded') {
      return { state: 'awarded', progress }
    }
    if (['in_progress', 'completed', 'approved'].includes(progress.status)) {
      return { state: 'in_progress', progress }
    }
  }

  // Check if this rank matches currentRank from scouts table
  if (currentRank) {
    const normalizedCurrent = currentRank.toLowerCase().replace(/\s+/g, '_')
    if (normalizedCurrent === rankCode) {
      return { state: 'awarded' }
    }
    // Check if current rank is higher than this one
    const currentOrder = ALL_RANKS.find(r =>
      r.code === normalizedCurrent || r.name.toLowerCase() === currentRank.toLowerCase()
    )?.display_order || 0
    const thisOrder = ALL_RANKS.find(r => r.code === rankCode)?.display_order || 0
    if (thisOrder < currentOrder) {
      return { state: 'awarded' }
    }
  }

  return { state: 'future' }
}

function calculateProgress(progress?: RankProgress): number {
  if (!progress?.scout_rank_requirement_progress) return 0
  const total = progress.scout_rank_requirement_progress.length
  if (total === 0) return 0
  const completed = progress.scout_rank_requirement_progress.filter(
    r => ['completed', 'approved', 'awarded'].includes(r.status)
  ).length
  return Math.round((completed / total) * 100)
}

export function RankTrailVisualization({
  rankProgress,
  currentRank,
  className,
}: RankTrailVisualizationProps) {
  const ranksWithState = useMemo(() => {
    return ALL_RANKS.map(rank => ({
      ...rank,
      ...getRankState(rank.code, rankProgress, currentRank),
    }))
  }, [rankProgress, currentRank])

  const currentInProgressRank = ranksWithState.find(r => r.state === 'in_progress')
  const progressPercent = currentInProgressRank ? calculateProgress(currentInProgressRank.progress) : 0

  return (
    <div className={cn('relative', className)}>
      {/* Topographic background pattern */}
      <div className="absolute inset-0 overflow-hidden rounded-xl opacity-[0.03]">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="topo" patternUnits="userSpaceOnUse" width="100" height="100">
              <path
                d="M0 50 Q25 30 50 50 T100 50"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
              <path
                d="M0 70 Q30 50 60 70 T120 70"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
              />
              <path
                d="M0 30 Q20 10 40 30 T80 30"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#topo)" />
        </svg>
      </div>

      {/* Main container with trail */}
      <div className="relative rounded-xl border border-stone-200/80 bg-gradient-to-b from-stone-50 via-white to-amber-50/30 p-4 shadow-sm sm:p-6">
        {/* Header */}
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-forest-100">
            <MapPin className="h-4 w-4 text-forest-600" />
          </div>
          <h3 className="font-semibold tracking-tight text-stone-800">
            Trail to Eagle
          </h3>
          {currentInProgressRank && (
            <span className="ml-auto rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              {progressPercent}% to {currentInProgressRank.name}
            </span>
          )}
        </div>

        {/* Trail visualization */}
        <div className="relative">
          {/* Scrollable container for mobile */}
          <div className="scrollbar-hide -mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
            <div className="relative flex min-w-[640px] items-center justify-between py-6 sm:min-w-0">
              {/* Trail path background */}
              <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2">
                {/* Future trail (dashed) */}
                <div className="absolute inset-0 rounded-full bg-stone-200" />

                {/* Completed trail (solid) */}
                {(() => {
                  const lastAwarded = ranksWithState.filter(r => r.state === 'awarded').length
                  const inProgressIndex = ranksWithState.findIndex(r => r.state === 'in_progress')
                  const progressWidth = inProgressIndex >= 0
                    ? ((inProgressIndex + (progressPercent / 100)) / (ALL_RANKS.length - 1)) * 100
                    : (lastAwarded / (ALL_RANKS.length - 1)) * 100

                  return (
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-forest-500 via-forest-400 to-amber-400 transition-all duration-700"
                      style={{ width: `${Math.min(progressWidth, 100)}%` }}
                    />
                  )
                })()}
              </div>

              {/* Trail markers */}
              {ranksWithState.map((rank, index) => {
                const isFirst = index === 0
                const isLast = index === ALL_RANKS.length - 1

                return (
                  <div
                    key={rank.code}
                    className={cn(
                      'relative z-10 flex flex-col items-center',
                      rank.state === 'in_progress' && 'scale-110 sm:scale-100'
                    )}
                  >
                    {/* Milestone marker */}
                    <div
                      className={cn(
                        'relative flex flex-col items-center transition-all duration-300',
                        rank.state === 'future' && 'opacity-40 grayscale'
                      )}
                    >
                      {/* Glow effect for current rank */}
                      {rank.state === 'in_progress' && (
                        <>
                          <div className="absolute -inset-2 animate-pulse rounded-full bg-blue-400/20 blur-md" />
                          <div className="absolute -inset-1 rounded-full bg-blue-500/10" />
                        </>
                      )}

                      {/* Achievement glow for awarded */}
                      {rank.state === 'awarded' && (
                        <div className="absolute -inset-1 rounded-full bg-amber-400/20" />
                      )}

                      {/* Badge container */}
                      <div
                        className={cn(
                          'relative rounded-full p-1 transition-all',
                          rank.state === 'awarded' && 'bg-gradient-to-br from-amber-100 to-amber-200/80 shadow-lg shadow-amber-200/50',
                          rank.state === 'in_progress' && 'bg-gradient-to-br from-blue-100 to-blue-200/80 shadow-lg shadow-blue-200/50 ring-2 ring-blue-400/50',
                          rank.state === 'future' && 'bg-stone-100'
                        )}
                      >
                        <RankIcon
                          rank={{
                            code: rank.code,
                            name: rank.name,
                            image_url: rank.image_url,
                          }}
                          size={rank.state === 'in_progress' ? 'lg' : 'md'}
                        />

                        {/* Checkmark for awarded ranks */}
                        {rank.state === 'awarded' && (
                          <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-sm">
                            <Check className="h-3 w-3 text-white" strokeWidth={3} />
                          </div>
                        )}

                        {/* "You are here" marker for in-progress */}
                        {rank.state === 'in_progress' && (
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full">
                            <div className="relative">
                              <div className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-75" />
                              <div className="relative rounded-full bg-blue-500 p-1">
                                <MapPin className="h-3 w-3 text-white" />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Eagle flag for final rank */}
                        {isLast && rank.state === 'awarded' && (
                          <div className="absolute -top-1 right-0 translate-x-1/2">
                            <Flag className="h-4 w-4 text-amber-600" fill="currentColor" />
                          </div>
                        )}
                      </div>

                      {/* Rank name */}
                      <span
                        className={cn(
                          'mt-2 text-center text-xs font-medium transition-colors',
                          rank.state === 'awarded' && 'text-amber-800',
                          rank.state === 'in_progress' && 'text-blue-700',
                          rank.state === 'future' && 'text-stone-400'
                        )}
                      >
                        {rank.name}
                      </span>

                      {/* Progress bar for in-progress rank */}
                      {rank.state === 'in_progress' && progressPercent > 0 && (
                        <div className="mt-1.5 h-1 w-12 overflow-hidden rounded-full bg-blue-200">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      )}

                      {/* Award date for completed ranks */}
                      {rank.state === 'awarded' && rank.progress?.awarded_at && (
                        <span className="mt-0.5 text-[10px] text-amber-600/80">
                          {new Date(rank.progress.awarded_at).toLocaleDateString('en-US', {
                            month: 'short',
                            year: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Scroll hint for mobile */}
          <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white to-transparent sm:hidden" />
        </div>

        {/* Journey stats */}
        <div className="mt-4 flex items-center justify-center gap-4 border-t border-stone-100 pt-4 text-xs text-stone-500">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600" />
            <span>{ranksWithState.filter(r => r.state === 'awarded').length} Earned</span>
          </div>
          {currentInProgressRank && (
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
              <span>Working on {currentInProgressRank.name}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-stone-300" />
            <span>{ranksWithState.filter(r => r.state === 'future').length} Ahead</span>
          </div>
        </div>
      </div>
    </div>
  )
}
