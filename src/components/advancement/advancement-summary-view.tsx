'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'
import {
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Award,
  PartyPopper,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RankProgress {
  id: string
  scout_id: string
  status: string
  awarded_at: string | null
  bsa_ranks: { id: string; name: string; code: string; display_order: number } | null
  scout_rank_requirement_progress: Array<{
    id: string
    status: string
    completed_at: string | null
  }>
}

interface Scout {
  id: string
  first_name: string
  last_name: string
  rank: string | null
  patrols: { name: string } | null
}

interface PendingApproval {
  id: string
  status: string
  approval_status: string | null
  submission_notes: string | null
  submitted_at: string | null
  scout_rank_progress: {
    id: string
    scout_id: string
    scouts: { id: string; first_name: string; last_name: string } | null
    bsa_ranks: { name: string } | null
  } | null
  bsa_rank_requirements: { requirement_number: string; description: string } | null
}

interface PendingBadgeApproval {
  id: string
  status: string
  completed_at: string | null
  scout_id: string
  scouts: { id: string; first_name: string; last_name: string } | null
  bsa_merit_badges: { id: string; name: string; is_eagle_required: boolean | null } | null
}

interface AdvancementSummaryViewProps {
  scouts: Scout[]
  rankProgress: RankProgress[]
  pendingApprovals: PendingApproval[]
  pendingBadgeApprovals: PendingBadgeApproval[]
  onPendingApprovalsClick?: () => void
  canEdit: boolean
}

// Calculate scouts ready for Board of Review (100% complete, not awarded)
function getReadyForBOR(
  scouts: Scout[],
  rankProgress: RankProgress[]
): Array<{ scout: Scout; rank: RankProgress }> {
  const result: Array<{ scout: Scout; rank: RankProgress }> = []

  for (const scout of scouts) {
    const scoutRanks = rankProgress.filter((r) => r.scout_id === scout.id)
    // Find in-progress or completed (but not awarded) rank
    const candidateRank = scoutRanks.find(
      (r) => r.status === 'completed' || r.status === 'in_progress'
    )

    if (candidateRank && candidateRank.scout_rank_requirement_progress.length > 0) {
      const totalReqs = candidateRank.scout_rank_requirement_progress.length
      const completedReqs = candidateRank.scout_rank_requirement_progress.filter(
        (req) => ['completed', 'approved', 'awarded'].includes(req.status)
      ).length

      // 100% complete but not yet awarded
      if (completedReqs === totalReqs && candidateRank.status !== 'awarded') {
        result.push({ scout, rank: candidateRank })
      }
    }
  }

  return result
}

// Calculate scouts close to rank advancement (75%+ complete)
function getCloseToAdvancement(
  scouts: Scout[],
  rankProgress: RankProgress[]
): Array<{ scout: Scout; rank: RankProgress; completedCount: number; totalCount: number; percent: number }> {
  const result: Array<{
    scout: Scout
    rank: RankProgress
    completedCount: number
    totalCount: number
    percent: number
  }> = []

  for (const scout of scouts) {
    const scoutRanks = rankProgress.filter((r) => r.scout_id === scout.id)
    const inProgressRank = scoutRanks.find((r) => r.status === 'in_progress')

    if (inProgressRank && inProgressRank.scout_rank_requirement_progress.length > 0) {
      const totalReqs = inProgressRank.scout_rank_requirement_progress.length
      const completedReqs = inProgressRank.scout_rank_requirement_progress.filter(
        (req) => ['completed', 'approved', 'awarded'].includes(req.status)
      ).length

      const percent = Math.round((completedReqs / totalReqs) * 100)

      // 75%+ but not 100% (those are BOR-ready)
      if (percent >= 75 && percent < 100) {
        result.push({
          scout,
          rank: inProgressRank,
          completedCount: completedReqs,
          totalCount: totalReqs,
          percent,
        })
      }
    }
  }

  // Sort by percent descending (closest to completion first)
  return result.sort((a, b) => b.percent - a.percent)
}

// Calculate scouts needing attention (60+ days no progress OR 6+ months at same rank)
function getNeedsAttention(
  scouts: Scout[],
  rankProgress: RankProgress[]
): Array<{ scout: Scout; reason: string; lastActivityDate: Date | null }> {
  const result: Array<{ scout: Scout; reason: string; lastActivityDate: Date | null }> = []
  const now = new Date()
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)

  for (const scout of scouts) {
    const scoutRanks = rankProgress.filter((r) => r.scout_id === scout.id)

    // Check 1: No progress in 60+ days
    let lastActivityDate: Date | null = null
    for (const rank of scoutRanks) {
      for (const req of rank.scout_rank_requirement_progress) {
        if (req.completed_at) {
          const completedDate = new Date(req.completed_at)
          if (!lastActivityDate || completedDate > lastActivityDate) {
            lastActivityDate = completedDate
          }
        }
      }
    }

    // If they have progress but it's been 60+ days
    if (lastActivityDate && lastActivityDate < sixtyDaysAgo) {
      result.push({
        scout,
        reason: `No progress in ${Math.floor((now.getTime() - lastActivityDate.getTime()) / (24 * 60 * 60 * 1000))} days`,
        lastActivityDate,
      })
      continue
    }

    // Check 2: At same rank for 6+ months (based on last awarded_at)
    const awardedRanks = scoutRanks.filter((r) => r.status === 'awarded' && r.awarded_at)
    if (awardedRanks.length > 0) {
      // Find the most recently awarded rank
      const lastAwarded = awardedRanks.sort(
        (a, b) => new Date(b.awarded_at!).getTime() - new Date(a.awarded_at!).getTime()
      )[0]

      const awardedDate = new Date(lastAwarded.awarded_at!)

      // Check if they're NOT working on the next rank
      const hasInProgressRank = scoutRanks.some((r) => r.status === 'in_progress')

      if (!hasInProgressRank && awardedDate < sixMonthsAgo) {
        result.push({
          scout,
          reason: `At ${lastAwarded.bsa_ranks?.name || 'current rank'} for 6+ months`,
          lastActivityDate: awardedDate,
        })
      }
    }

    // Check 3: No progress at all and no activity
    if (!lastActivityDate && scoutRanks.length === 0) {
      result.push({
        scout,
        reason: 'No rank progress started',
        lastActivityDate: null,
      })
    }
  }

  return result
}

