'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { ChevronDown, ChevronRight, Check, Clock, AlertCircle } from 'lucide-react'
import { markRequirementComplete } from '@/app/actions/advancement'
import { cn } from '@/lib/utils'
import { RankIcon } from './rank-icon'

interface RankProgressCardProps {
  rank: {
    id: string
    status: string
    started_at: string | null
    completed_at: string | null
    approved_at: string | null
    awarded_at: string | null
    bsa_ranks: {
      id: string
      code: string
      name: string
      display_order: number
    }
    scout_rank_requirement_progress: Array<{
      id: string
      status: string
      completed_at: string | null
      approval_status: string | null
      bsa_rank_requirements: {
        id: string
        requirement_number: string
        description: string
      }
    }>
  }
  scoutId: string
  unitId: string
  canEdit: boolean
}

export function RankProgressCard({ rank, scoutId, unitId, canEdit }: RankProgressCardProps) {
  const [isExpanded, setIsExpanded] = useState(rank.status === 'in_progress')
  const [loading, setLoading] = useState<string | null>(null)

  const completedCount = rank.scout_rank_requirement_progress.filter(
    (r) => r.status === 'completed' || r.status === 'approved' || r.status === 'awarded'
  ).length
  const totalCount = rank.scout_rank_requirement_progress.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const statusColors: Record<string, string> = {
    not_started: 'bg-stone-100 text-stone-600',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    awarded: 'bg-forest-100 text-forest-700',
  }

  const statusLabels: Record<string, string> = {
    not_started: 'Not Started',
    in_progress: 'In Progress',
    completed: 'Completed',
    approved: 'Approved',
    awarded: 'Awarded',
  }

  const handleToggleRequirement = async (requirementProgressId: string, currentStatus: string) => {
    if (!canEdit || loading) return

    // Only allow toggling if not already completed
    if (currentStatus !== 'not_started' && currentStatus !== 'in_progress') return

    setLoading(requirementProgressId)
    try {
      await markRequirementComplete(requirementProgressId, unitId)
    } catch (error) {
      console.error('Error toggling requirement:', error)
    } finally {
      setLoading(null)
    }
  }

  return (
    <Card
      className={cn(
        'transition-all',
        rank.status === 'in_progress' && 'border-blue-200 bg-blue-50/30',
        rank.status === 'awarded' && 'border-forest-200 bg-forest-50/30'
      )}
    >
      <CardContent className="p-4">
        {/* Header */}
        <button
          className="flex w-full items-center justify-between text-left"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-stone-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-stone-400" />
            )}
            <RankIcon rank={rank.bsa_ranks} size="md" />
            <div>
              <h3 className="text-lg font-semibold text-stone-900">{rank.bsa_ranks.name}</h3>
              {rank.status !== 'not_started' && rank.status !== 'awarded' && (
                <div className="mt-1 flex items-center gap-2">
                  <Progress value={progressPercent} className="h-2 w-24" />
                  <span className="text-xs text-stone-500">
                    {completedCount}/{totalCount}
                  </span>
                </div>
              )}
            </div>
          </div>
          <Badge className={statusColors[rank.status] || statusColors.not_started}>
            {statusLabels[rank.status] || 'Unknown'}
          </Badge>
        </button>

        {/* Expanded Requirements */}
        {isExpanded && (
          <div className="mt-4 space-y-2 border-t pt-4">
            {rank.scout_rank_requirement_progress.length > 0 ? (
              rank.scout_rank_requirement_progress.map((req) => (
                <div
                  key={req.id}
                  className={cn(
                    'flex items-start gap-3 rounded-lg p-2 transition-colors',
                    req.status === 'completed' ||
                      req.status === 'approved' ||
                      req.status === 'awarded'
                      ? 'bg-success-light/50'
                      : req.approval_status === 'pending_approval'
                        ? 'bg-amber-50'
                        : 'hover:bg-stone-50'
                  )}
                >
                  {canEdit ? (
                    <Checkbox
                      checked={
                        req.status === 'completed' ||
                        req.status === 'approved' ||
                        req.status === 'awarded'
                      }
                      disabled={
                        loading === req.id ||
                        req.status === 'approved' ||
                        req.status === 'awarded'
                      }
                      onCheckedChange={() => handleToggleRequirement(req.id, req.status)}
                      className="mt-0.5"
                    />
                  ) : (
                    <div className="mt-0.5">
                      {req.status === 'completed' ||
                      req.status === 'approved' ||
                      req.status === 'awarded' ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : req.approval_status === 'pending_approval' ? (
                        <Clock className="h-4 w-4 text-amber-500" />
                      ) : (
                        <div className="h-4 w-4 rounded border border-stone-300" />
                      )}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          'text-sm',
                          (req.status === 'completed' ||
                            req.status === 'approved' ||
                            req.status === 'awarded') &&
                            'text-stone-500 line-through'
                        )}
                      >
                        <span className="font-medium">
                          {req.bsa_rank_requirements.requirement_number}.
                        </span>{' '}
                        {req.bsa_rank_requirements.description}
                      </p>
                      {req.approval_status === 'pending_approval' && (
                        <Badge variant="outline" className="shrink-0 text-xs text-amber-600">
                          <Clock className="mr-1 h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                      {req.approval_status === 'denied' && (
                        <Badge variant="outline" className="shrink-0 text-xs text-red-600">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Denied
                        </Badge>
                      )}
                    </div>
                    {req.completed_at && (
                      <p className="mt-1 text-xs text-stone-400">
                        Completed: {new Date(req.completed_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-stone-500">No requirements loaded</p>
            )}
          </div>
        )}

        {/* Actions */}
        {isExpanded && canEdit && rank.status === 'in_progress' && completedCount === totalCount && (
          <div className="mt-4 flex justify-end border-t pt-4">
            <Button size="sm">Submit for Approval</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
