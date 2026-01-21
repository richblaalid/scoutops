'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Award, Medal, BarChart3 } from 'lucide-react'
import { RankRequirementsBrowser } from './rank-requirements-browser'
import { MeritBadgeBrowser } from './merit-badge-browser'
import { AdvancementSummaryView } from './advancement-summary-view'

interface Scout {
  id: string
  first_name: string
  last_name: string
  rank: string | null
  patrols: { name: string } | null
}

interface RankProgress {
  id: string
  scout_id: string
  status: string
  awarded_at: string | null
  bsa_ranks: { id: string; code: string; name: string; display_order: number } | null
  scout_rank_requirement_progress: Array<{ id: string; status: string; completed_at: string | null }>
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

interface ScoutProgressData {
  currentRank: RankProgress | null
  completedCount: number
  totalCount: number
  progressPercent: number
}

// Types for RankRequirementsBrowser
interface Rank {
  id: string
  code: string
  name: string
  display_order: number
  is_eagle_required: boolean | null
  description: string | null
}

interface RankRequirement {
  id: string
  version_id: string
  rank_id: string
  requirement_number: string
  parent_requirement_id: string | null
  sub_requirement_letter: string | null
  description: string
  is_alternative: boolean | null
  alternatives_group: string | null
  display_order: number
}

interface RankRequirementProgress {
  id: string
  requirement_id: string
  status: string
}

interface ScoutRankProgress {
  id: string
  rank_id: string
  status: string
  scout_rank_requirement_progress: RankRequirementProgress[]
}

interface ScoutWithRankProgress {
  id: string
  first_name: string
  last_name: string
  rank: string | null
  is_active: boolean | null
  scout_rank_progress: ScoutRankProgress[]
}

// Types for MeritBadgeBrowser
interface MeritBadge {
  id: string
  code: string
  name: string
  category: string | null
  description: string | null
  is_eagle_required: boolean | null
  is_active: boolean | null
  image_url: string | null
  pamphlet_url: string | null
}

interface MeritBadgeRequirementProgress {
  id: string
  requirement_id: string
  status: string
  completed_at?: string | null
  completed_by?: string | null
  notes?: string | null
}

interface BadgeProgress {
  id: string
  merit_badge_id: string
  status: string
  counselor_name: string | null
  started_at: string | null
  completed_at: string | null
  awarded_at: string | null
  scout_merit_badge_requirement_progress: MeritBadgeRequirementProgress[]
}

interface ScoutWithBadgeProgress {
  id: string
  first_name: string
  last_name: string
  is_active: boolean | null
  scout_merit_badge_progress: BadgeProgress[]
}

interface UnitAdvancementTabsProps {
  // Summary tab data
  scouts: Scout[]
  rankProgress: RankProgress[]
  scoutProgressMap: Map<string, ScoutProgressData>
  pendingApprovals: PendingApproval[]
  pendingBadgeApprovals: PendingBadgeApproval[]
  onPendingApprovalsClick?: () => void
  // Rank Requirements Browser data
  ranks: Rank[]
  rankRequirements: RankRequirement[]
  scoutsWithRankProgress: ScoutWithRankProgress[]
  // Merit Badge Browser data
  badges: MeritBadge[]
  categories: string[]
  scoutsWithBadgeProgress: ScoutWithBadgeProgress[]
  // Common
  unitId: string
  versionId: string
  canEdit: boolean
  currentUserName?: string
}

export function UnitAdvancementTabs({
  scouts,
  rankProgress,
  scoutProgressMap,
  pendingApprovals,
  pendingBadgeApprovals,
  onPendingApprovalsClick,
  ranks,
  rankRequirements,
  scoutsWithRankProgress,
  badges,
  categories,
  scoutsWithBadgeProgress,
  unitId,
  versionId,
  canEdit,
  currentUserName = 'Leader',
}: UnitAdvancementTabsProps) {
  // Combine all pending approvals for the summary view
  const totalPendingCount = pendingApprovals.length + pendingBadgeApprovals.length
  return (
    <Tabs defaultValue="ranks" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="ranks" className="gap-1.5">
          <Award className="h-4 w-4 hidden sm:inline" />
          Ranks
        </TabsTrigger>
        <TabsTrigger value="badges" className="gap-1.5">
          <Medal className="h-4 w-4 hidden sm:inline" />
          Merit Badges
        </TabsTrigger>
        <TabsTrigger value="summary" className="gap-1.5">
          <BarChart3 className="h-4 w-4 hidden sm:inline" />
          Summary
        </TabsTrigger>
      </TabsList>

      {/* Rank Requirements Tab */}
      <TabsContent value="ranks" className="mt-4">
        <RankRequirementsBrowser
          ranks={ranks}
          requirements={rankRequirements}
          scouts={scoutsWithRankProgress}
          unitId={unitId}
          versionId={versionId}
          canEdit={canEdit}
        />
      </TabsContent>

      {/* Merit Badges Tab */}
      <TabsContent value="badges" className="mt-4">
        <MeritBadgeBrowser
          badges={badges}
          requirements={[]} // Requirements fetched on-demand per badge
          scouts={scoutsWithBadgeProgress}
          categories={categories}
          unitId={unitId}
          versionId={versionId}
          canEdit={canEdit}
          currentUserName={currentUserName}
        />
      </TabsContent>

      {/* Summary Tab - Actionable Lists */}
      <TabsContent value="summary" className="mt-4">
        <AdvancementSummaryView
          scouts={scouts}
          rankProgress={rankProgress}
          pendingApprovals={pendingApprovals}
          pendingBadgeApprovals={pendingBadgeApprovals}
          onPendingApprovalsClick={onPendingApprovalsClick}
          canEdit={canEdit}
        />
      </TabsContent>
    </Tabs>
  )
}