export function AdvancementSummaryView({
  scouts,
  rankProgress,
  pendingApprovals,
  pendingBadgeApprovals,
  onPendingApprovalsClick,
  canEdit,
}: AdvancementSummaryViewProps) {
  const [borExpanded, setBorExpanded] = useState(true)
  const [closeExpanded, setCloseExpanded] = useState(true)
  const [attentionExpanded, setAttentionExpanded] = useState(true)

  // Calculate actionable lists
  const readyForBOR = useMemo(() => getReadyForBOR(scouts, rankProgress), [scouts, rankProgress])
  const closeToAdvancement = useMemo(
    () => getCloseToAdvancement(scouts, rankProgress),
    [scouts, rankProgress]
  )
  const needsAttention = useMemo(
    () => getNeedsAttention(scouts, rankProgress),
    [scouts, rankProgress]
  )

  // Total pending approvals (rank requirements + merit badges)
  const totalPendingCount = pendingApprovals.length + pendingBadgeApprovals.length

  // Show limits
  const BOR_SHOW_LIMIT = 10
  const CLOSE_SHOW_LIMIT = 10
  const ATTENTION_SHOW_LIMIT = 10

  return (
    <div className="space-y-4">
      {/* Pending Approvals Card - Most prominent */}
      {canEdit && (
        <Card
          className={cn(
            'border-rose-200 bg-gradient-to-br from-rose-50 to-red-50 transition-all',
            totalPendingCount > 0 && 'cursor-pointer hover:border-rose-300 hover:shadow-md'
          )}
          onClick={totalPendingCount > 0 ? onPendingApprovalsClick : undefined}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2 text-rose-800">
                <Clock className="h-5 w-5" />
                Pending Approvals
              </span>
              <Badge
                variant={totalPendingCount > 0 ? 'destructive' : 'secondary'}
                className="text-sm"
              >
                {totalPendingCount}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {totalPendingCount > 0 ? (
              <p className="text-sm text-rose-700">
                {pendingApprovals.length > 0 && `${pendingApprovals.length} requirement${pendingApprovals.length !== 1 ? 's' : ''}`}
                {pendingApprovals.length > 0 && pendingBadgeApprovals.length > 0 && ' and '}
                {pendingBadgeApprovals.length > 0 && `${pendingBadgeApprovals.length} merit badge${pendingBadgeApprovals.length !== 1 ? 's' : ''}`}
                {' '}waiting for approval. Click to review.
              </p>
            ) : (
              <p className="text-sm text-rose-600/70">No pending approvals - all caught up!</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ready for Board of Review */}
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardHeader className="pb-2">
          <button
            onClick={() => setBorExpanded(!borExpanded)}
            className="flex w-full items-center justify-between text-left"
          >
            <CardTitle className="flex items-center gap-2 text-base text-green-800">
              {borExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <CheckCircle2 className="h-5 w-5" />
              Ready for Board of Review
            </CardTitle>
            <Badge variant="outline" className="border-green-300 bg-green-100 text-green-800">
              {readyForBOR.length}
            </Badge>
          </button>
        </CardHeader>
        {borExpanded && (
          <CardContent className="pt-0">
            {readyForBOR.length > 0 ? (
              <div className="space-y-2">
                {readyForBOR.slice(0, BOR_SHOW_LIMIT).map(({ scout, rank }) => (
                  <div
                    key={scout.id}
                    className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <PartyPopper className="h-4 w-4 text-green-600" />
                      <Link
                        href={`/scouts/${scout.id}`}
                        className="font-medium text-stone-900 hover:text-forest-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {scout.first_name} {scout.last_name}
                      </Link>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {rank.bsa_ranks?.name}
                    </Badge>
                  </div>
                ))}
                {readyForBOR.length > BOR_SHOW_LIMIT && (
                  <p className="text-center text-xs text-green-700">
                    +{readyForBOR.length - BOR_SHOW_LIMIT} more scouts ready
                  </p>
                )}
              </div>
            ) : (
              <p className="py-2 text-center text-sm text-green-700/70">
                No scouts ready for Board of Review right now
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Close to Rank Advancement */}
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
        <CardHeader className="pb-2">
          <button
            onClick={() => setCloseExpanded(!closeExpanded)}
            className="flex w-full items-center justify-between text-left"
          >
            <CardTitle className="flex items-center gap-2 text-base text-amber-800">
              {closeExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <TrendingUp className="h-5 w-5" />
              Close to Rank Advancement
            </CardTitle>
            <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-800">
              {closeToAdvancement.length}
            </Badge>
          </button>
        </CardHeader>
        {closeExpanded && (
          <CardContent className="pt-0">
            {closeToAdvancement.length > 0 ? (
              <div className="space-y-2">
                {closeToAdvancement.slice(0, CLOSE_SHOW_LIMIT).map(({ scout, rank, completedCount, totalCount, percent }) => (
                  <div
                    key={scout.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-white/60 px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <Award className="h-4 w-4 text-amber-600" />
                      <Link
                        href={`/scouts/${scout.id}`}
                        className="font-medium text-stone-900 hover:text-forest-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {scout.first_name} {scout.last_name}
                      </Link>
                      <Badge variant="secondary" className="text-xs">
                        {rank.bsa_ranks?.name}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={percent} className="h-2 w-16" />
                      <span className="text-xs font-medium text-amber-800">
                        {completedCount}/{totalCount}
                      </span>
                    </div>
                  </div>
                ))}
                {closeToAdvancement.length > CLOSE_SHOW_LIMIT && (
                  <p className="text-center text-xs text-amber-700">
                    +{closeToAdvancement.length - CLOSE_SHOW_LIMIT} more scouts close to advancement
                  </p>
                )}
              </div>
            ) : (
              <p className="py-2 text-center text-sm text-amber-700/70">
                No scouts at 75%+ progress right now - keep encouraging them!
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Needs Attention */}
      <Card className="border-stone-200 bg-gradient-to-br from-stone-50 to-slate-50">
        <CardHeader className="pb-2">
          <button
            onClick={() => setAttentionExpanded(!attentionExpanded)}
            className="flex w-full items-center justify-between text-left"
          >
            <CardTitle className="flex items-center gap-2 text-base text-stone-700">
              {attentionExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <AlertCircle className="h-5 w-5" />
              Needs Attention
            </CardTitle>
            <Badge variant="outline" className="border-stone-300 bg-stone-100 text-stone-700">
              {needsAttention.length}
            </Badge>
          </button>
        </CardHeader>
        {attentionExpanded && (
          <CardContent className="pt-0">
            {needsAttention.length > 0 ? (
              <div className="space-y-2">
                {needsAttention.slice(0, ATTENTION_SHOW_LIMIT).map(({ scout, reason }) => (
                  <div
                    key={scout.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-white/60 px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-4 w-4 text-stone-500" />
                      <Link
                        href={`/scouts/${scout.id}`}
                        className="font-medium text-stone-900 hover:text-forest-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {scout.first_name} {scout.last_name}
                      </Link>
                    </div>
                    <span className="text-xs text-stone-500">{reason}</span>
                  </div>
                ))}
                {needsAttention.length > ATTENTION_SHOW_LIMIT && (
                  <p className="text-center text-xs text-stone-600">
                    +{needsAttention.length - ATTENTION_SHOW_LIMIT} more scouts need attention
                  </p>
                )}
              </div>
            ) : (
              <p className="py-2 text-center text-sm text-stone-600/70">
                All scouts are actively progressing - great job!
              </p>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
