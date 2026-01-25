'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Check, MapPin, Compass, ChevronRight, Sparkles } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import type { RankProgress } from '@/types/advancement'

interface RankTrailVisualizationProps {
  rankProgress: RankProgress[]
  currentRank: string | null
  className?: string
  onRankClick?: (rankCode: string) => void
  selectedRank?: string | null
  compact?: boolean
  /** Selector mode for unit-level views - hides progress, shows all ranks equally */
  selectorMode?: boolean
}

// All BSA ranks in order for the trail with image URLs
const ALL_RANKS: Array<{ code: string; name: string; shortName: string; display_order: number; image_url: string }> = [
  { code: 'scout', name: 'Scout', shortName: 'Scout', display_order: 1, image_url: '/images/ranks/scout100.png' },
  { code: 'tenderfoot', name: 'Tenderfoot', shortName: 'Tenderfoot', display_order: 2, image_url: '/images/ranks/tenderfoot100.png' },
  { code: 'second_class', name: 'Second Class', shortName: '2nd Class', display_order: 3, image_url: '/images/ranks/secondclass100.png' },
  { code: 'first_class', name: 'First Class', shortName: '1st Class', display_order: 4, image_url: '/images/ranks/firstclass100.png' },
  { code: 'star', name: 'Star', shortName: 'Star', display_order: 5, image_url: '/images/ranks/star100.png' },
  { code: 'life', name: 'Life', shortName: 'Life', display_order: 6, image_url: '/images/ranks/life100.png' },
  { code: 'eagle', name: 'Eagle', shortName: 'Eagle', display_order: 7, image_url: '/images/ranks/eagle.png' },
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

// Generate contextual suggestions based on current progress
function getGuideSuggestions(
  ranksWithState: Array<{ code: string; name: string; state: RankState; progressPercent: number; progress?: RankProgress }>
): Array<{ type: 'focus' | 'tip' | 'milestone'; text: string; detail?: string }> {
  const suggestions: Array<{ type: 'focus' | 'tip' | 'milestone'; text: string; detail?: string }> = []

  const inProgress = ranksWithState.find(r => r.state === 'in_progress')
  const awarded = ranksWithState.filter(r => r.state === 'awarded')
  const nextFuture = ranksWithState.find(r => r.state === 'future')

  if (inProgress) {
    const remaining = 100 - inProgress.progressPercent
    suggestions.push({
      type: 'focus',
      text: `Continue working on ${inProgress.name}`,
      detail: `${inProgress.progressPercent}% complete — ${remaining}% to go!`
    })

    if (inProgress.progressPercent >= 75) {
      suggestions.push({
        type: 'milestone',
        text: `Almost there!`,
        detail: `You're close to completing ${inProgress.name}. Keep up the great work!`
      })
    }
  } else if (nextFuture) {
    suggestions.push({
      type: 'focus',
      text: `Start working on ${nextFuture.name}`,
      detail: `Click to view requirements and begin your journey.`
    })
  }

  if (awarded.length > 0 && awarded.length < 7) {
    const lastAwarded = awarded[awarded.length - 1]
    suggestions.push({
      type: 'tip',
      text: `Great progress!`,
      detail: `You've earned ${awarded.length} rank${awarded.length !== 1 ? 's' : ''}, most recently ${lastAwarded.name}.`
    })
  }

  if (awarded.length === 0) {
    suggestions.push({
      type: 'tip',
      text: `Begin your Scouting journey`,
      detail: `Start by completing the Scout rank requirements.`
    })
  }

  return suggestions
}

export function RankTrailVisualization({
  rankProgress,
  currentRank,
  className,
  onRankClick,
  selectedRank,
  compact = false,
  selectorMode = false,
}: RankTrailVisualizationProps) {
  const [guideOpen, setGuideOpen] = useState(false)

  const ranksWithState = useMemo(() => {
    return ALL_RANKS.map(rank => {
      // In selector mode, treat all ranks as selectable (no progress state)
      if (selectorMode) {
        return {
          ...rank,
          state: 'future' as RankState,
          progressPercent: 0,
        }
      }
      const stateInfo = getRankState(rank.code, rankProgress, currentRank)
      const progressPercent = calculateProgress(stateInfo.progress)
      return {
        ...rank,
        ...stateInfo,
        progressPercent,
      }
    })
  }, [rankProgress, currentRank, selectorMode])

  const currentInProgressRank = ranksWithState.find(r => r.state === 'in_progress')
  const progressPercent = currentInProgressRank?.progressPercent || 0

  const suggestions = useMemo(() => getGuideSuggestions(ranksWithState), [ranksWithState])

  return (
    <div className={cn('relative', className)}>
      {/* Main container */}
      <div className={cn(
        'relative overflow-hidden rounded-xl border border-stone-200 bg-gradient-to-b from-stone-50 to-stone-100',
        compact ? 'p-3 sm:p-4' : 'p-4 sm:p-6'
      )}>
        {/* Trail background imagery - full width, positioned at bottom */}
        {/* CSS opacity applied to container flattens all children into one layer first, preventing overlap darkening */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-full overflow-hidden opacity-[0.06]">
          {/* Pine tree silhouettes */}
          <svg
            className="absolute bottom-0 left-0 right-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <g fill="#2d5a3d">
              <path d="M3 100 L3.8 82 L3.4 82 L4.2 65 L3.6 65 L4.5 45 L5.4 65 L4.8 65 L5.6 82 L5.2 82 L6 100Z" />
              <path d="M8 100 L8.6 85 L8.3 85 L9 70 L8.5 70 L9.3 52 L10.1 70 L9.6 70 L10.3 85 L10 85 L10.6 100Z" />
              <path d="M15 100 L15.8 80 L15.4 80 L16.2 62 L15.6 62 L16.5 40 L17.4 62 L16.8 62 L17.6 80 L17.2 80 L18 100Z" />
              <path d="M22 100 L22.6 87 L22.3 87 L23 73 L22.5 73 L23.3 55 L24.1 73 L23.6 73 L24.3 87 L24 87 L24.6 100Z" />
              <path d="M30 100 L30.8 82 L30.4 82 L31.2 65 L30.6 65 L31.5 45 L32.4 65 L31.8 65 L32.6 82 L32.2 82 L33 100Z" />
              <path d="M38 100 L38.5 88 L38.2 88 L38.8 75 L38.4 75 L39.2 58 L40 75 L39.5 75 L40.2 88 L39.8 88 L40.5 100Z" />
              <path d="M47 100 L47.8 80 L47.4 80 L48.2 62 L47.6 62 L48.5 40 L49.4 62 L48.8 62 L49.6 80 L49.2 80 L50 100Z" />
              <path d="M55 100 L55.6 85 L55.3 85 L56 70 L55.5 70 L56.3 52 L57.1 70 L56.6 70 L57.3 85 L57 85 L57.6 100Z" />
              <path d="M63 100 L63.8 82 L63.4 82 L64.2 65 L63.6 65 L64.5 45 L65.4 65 L64.8 65 L65.6 82 L65.2 82 L66 100Z" />
              <path d="M72 100 L72.5 88 L72.2 88 L72.8 75 L72.4 75 L73.2 58 L74 75 L73.5 75 L74.2 88 L73.8 88 L74.5 100Z" />
              <path d="M80 100 L80.8 80 L80.4 80 L81.2 62 L80.6 62 L81.5 40 L82.4 62 L81.8 62 L82.6 80 L82.2 80 L83 100Z" />
              <path d="M88 100 L88.6 85 L88.3 85 L89 70 L88.5 70 L89.3 52 L90.1 70 L89.6 70 L90.3 85 L90 85 L90.6 100Z" />
              <path d="M95 100 L95.6 87 L95.3 87 L96 73 L95.5 73 L96.3 55 L97.1 73 L96.6 73 L97.3 87 L97 87 L97.6 100Z" />
            </g>
          </svg>
          {/* Mountain range silhouette */}
          <svg
            className="absolute bottom-0 left-0 right-0 h-1/3 w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <path
              d="M0 100 L5 70 L12 85 L22 50 L30 75 L40 55 L50 35 L60 60 L70 45 L80 70 L88 50 L95 75 L100 60 L100 100Z"
              fill="#2d5a3d"
            />
          </svg>
        </div>

        {/* Header */}
        <div className={cn('relative flex items-center justify-between gap-3', compact ? 'mb-3' : 'mb-4')}>
          {/* Title with trail branding */}
          <div className="flex items-center gap-2">
            <div className={cn(
              'flex items-center justify-center rounded-lg bg-gradient-to-br from-forest-500 to-forest-600 shadow-sm',
              compact ? 'h-7 w-7' : 'h-8 w-8'
            )}>
              <MapPin className={cn(compact ? 'h-4 w-4' : 'h-4.5 w-4.5', 'text-white')} />
            </div>
            <div>
              <h3 className={cn(
                'font-bold tracking-tight text-forest-800',
                compact ? 'text-sm' : 'text-base'
              )}>
                {selectorMode ? 'Select Rank' : 'Trail to Eagle'}
              </h3>
              <p className="text-[10px] font-medium uppercase tracking-wider text-forest-600/70">
                {selectorMode ? 'Click a rank to view requirements' : 'Rank Advancement'}
              </p>
            </div>
          </div>

          {/* Guide Compass Button - only show in non-selector mode */}
          {!selectorMode && <Popover open={guideOpen} onOpenChange={setGuideOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  'group flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all',
                  'border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50',
                  'hover:border-amber-300 hover:from-amber-100 hover:to-orange-100 hover:shadow-sm',
                  guideOpen && 'border-amber-300 from-amber-100 to-orange-100 shadow-sm'
                )}
              >
                <div className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm transition-transform',
                  'group-hover:scale-110'
                )}>
                  <Compass className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-xs font-semibold text-amber-800">Guide</span>
                <ChevronRight className={cn(
                  'h-3.5 w-3.5 text-amber-500 transition-transform',
                  guideOpen && 'rotate-90'
                )} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="border-b bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                    <Compass className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-900">Trail Guide</h4>
                    <p className="text-[10px] text-amber-700">What to work on next</p>
                  </div>
                </div>
              </div>
              <div className="divide-y">
                {suggestions.map((suggestion, index) => {
                  const isFocus = suggestion.type === 'focus'
                  return (
                    <div
                      key={index}
                      className={cn(
                        'px-4 py-3',
                        isFocus && onRankClick && 'cursor-pointer hover:bg-stone-50'
                      )}
                      onClick={() => {
                        if (isFocus && onRankClick) {
                          // Navigate to the next rank
                          const nextRank = currentInProgressRank || ranksWithState.find(r => r.state === 'future')
                          if (nextRank) {
                            onRankClick(nextRank.code)
                            setGuideOpen(false)
                          }
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                          suggestion.type === 'focus' && 'bg-forest-100 text-forest-600',
                          suggestion.type === 'tip' && 'bg-blue-100 text-blue-600',
                          suggestion.type === 'milestone' && 'bg-amber-100 text-amber-600'
                        )}>
                          {suggestion.type === 'focus' && <ChevronRight className="h-3.5 w-3.5" />}
                          {suggestion.type === 'tip' && <Sparkles className="h-3.5 w-3.5" />}
                          {suggestion.type === 'milestone' && <Check className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-stone-800">{suggestion.text}</p>
                          {suggestion.detail && (
                            <p className="mt-0.5 text-xs text-stone-500">{suggestion.detail}</p>
                          )}
                          {isFocus && onRankClick && (
                            <p className="mt-1.5 text-xs font-medium text-forest-600">
                              Click to view requirements →
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>}
        </div>

        {/* Trail visualization */}
        <div className="relative">
          {/* Scrollable container for mobile */}
          <div className="px-4 sm:px-5 md:px-6">
            <div className={cn(
              'relative flex items-end justify-between',
              compact ? 'pb-2 pt-4' : 'pb-2 pt-6 sm:pt-8'
            )}>
              {/* Trail path background - styled like a dirt path */}
              <div className="absolute inset-x-4 bottom-[38px] h-1.5 sm:inset-x-5 sm:bottom-[46px] sm:h-2 md:inset-x-6 md:bottom-[54px]">
                {/* Path base */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-stone-300 to-stone-400 shadow-inner" />

                {/* Completed trail - hidden in selector mode */}
                {!selectorMode && (() => {
                  const lastAwarded = ranksWithState.filter(r => r.state === 'awarded').length
                  const inProgressIndex = ranksWithState.findIndex(r => r.state === 'in_progress')
                  const progressWidth = inProgressIndex >= 0
                    ? ((inProgressIndex + (progressPercent / 100)) / (ALL_RANKS.length - 1)) * 100
                    : (lastAwarded / (ALL_RANKS.length - 1)) * 100

                  return (
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-b from-forest-500 to-forest-600 shadow-sm transition-all duration-700"
                      style={{ width: `${Math.min(progressWidth, 100)}%` }}
                    />
                  )
                })()}
              </div>

              {/* Trail markers */}
              {ranksWithState.map((rank) => {
                const isClickable = !!onRankClick
                const isSelected = selectedRank === rank.code

                return (
                  <div
                    key={rank.code}
                    className="relative z-10 flex flex-col items-center"
                  >
                    {/* Clickable badge area - using div to avoid focus-induced scrolling */}
                    <div
                      role={isClickable ? 'button' : undefined}
                      tabIndex={isClickable ? 0 : undefined}
                      onClick={() => isClickable && onRankClick?.(rank.code)}
                      onKeyDown={(e) => {
                        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault()
                          onRankClick?.(rank.code)
                        }
                      }}
                      className={cn(
                        'relative flex flex-col items-center transition-all duration-200',
                        isClickable && 'cursor-pointer',
                        !isClickable && 'cursor-default'
                      )}
                    >
                      {/* Badge image container */}
                      <div
                        className={cn(
                          'relative transition-transform duration-200',
                          'h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12',
                          isSelected && 'scale-150 sm:scale-[1.75] md:scale-[2]',
                          isClickable && !isSelected && 'hover:scale-110'
                        )}
                      >
                        {/* Badge image - responsive sizing */}
                        <Image
                          src={rank.image_url}
                          alt={rank.name}
                          fill
                          sizes="(max-width: 640px) 32px, (max-width: 768px) 40px, 48px"
                          className="object-contain drop-shadow-md"
                        />
                      </div>

                      {/* Status indicator - positioned below the badge */}
                      <div className={cn(
                        'mt-1.5 flex h-5 items-center justify-center transition-all duration-200',
                        isSelected && 'mt-3 sm:mt-4 md:mt-5'
                      )}>
                        {selectorMode ? (
                          /* In selector mode, show a simple indicator for selected state */
                          isSelected ? (
                            <div className="h-2 w-2 rounded-full bg-forest-500" />
                          ) : (
                            <div className="h-2 w-2 rounded-full bg-stone-300" />
                          )
                        ) : rank.state === 'awarded' ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 shadow-sm">
                            <Check className="h-3 w-3 text-white" strokeWidth={3} />
                          </div>
                        ) : (
                          <span className={cn(
                            'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                            rank.state === 'in_progress'
                              ? 'bg-forest-500 text-white'
                              : 'bg-stone-300 text-stone-600'
                          )}>
                            {rank.progressPercent}%
                          </span>
                        )}
                      </div>

                      {/* Rank name - using shortName for consistent width */}
                      <span
                        className={cn(
                          'mt-1 whitespace-nowrap text-center text-xs font-semibold sm:text-sm',
                          selectorMode
                            ? isSelected ? 'font-bold text-forest-700' : 'text-stone-600'
                            : cn(
                                rank.state === 'awarded' && 'text-stone-700',
                                rank.state === 'in_progress' && 'text-forest-700',
                                rank.state === 'future' && 'text-stone-500',
                                isSelected && 'font-bold text-forest-700'
                              )
                        )}
                      >
                        {rank.shortName}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>

        {/* Journey stats - hidden in compact mode and selector mode */}
        {!compact && !selectorMode && (
          <div className="relative mt-4 flex items-center justify-center gap-4 border-t border-stone-200/60 pt-4 text-xs text-stone-500">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <span>{ranksWithState.filter(r => r.state === 'awarded').length} Earned</span>
            </div>
            {currentInProgressRank && (
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-forest-500" />
                <span>Working on {currentInProgressRank.name}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-stone-300" />
              <span>{ranksWithState.filter(r => r.state === 'future').length} Ahead</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
