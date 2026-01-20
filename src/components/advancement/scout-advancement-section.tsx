'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RankProgressCard } from './rank-progress-card'
import { MeritBadgeCard } from './merit-badge-card'
import { LeadershipTimeline } from './leadership-timeline'
import { ActivityStats } from './activity-stats'
import { RankTrailVisualization } from './rank-trail-visualization'
import { WhatsNextCard } from './whats-next-card'
import { isFeatureEnabled, FeatureFlag } from '@/lib/feature-flags'
import {
  Award,
  Medal,
  Users,
  Activity,
  TentTree,
  Footprints,
  Heart,
  TreePine,
  Plus,
} from 'lucide-react'
import type { RankProgress as RankProgressType, MeritBadgeProgress as MeritBadgeProgressType } from '@/types/advancement'

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
    image_url?: string | null
  }
  scout_rank_requirement_progress: Array<{
    id: string
    status: string
    completed_at: string | null
    completed_by: string | null
    notes: string | null
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
  const inProgressBadges = meritBadgeProgress.filter((b) => b.status === 'in_progress')
  const earnedBadges = meritBadgeProgress.filter((b) => b.status === 'awarded')
  const eagleRequiredEarned = earnedBadges.filter((b) => b.bsa_merit_badges.is_eagle_required === true)
  const currentLeadership = leadershipHistory.filter((l) => !l.end_date)

  // Type cast for the new components
  const typedRankProgress = rankProgress as unknown as RankProgressType[]

  const handleViewRank = (rankId: string) => {
    setActiveTab('rank')
    // Could scroll to specific rank card in the future
  }

  return (
    <div className="space-y-6">
      {/* Rank Trail Visualization - Full Width */}
      <RankTrailVisualization
        rankProgress={typedRankProgress}
        currentRank={currentRank}
      />

      {/* What's Next Card */}
      <WhatsNextCard
        rankProgress={typedRankProgress}
        scoutId={scoutId}
        unitId={unitId}
        canEdit={canEdit}
        onViewRank={handleViewRank}
      />

      {/* Main Advancement Card with Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-forest-600" />
                Advancement Details
              </CardTitle>
              <CardDescription>
                Detailed progress for ranks, merit badges, and activities
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Quick Stats Row */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex items-center gap-3 rounded-lg border bg-gradient-to-br from-amber-50 to-orange-50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <Medal className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-amber-900">{earnedBadges.length}</p>
                <p className="text-xs text-amber-700">Merit Badges</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border bg-gradient-to-br from-blue-50 to-indigo-50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Award className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-blue-900">{eagleRequiredEarned.length}/14</p>
                <p className="text-xs text-blue-700">Eagle Required</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border bg-gradient-to-br from-emerald-50 to-green-50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-emerald-900">
                  {currentLeadership.length > 0 ? currentLeadership[0].bsa_leadership_positions.name.split(' ')[0] : '—'}
                </p>
                <p className="text-xs text-emerald-700">Leadership</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border bg-gradient-to-br from-purple-50 to-violet-50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex gap-2 text-xs">
                <span className="flex items-center gap-0.5 text-purple-800">
                  <TentTree className="h-3 w-3" />
                  {activityTotals.camping}
                </span>
                <span className="flex items-center gap-0.5 text-purple-800">
                  <Footprints className="h-3 w-3" />
                  {activityTotals.hiking.toFixed(0)}
                </span>
                <span className="flex items-center gap-0.5 text-purple-800">
                  <Heart className="h-3 w-3" />
                  {activityTotals.service.toFixed(0)}
                </span>
              </div>
            </div>
          </div>

          {/* Tabbed Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="rank" className="gap-1.5">
                <Award className="h-4 w-4 hidden sm:inline" />
                Ranks
              </TabsTrigger>
              <TabsTrigger value="badges" className="gap-1.5">
                <Medal className="h-4 w-4 hidden sm:inline" />
                Badges
              </TabsTrigger>
              <TabsTrigger value="leadership" className="gap-1.5">
                <Users className="h-4 w-4 hidden sm:inline" />
                Leadership
              </TabsTrigger>
              <TabsTrigger value="activities" className="gap-1.5">
                <Activity className="h-4 w-4 hidden sm:inline" />
                Activities
              </TabsTrigger>
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
                        <Plus className="mr-2 h-4 w-4" />
                        Start First Rank
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="badges" className="mt-4">
              <div className="space-y-6">
                {/* Eagle Required Progress */}
                {eagleRequiredEarned.length > 0 || inProgressBadges.some(b => b.bsa_merit_badges.is_eagle_required) ? (
                  <div className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="flex items-center gap-2 font-semibold text-amber-900">
                        <Award className="h-4 w-4" />
                        Eagle Required Progress
                      </h4>
                      <Badge className="bg-amber-100 text-amber-800">
                        {eagleRequiredEarned.length}/14
                      </Badge>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-amber-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 transition-all duration-500"
                        style={{ width: `${(eagleRequiredEarned.length / 14) * 100}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-amber-700">
                      {14 - eagleRequiredEarned.length} Eagle-required badges remaining
                    </p>
                  </div>
                ) : null}

                {/* In Progress Badges */}
                {inProgressBadges.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="font-medium text-stone-900">In Progress ({inProgressBadges.length})</h4>
                      {canEdit && (
                        <Button variant="outline" size="sm">
                          <Plus className="mr-1 h-4 w-4" />
                          Start Badge
                        </Button>
                      )}
                    </div>
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

                {/* Earned Badges */}
                {earnedBadges.length > 0 && (
                  <div>
                    <h4 className="mb-3 font-medium text-stone-900">
                      Earned ({earnedBadges.length})
                    </h4>
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

                {/* Empty State */}
                {meritBadgeProgress.length === 0 && (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <Medal className="mx-auto h-12 w-12 text-stone-300" />
                    <p className="mt-2 text-stone-500">No merit badges tracked yet</p>
                    {canEdit && (
                      <Button variant="outline" className="mt-4" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
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
    </div>
  )
}
