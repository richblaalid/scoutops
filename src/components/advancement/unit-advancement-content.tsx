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

// Types for prefetched rank browser data
interface Rank {
  id: string
  code: string
  name: string
  display_order: number
  is_eagle_required: boolean | null
  description: string | null
}

interface Requirement {
  id: string
  version_year: number | null
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

interface PrefetchedRankData {
  ranks: Rank[]
  requirements: Requirement[]
  scouts: ScoutWithRankProgress[]
}

interface UnitAdvancementContentProps {
  // Summary tab data (loaded upfront)
  scouts: Scout[]
  rankProgress: RankProgress[]
  pendingApprovals: PendingApproval[]
  pendingBadgeApprovals: PendingBadgeApproval[]
  stats: {
    rankProgressPercent: number
    scoutsWorkingOnRanks: number
    meritBadgesInProgress: number
    meritBadgesEarned: number
  }
  // Prefetched rank browser data (for instant Ranks tab load)
  prefetchedRankData?: PrefetchedRankData
  // Common props
  unitId: string
  canEdit: boolean
  currentUserName?: string
}

export function UnitAdvancementContent({
  scouts,
  rankProgress,
  pendingApprovals,
  pendingBadgeApprovals,
  stats,
  prefetchedRankData,
  unitId,
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

      {/* Tabbed Content - Ranks prefetched, Merit Badges lazy loaded */}
      <UnitAdvancementTabs
        scouts={scouts}
        rankProgress={rankProgress}
        pendingApprovals={pendingApprovals}
        pendingBadgeApprovals={pendingBadgeApprovals}
        onPendingApprovalsClick={canEdit ? () => setShowPendingModal(true) : undefined}
        prefetchedRankData={prefetchedRankData}
        unitId={unitId}
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
