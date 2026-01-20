'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Calendar, Clock, Star, Award, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LeadershipPosition {
  id: string
  start_date: string
  end_date: string | null
  notes: string | null
  bsa_leadership_positions: {
    id: string
    code: string | null
    name: string
    qualifies_for_star: boolean | null
    qualifies_for_life: boolean | null
    qualifies_for_eagle: boolean | null
    min_tenure_months: number | null
  }
}

interface LeadershipTimelineProps {
  history: LeadershipPosition[]
  scoutId: string
  unitId: string
  canEdit: boolean
}

export function LeadershipTimeline({ history, scoutId, unitId, canEdit }: LeadershipTimelineProps) {
  const currentPositions = history.filter((p) => !p.end_date)
  const pastPositions = history.filter((p) => p.end_date)

  const calculateMonthsServed = (startDate: string, endDate: string | null): number => {
    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : new Date()
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
    return Math.max(0, months)
  }

  const getQualificationBadges = (position: LeadershipPosition['bsa_leadership_positions']) => {
    const badges = []
    if (position.qualifies_for_star === true) badges.push({ label: 'Star', icon: Star })
    if (position.qualifies_for_life === true) badges.push({ label: 'Life', icon: Award })
    if (position.qualifies_for_eagle === true) badges.push({ label: 'Eagle', icon: Shield })
    return badges
  }

  const PositionCard = ({ position, isCurrent }: { position: LeadershipPosition; isCurrent: boolean }) => {
    const monthsServed = calculateMonthsServed(position.start_date, position.end_date)
    const minMonths = position.bsa_leadership_positions.min_tenure_months ?? 0
    const meetsRequirement = monthsServed >= minMonths
    const qualifications = getQualificationBadges(position.bsa_leadership_positions)

    return (
      <div
        className={cn(
          'relative rounded-lg border p-4',
          isCurrent ? 'border-blue-200 bg-blue-50/50' : 'border-stone-200 bg-stone-50/50'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full',
                isCurrent ? 'bg-blue-100' : 'bg-stone-100'
              )}
            >
              <Users className={cn('h-5 w-5', isCurrent ? 'text-blue-600' : 'text-stone-500')} />
            </div>
            <div>
              <h4 className="font-medium text-stone-900">
                {position.bsa_leadership_positions.name}
              </h4>
              <div className="mt-1 flex items-center gap-2 text-sm text-stone-500">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {new Date(position.start_date).toLocaleDateString()}
                  {position.end_date
                    ? ` - ${new Date(position.end_date).toLocaleDateString()}`
                    : ' - Present'}
                </span>
              </div>
              {qualifications.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {qualifications.map(({ label, icon: Icon }) => (
                    <Badge
                      key={label}
                      variant="outline"
                      className="text-xs text-stone-600"
                    >
                      <Icon className="mr-1 h-3 w-3" />
                      {label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div
              className={cn(
                'text-sm font-medium',
                meetsRequirement ? 'text-forest-600' : 'text-amber-600'
              )}
            >
              {monthsServed} mo
            </div>
            <div className="text-xs text-stone-400">
              {minMonths} mo required
            </div>
            {meetsRequirement && (
              <Badge className="mt-1 bg-forest-100 text-forest-700 text-xs">
                Complete
              </Badge>
            )}
          </div>
        </div>
        {position.notes && (
          <p className="mt-3 text-sm text-stone-500 border-t pt-3">{position.notes}</p>
        )}
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <Users className="mx-auto h-8 w-8 text-stone-400" />
        <p className="mt-2 text-stone-500">No leadership positions recorded</p>
        {canEdit && (
          <Button variant="outline" className="mt-4" size="sm">
            Add Position
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Positions */}
      {currentPositions.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <h4 className="font-medium text-stone-900">Current Positions</h4>
            <Badge variant="secondary" className="text-xs">
              {currentPositions.length}
            </Badge>
          </div>
          <div className="space-y-3">
            {currentPositions.map((position) => (
              <PositionCard key={position.id} position={position} isCurrent={true} />
            ))}
          </div>
        </div>
      )}

      {/* Past Positions */}
      {pastPositions.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-stone-500" />
            <h4 className="font-medium text-stone-900">Past Positions</h4>
            <Badge variant="secondary" className="text-xs">
              {pastPositions.length}
            </Badge>
          </div>
          <div className="space-y-3">
            {pastPositions
              .sort((a, b) => new Date(b.end_date!).getTime() - new Date(a.end_date!).getTime())
              .map((position) => (
                <PositionCard key={position.id} position={position} isCurrent={false} />
              ))}
          </div>
        </div>
      )}

      {/* Add Position Button */}
      {canEdit && (
        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm">
            Add Position
          </Button>
        </div>
      )}
    </div>
  )
}
