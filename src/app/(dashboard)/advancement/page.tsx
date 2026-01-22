import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isFeatureEnabled, FeatureFlag } from '@/lib/feature-flags'
import { UnitAdvancementContent } from '@/components/advancement/unit-advancement-content'

export default async function AdvancementPage() {
  // Check feature flag
  if (!isFeatureEnabled(FeatureFlag.ADVANCEMENT_TRACKING)) {
    redirect('/dashboard')
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get user's profile and membership
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('user_id', user.id)
    .single()

  if (!profileData) redirect('/setup')

  const currentUserName = profileData.first_name && profileData.last_name
    ? `${profileData.first_name} ${profileData.last_name}`
    : 'Leader'

  const { data: membershipData } = await supabase
    .from('unit_memberships')
    .select('unit_id, role')
    .eq('profile_id', profileData.id)
    .eq('status', 'active')
    .single()

  if (!membershipData) redirect('/setup')

  const membership = membershipData as { unit_id: string; role: string }
  const canEdit = ['admin', 'treasurer', 'leader'].includes(membership.role)

  // Get active requirement version
  const { data: versionData } = await supabase
    .from('bsa_requirement_versions')
    .select('id')
    .eq('is_active', true)
    .order('effective_date', { ascending: false })
    .limit(1)
    .single()

  if (!versionData) {
    return (
      <div className="p-8 text-center">
        <p className="text-stone-500">No active BSA requirements version found.</p>
      </div>
    )
  }

  // ==========================================
  // SUMMARY DATA
  // ==========================================

  // Get all scouts in the unit (for summary tab)
  const { data: scoutsData } = await supabase
    .from('scouts')
    .select(`
      id,
      first_name,
      last_name,
      rank,
      is_active,
      patrols (
        name
      )
    `)
    .eq('unit_id', membership.unit_id)
    .eq('is_active', true)
    .order('last_name')

  interface Scout {
    id: string
    first_name: string
    last_name: string
    rank: string | null
    is_active: boolean | null
    patrols: { name: string } | null
  }

  const scouts = (scoutsData || []) as Scout[]

  // Extract scout IDs once for all queries
  const scoutIds = scouts.map((s) => s.id)

  // Run parallel queries for rank progress, merit badges, and pending approvals
  const [rankProgressResult, meritBadgeResult, pendingApprovalsResult] = await Promise.all([
    // Get rank progress for summary calculations
    supabase
      .from('scout_rank_progress')
      .select(`
        id,
        scout_id,
        status,
        awarded_at,
        bsa_ranks (
          id,
          code,
          name,
          display_order
        ),
        scout_rank_requirement_progress (
          id,
          status,
          completed_at
        )
      `)
      .in('scout_id', scoutIds),

    // Get merit badge progress for summary
    supabase
      .from('scout_merit_badge_progress')
      .select('id, scout_id, status')
      .in('scout_id', scoutIds),

    // Get pending approvals
    supabase
      .from('scout_rank_requirement_progress')
      .select(`
        id,
        status,
        approval_status,
        submission_notes,
        submitted_at,
        scout_rank_progress (
          id,
          scout_id,
          scouts (
            id,
            first_name,
            last_name
          ),
          bsa_ranks (
            name
          )
        ),
        bsa_rank_requirements (
          requirement_number,
          description
        )
      `)
      .eq('approval_status', 'pending_approval')
      .order('submitted_at', { ascending: false }),
  ])

  interface RankProgress {
    id: string
    scout_id: string
    status: string
    awarded_at: string | null
    bsa_ranks: { id: string; code: string; name: string; display_order: number } | null
    scout_rank_requirement_progress: Array<{ id: string; status: string; completed_at: string | null }>
  }

  interface MeritBadge {
    id: string
    scout_id: string
    status: string
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

  const rankProgress = (rankProgressResult.data || []) as RankProgress[]
  const meritBadges = (meritBadgeResult.data || []) as MeritBadge[]
  const pendingApprovals = (pendingApprovalsResult.data || []) as PendingApproval[]

  // Get merit badges with status 'completed' (awaiting scoutmaster approval)
  const { data: pendingBadgeApprovalsData } = await supabase
    .from('scout_merit_badge_progress')
    .select(`
      id,
      status,
      completed_at,
      scout_id,
      scouts (
        id,
        first_name,
        last_name
      ),
      bsa_merit_badges (
        id,
        name,
        is_eagle_required
      )
    `)
    .eq('status', 'completed')
    .in('scout_id', scoutIds)
    .order('completed_at', { ascending: false })

  interface PendingBadgeApproval {
    id: string
    status: string
    completed_at: string | null
    scout_id: string
    scouts: { id: string; first_name: string; last_name: string } | null
    bsa_merit_badges: { id: string; name: string; is_eagle_required: boolean | null } | null
  }

  const pendingBadgeApprovals = (pendingBadgeApprovalsData || []) as PendingBadgeApproval[]

  // Calculate statistics
  const inProgressRanks = rankProgress.filter((r) => r.status === 'in_progress')
  const totalInProgressRequirements = inProgressRanks.reduce(
    (sum, r) => sum + r.scout_rank_requirement_progress.length,
    0
  )
  const completedRequirements = inProgressRanks.reduce(
    (sum, r) =>
      sum +
      r.scout_rank_requirement_progress.filter(
        (req) => req.status === 'completed' || req.status === 'approved' || req.status === 'awarded'
      ).length,
    0
  )
  const avgProgressPercent =
    totalInProgressRequirements > 0
      ? Math.round((completedRequirements / totalInProgressRequirements) * 100)
      : 0

  const inProgressBadges = meritBadges.filter((b) => b.status === 'in_progress').length
  const earnedBadges = meritBadges.filter((b) => b.status === 'awarded').length

  // Build lookup map for rank progress by scout ID (O(n) instead of O(n²))
  const rankProgressByScout = new Map<string, RankProgress[]>()
  for (const rp of rankProgress) {
    const existing = rankProgressByScout.get(rp.scout_id) || []
    existing.push(rp)
    rankProgressByScout.set(rp.scout_id, existing)
  }

  // Build scout progress map using lookup (O(1) per scout)
  const scoutProgressMap = new Map<
    string,
    {
      currentRank: RankProgress | null
      completedCount: number
      totalCount: number
      progressPercent: number
    }
  >()

  for (const scout of scouts) {
    const scoutRanks = rankProgressByScout.get(scout.id) || []
    const inProgressRank = scoutRanks.find((r) => r.status === 'in_progress')

    if (inProgressRank) {
      const completed = inProgressRank.scout_rank_requirement_progress.filter(
        (req) => req.status === 'completed' || req.status === 'approved' || req.status === 'awarded'
      ).length
      const total = inProgressRank.scout_rank_requirement_progress.length
      scoutProgressMap.set(scout.id, {
        currentRank: inProgressRank,
        completedCount: completed,
        totalCount: total,
        progressPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
      })
    } else {
      scoutProgressMap.set(scout.id, {
        currentRank: null,
        completedCount: 0,
        totalCount: 0,
        progressPercent: 0,
      })
    }
  }

  // ==========================================
  // RANK REQUIREMENTS BROWSER DATA
  // ==========================================

  // Get all ranks (specific columns instead of SELECT *)
  const { data: ranksData } = await supabase
    .from('bsa_ranks')
    .select('id, code, name, display_order, is_eagle_required, description')
    .order('display_order')

  // Get all rank requirements for active version (specific columns instead of SELECT *)
  const { data: rankRequirementsData } = await supabase
    .from('bsa_rank_requirements')
    .select('id, version_id, rank_id, requirement_number, parent_requirement_id, sub_requirement_letter, description, is_alternative, alternatives_group, display_order')
    .eq('version_id', versionData.id)
    .order('display_order')

  // Get scouts with detailed rank progress for the browser
  const { data: scoutsWithRankProgressData } = await supabase
    .from('scouts')
    .select(`
      id,
      first_name,
      last_name,
      rank,
      is_active,
      scout_rank_progress (
        id,
        rank_id,
        status,
        scout_rank_requirement_progress (
          id,
          requirement_id,
          status
        )
      )
    `)
    .eq('unit_id', membership.unit_id)
    .eq('is_active', true)
    .order('last_name')

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

  const ranks = (ranksData || []) as Rank[]
  const rankRequirements = (rankRequirementsData || []) as RankRequirement[]
  const scoutsWithRankProgress = (scoutsWithRankProgressData || []) as ScoutWithRankProgress[]

  // ==========================================
  // MERIT BADGE BROWSER DATA
  // ==========================================

  // Get all merit badges (specific columns instead of SELECT *)
  const { data: badgesData } = await supabase
    .from('bsa_merit_badges')
    .select('id, code, name, category, description, is_eagle_required, is_active, image_url, pamphlet_url')
    .eq('is_active', true)
    .order('name')

  // Get scouts with badge progress
  const { data: scoutsWithBadgeProgressData } = await supabase
    .from('scouts')
    .select(`
      id,
      first_name,
      last_name,
      is_active,
      scout_merit_badge_progress (
        id,
        merit_badge_id,
        status,
        counselor_name,
        started_at,
        completed_at,
        awarded_at,
        scout_merit_badge_requirement_progress (
          id,
          requirement_id,
          status,
          completed_at,
          completed_by,
          notes
        )
      )
    `)
    .eq('unit_id', membership.unit_id)
    .eq('is_active', true)
    .order('last_name')

  interface Badge {
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
    completed_at: string | null
    completed_by: string | null
    notes: string | null
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

  const badges = (badgesData || []) as unknown as Badge[]
  const scoutsWithBadgeProgress = (scoutsWithBadgeProgressData || []) as ScoutWithBadgeProgress[]
  const categories = [...new Set(badges.map((b) => b.category).filter(Boolean))] as string[]

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Advancement</h1>
        <p className="text-stone-500">Track rank progress, merit badges, and activities across the unit</p>
      </div>

      {/* Main Content */}
      <UnitAdvancementContent
        scouts={scouts}
        rankProgress={rankProgress}
        pendingApprovals={pendingApprovals}
        pendingBadgeApprovals={pendingBadgeApprovals}
        scoutProgressMap={scoutProgressMap}
        stats={{
          rankProgressPercent: avgProgressPercent,
          scoutsWorkingOnRanks: inProgressRanks.length,
          meritBadgesInProgress: inProgressBadges,
          meritBadgesEarned: earnedBadges,
        }}
        ranks={ranks}
        rankRequirements={rankRequirements}
        scoutsWithRankProgress={scoutsWithRankProgress}
        badges={badges}
        categories={categories}
        scoutsWithBadgeProgress={scoutsWithBadgeProgress}
        unitId={membership.unit_id}
        versionId={versionData.id}
        canEdit={canEdit}
        currentUserName={currentUserName}
      />
    </div>
  )
}
