'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { TentTree, Footprints, Heart, TreePine, Calendar, MapPin, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActivityEntry {
  id: string
  activity_type: 'camping' | 'hiking' | 'service' | 'conservation'
  activity_date: string
  value: number
  description: string | null
  location: string | null
}

interface ActivityTotals {
  camping: number
  hiking: number
  service: number
  conservation: number
}

interface ActivityStatsProps {
  entries: ActivityEntry[]
  totals: ActivityTotals
  scoutId: string
  unitId: string
  canEdit: boolean
}

// BSA requirements for Eagle rank
const EAGLE_REQUIREMENTS = {
  camping: 20, // nights
  hiking: 0, // no minimum miles
  service: 0, // tracked separately in merit badge requirements
  conservation: 0, // tracked separately in merit badge requirements
}

// BSA requirements for camping milestones
const CAMPING_MILESTONES = [
  { nights: 10, label: '10 Nights' },
  { nights: 20, label: '20 Nights' },
  { nights: 50, label: '50 Nights Award' },
  { nights: 100, label: '100 Nights Award' },
]

const activityConfig = {
  camping: {
    icon: TentTree,
    label: 'Camping',
    unit: 'nights',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  hiking: {
    icon: Footprints,
    label: 'Hiking',
    unit: 'miles',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  service: {
    icon: Heart,
    label: 'Service',
    unit: 'hours',
    color: 'text-rose-600',
    bgColor: 'bg-rose-100',
  },
  conservation: {
    icon: TreePine,
    label: 'Conservation',
    unit: 'hours',
    color: 'text-forest-600',
    bgColor: 'bg-forest-100',
  },
}

export function ActivityStats({ entries, totals, scoutId, unitId, canEdit }: ActivityStatsProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  const filteredEntries = activeFilter
    ? entries.filter((e) => e.activity_type === activeFilter)
    : entries

  // Sort entries by date descending
  const sortedEntries = [...filteredEntries].sort(
    (a, b) => new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime()
  )

  // Calculate camping milestone progress
  const campingProgress = totals.camping
  const nextMilestone = CAMPING_MILESTONES.find((m) => m.nights > campingProgress)
  const currentMilestone = [...CAMPING_MILESTONES]
    .reverse()
    .find((m) => m.nights <= campingProgress)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(activityConfig).map(([type, config]) => {
          const Icon = config.icon
          const total = totals[type as keyof ActivityTotals]
          const isActive = activeFilter === type

          return (
            <button
              key={type}
              onClick={() => setActiveFilter(isActive ? null : type)}
              className={cn(
                'rounded-lg border p-4 text-left transition-all',
                isActive
                  ? 'border-stone-400 bg-stone-100 ring-1 ring-stone-400'
                  : 'hover:border-stone-300 hover:bg-stone-50'
              )}
            >
              <div className="flex items-center justify-between">
                <div className={cn('rounded-full p-2', config.bgColor)}>
                  <Icon className={cn('h-4 w-4', config.color)} />
                </div>
                {isActive && (
                  <Badge variant="secondary" className="text-xs">
                    Filtered
                  </Badge>
                )}
              </div>
              <div className="mt-3">
                <p className="text-2xl font-semibold text-stone-900">
                  {type === 'hiking' ? total.toFixed(1) : total}
                </p>
                <p className="text-sm text-stone-500">
                  {config.label} ({config.unit})
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Camping Milestone Progress */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-stone-900">Camping Milestones</h4>
            <p className="text-sm text-stone-500">
              {campingProgress} nights logged
              {currentMilestone && ` • ${currentMilestone.label} achieved`}
            </p>
          </div>
          {nextMilestone && (
            <Badge variant="outline" className="text-xs">
              {nextMilestone.nights - campingProgress} nights to {nextMilestone.label}
            </Badge>
          )}
        </div>
        <div className="mt-4 flex gap-1">
          {CAMPING_MILESTONES.map((milestone) => {
            const progress = Math.min(100, (campingProgress / milestone.nights) * 100)
            const achieved = campingProgress >= milestone.nights

            return (
              <div key={milestone.nights} className="flex-1">
                <div
                  className={cn(
                    'h-2 rounded-full transition-colors',
                    achieved ? 'bg-forest-500' : 'bg-stone-200'
                  )}
                  style={{
                    background: !achieved
                      ? `linear-gradient(to right, rgb(34 197 94) ${progress}%, rgb(231 229 228) ${progress}%)`
                      : undefined,
                  }}
                />
                <p
                  className={cn(
                    'mt-1 text-center text-xs',
                    achieved ? 'font-medium text-forest-600' : 'text-stone-400'
                  )}
                >
                  {milestone.nights}
                </p>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Recent Entries */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="font-medium text-stone-900">
            {activeFilter
              ? `${activityConfig[activeFilter as keyof typeof activityConfig].label} Entries`
              : 'Recent Activities'}
          </h4>
          {canEdit && (
            <Button variant="outline" size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Log Activity
            </Button>
          )}
        </div>

        {sortedEntries.length > 0 ? (
          <div className="space-y-2">
            {sortedEntries.slice(0, 10).map((entry) => {
              const config = activityConfig[entry.activity_type]
              const Icon = config.icon

              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-stone-50"
                >
                  <div className={cn('rounded-full p-2', config.bgColor)}>
                    <Icon className={cn('h-4 w-4', config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-stone-900">
                          {entry.value} {config.unit}
                          {entry.value !== 1 && entry.activity_type !== 'hiking' ? '' : ''}
                        </p>
                        {entry.description && (
                          <p className="text-sm text-stone-600 truncate">{entry.description}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm text-stone-500">
                          {new Date(entry.activity_date).toLocaleDateString()}
                        </p>
                        {entry.location && (
                          <p className="flex items-center gap-1 text-xs text-stone-400">
                            <MapPin className="h-3 w-3" />
                            {entry.location}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            {sortedEntries.length > 10 && (
              <p className="text-center text-sm text-stone-500 pt-2">
                + {sortedEntries.length - 10} more entries
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <Calendar className="mx-auto h-6 w-6 text-stone-400" />
            <p className="mt-2 text-sm text-stone-500">
              {activeFilter ? 'No entries for this activity type' : 'No activities logged yet'}
            </p>
            {canEdit && !activeFilter && (
              <Button variant="outline" className="mt-3" size="sm">
                Log First Activity
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
