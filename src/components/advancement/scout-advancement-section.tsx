'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { RankProgressCard } from './rank-progress-card'
import { MeritBadgeCard } from './merit-badge-card'
import { LeadershipTimeline } from './leadership-timeline'
import { ActivityStats } from './activity-stats'
import { isFeatureEnabled, FeatureFlag } from '@/lib/feature-flags'
import {
  Award,
  Star,
  Clock,
  TentTree,
  Footprints,
  Heart,
  TreePine,
} from 'lucide-react'

interface RankProgress {
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
  }
  scout_merit_badge_requirement_progress: Array<{
    id: string
    status: string
    completed_at: string | null
  }>
}

interface LeadershipHistory {
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

interface ScoutAdvancementSectionProps {
  scoutId: string
  unitId: string
  scoutName: string
  currentRank: string | null
  rankProgress: RankProgress[]
  meritBadgeProgress: MeritBadgeProgress[]
  leadershipHistory: LeadershipHistory[]
  activityEntries: ActivityEntry[]
  activityTotals: ActivityTotals
  canEdit: boolean
}

export function ScoutAdvancementSection({
  scoutId,
  unitId,
  scoutName,
  currentRank,
  rankProgress,
  meritBadgeProgress,
  leadershipHistory,
  activityEntries,
  activityTotals,
  canEdit,
}: ScoutAdvancementSectionProps) {
  const [activeTab, setActiveTab] = useState('rank')

  // Check if feature is enabled
  if (!isFeatureEnabled(FeatureFlag.ADVANCEMENT_TRACKING)) {
    return null
  }

  // Calculate progress statistics
  const inProgressRanks = rankProgress.filter(
    (r) => r.status === 'in_progress' || r.status === 'completed'
  )
  const currentRankProgress = inProgressRanks[0]
  const completedRequirements = currentRankProgress?.scout_rank_requirement_progress.filter(
    (r) => r.status === 'completed' || r.status === 'approved' || r.status === 'awarded'
  ).length ?? 0
  const totalRequirements = currentRankProgress?.scout_rank_requirement_progress.length ?? 0
  const progressPercent = totalRequirements > 0 ? Math.round((completedRequirements / totalRequirements) * 100) : 0

  const inProgressBadges = meritBadgeProgress.filter((b) => b.status === 'in_progress')
  const earnedBadges = meritBadgeProgress.filter((b) => b.status === 'awarded')
  const eagleRequiredEarned = earnedBadges.filter((b) => b.bsa_merit_badges.is_eagle_required === true)

  const currentLeadership = leadershipHistory.filter((l) => !l.end_date)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-forest-600" />
              Advancement
            </CardTitle>
            <CardDescription>Track rank progress, merit badges, and activities</CardDescription>
          </div>
          {currentRank && (
            <Badge variant="secondary" className="text-sm">
              Current Rank: {currentRank}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg border bg-stone-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-stone-600">
              <Star className="h-4 w-4" />
              Next Rank
            </div>
            {currentRankProgress ? (
              <div className="mt-2">
                <p className="text-lg font-semibold">
                  {currentRankProgress.bsa_ranks.name}
                </p>
                <Progress value={progressPercent} className="mt-2 h-2" />
                <p className="mt-1 text-xs text-stone-500">
                  {completedRequirements}/{totalRequirements} requirements ({progressPercent}%)
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-stone-500">No rank in progress</p>
            )}
          </div>

          <div className="rounded-lg border bg-stone-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-stone-600">
              <Award className="h-4 w-4" />
              Merit Badges
            </div>
            <div className="mt-2">
              <p className="text-lg font-semibold">{earnedBadges.length} Earned</p>
              <p className="text-xs text-stone-500">
                {inProgressBadges.length} in progress
              </p>
              <p className="text-xs text-forest-600">
                {eagleRequiredEarned.length}/14 Eagle required
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-stone-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-stone-600">
              <Clock className="h-4 w-4" />
              Leadership
            </div>
            <div className="mt-2">
              {currentLeadership.length > 0 ? (
                <>
                  <p className="text-lg font-semibold">
                    {currentLeadership[0].bsa_leadership_positions.name}
                  </p>
                  <p className="text-xs text-stone-500">
                    Since {new Date(currentLeadership[0].start_date).toLocaleDateString()}
                  </p>
                </>
              ) : (
                <p className="text-sm text-stone-500">No current position</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-stone-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-stone-600">
              <TentTree className="h-4 w-4" />
              Activity Totals
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
              <span className="flex items-center gap-1">
                <TentTree className="h-3 w-3" /> {activityTotals.camping} nights
              </span>
              <span className="flex items-center gap-1">
                <Footprints className="h-3 w-3" /> {activityTotals.hiking.toFixed(1)} mi
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" /> {activityTotals.service.toFixed(1)} hrs
              </span>
              <span className="flex items-center gap-1">
                <TreePine className="h-3 w-3" /> {activityTotals.conservation.toFixed(1)} hrs
              </span>
            </div>
          </div>
        </div>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="rank">Rank Progress</TabsTrigger>
            <TabsTrigger value="badges">Merit Badges</TabsTrigger>
            <TabsTrigger value="leadership">Leadership</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
          </TabsList>

          <TabsContent value="rank" className="mt-4">
            <div className="space-y-4">
              {rankProgress.length > 0 ? (
                rankProgress.map((rank) => (
                  <RankProgressCard
                    key={rank.id}
                    rank={rank}
                    scoutId={scoutId}
                    unitId={unitId}
                    canEdit={canEdit}
                  />
                ))
              ) : (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="text-stone-500">No rank progress yet</p>
                  {canEdit && (
                    <Button variant="outline" className="mt-4" size="sm">
                      Start First Rank
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="badges" className="mt-4">
            <div className="space-y-4">
              {inProgressBadges.length > 0 && (
                <div>
                  <h4 className="mb-3 font-medium text-stone-900">In Progress</h4>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {inProgressBadges.map((badge) => (
                      <MeritBadgeCard
                        key={badge.id}
                        badge={badge}
                        scoutId={scoutId}
                        unitId={unitId}
                        canEdit={canEdit}
                      />
                    ))}
                  </div>
                </div>
              )}
              {earnedBadges.length > 0 && (
                <div>
                  <h4 className="mb-3 font-medium text-stone-900">Earned ({earnedBadges.length})</h4>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {earnedBadges.map((badge) => (
                      <MeritBadgeCard
                        key={badge.id}
                        badge={badge}
                        scoutId={scoutId}
                        unitId={unitId}
                        canEdit={false}
                      />
                    ))}
                  </div>
                </div>
              )}
              {meritBadgeProgress.length === 0 && (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="text-stone-500">No merit badges tracked yet</p>
                  {canEdit && (
                    <Button variant="outline" className="mt-4" size="sm">
                      Start Merit Badge
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="leadership" className="mt-4">
            <LeadershipTimeline
              history={leadershipHistory}
              scoutId={scoutId}
              unitId={unitId}
              canEdit={canEdit}
            />
          </TabsContent>

          <TabsContent value="activities" className="mt-4">
            <ActivityStats
              entries={activityEntries}
              totals={activityTotals}
              scoutId={scoutId}
              unitId={unitId}
              canEdit={canEdit}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
