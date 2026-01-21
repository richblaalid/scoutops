'use client'

import { useState } from 'react'
import { UnitAdvancementStats } from './unit-advancement-stats'
import { UnitAdvancementTabs } from './unit-advancement-tabs'
import { PendingApprovalsModal } from './pending-approvals-modal'

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

interface UnitAdvancementContentProps {
  // Summary data
  scouts: Scout[]
  rankProgress: RankProgress[]
  pendingApprovals: PendingApproval[]
  pendingBadgeApprovals: PendingBadgeApproval[]
  scoutProgressMap: Map<string, ScoutProgressData>
  stats: {
    rankProgressPercent: number
    scoutsWorkingOnRanks: number
    meritBadgesInProgress: number
    meritBadgesEarned: number
  }
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

export function UnitAdvancementContent({
  scouts,
  rankProgress,
  pendingApprovals,
  pendingBadgeApprovals,
  scoutProgressMap,
  stats,
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
}: UnitAdvancementContentProps) {
  const [showPendingModal, setShowPendingModal] = useState(false)

  // Total pending count for stats
  const totalPendingCount = pendingApprovals.length + pendingBadgeApprovals.length

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <UnitAdvancementStats
        rankProgressPercent={stats.rankProgressPercent}
        scoutsWorkingOnRanks={stats.scoutsWorkingOnRanks}
        meritBadgesInProgress={stats.meritBadgesInProgress}
        meritBadgesEarned={stats.meritBadgesEarned}
        pendingApprovalsCount={totalPendingCount}
        onPendingApprovalsClick={canEdit ? () => setShowPendingModal(true) : undefined}
      />

      {/* Tabbed Content */}
      <UnitAdvancementTabs
        scouts={scouts}
        rankProgress={rankProgress}
        scoutProgressMap={scoutProgressMap}
        pendingApprovals={pendingApprovals}
        pendingBadgeApprovals={pendingBadgeApprovals}
        onPendingApprovalsClick={canEdit ? () => setShowPendingModal(true) : undefined}
        ranks={ranks}
        rankRequirements={rankRequirements}
        scoutsWithRankProgress={scoutsWithRankProgress}
        badges={badges}
        categories={categories}
        scoutsWithBadgeProgress={scoutsWithBadgeProgress}
        unitId={unitId}
        versionId={versionId}
        canEdit={canEdit}
        currentUserName={currentUserName}
      />

      {/* Pending Approvals Modal */}
      {canEdit && (
        <PendingApprovalsModal
          open={showPendingModal}
          onOpenChange={setShowPendingModal}
          pendingApprovals={pendingApprovals}
          pendingBadgeApprovals={pendingBadgeApprovals}
          unitId={unitId}
        />
      )}
    </div>
  )
}
