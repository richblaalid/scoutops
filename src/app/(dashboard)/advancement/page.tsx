import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isFeatureEnabled, FeatureFlag } from '@/lib/feature-flags'
import { UnitAdvancementContent } from '@/components/advancement/unit-advancement-content'
import {
  getUnitAdvancementSummary,
  getMeritBadgeCategories,
  getRankRequirementsForUnit,
} from '@/app/actions/advancement'

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

  // ==========================================
  // OPTIMIZED DATA FETCHING
  // ==========================================

  // Run all data fetches in parallel
  const [
    summaryResult,
    categoriesResult,
    rankDataResult,
    pendingApprovalsResult,
    pendingBadgeApprovalsResult,
    scoutsWithRankProgressResult,
    scoutsWithBadgeProgressResult,
    badgesResult,
  ] = await Promise.all([
    // Optimized summary stats
    getUnitAdvancementSummary(membership.unit_id),

    // Just categories, not all 141 badges
    getMeritBadgeCategories(),

    // Filtered rank requirements (only current version)
    getRankRequirementsForUnit(),

    // Pending rank requirement approvals (needed for modal)
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

    // Pending badge approvals (needed for modal)
    (async () => {
      const { data: scouts } = await supabase
        .from('scouts')
        .select('id')
        .eq('unit_id', membership.unit_id)
        .eq('is_active', true)
      const scoutIds = scouts?.map(s => s.id) || []
      if (scoutIds.length === 0) return { data: [] }
      return supabase
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
    })(),

    // Scouts with rank progress for browser
    supabase
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
      .order('last_name'),

    // Scouts with badge progress for browser
    supabase
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
      .order('last_name'),

    // All active merit badges (needed for browser)
    supabase
      .from('bsa_merit_badges')
      .select('id, code, name, category, description, is_eagle_required, is_active, image_url, pamphlet_url, requirement_version_year')
      .eq('is_active', true)
      .order('name'),
  ])

  // Extract data from results
  const summary = summaryResult.success ? summaryResult.data : null
  const categories = categoriesResult.success ? categoriesResult.data || [] : []
  const rankData = rankDataResult.success ? rankDataResult.data : null

  // Build scout progress map as plain object (not Map)
  const scoutProgressMap: Record<string, {
    currentRank: {
      id: string
      scout_id: string
      status: string
      awarded_at: string | null
      bsa_ranks: { id: string; code: string; name: string; display_order: number } | null
      scout_rank_requirement_progress: Array<{ id: string; status: string; completed_at: string | null }>
    } | null
    completedCount: number
    totalCount: number
    progressPercent: number
  }> = {}

  // We need rank progress data for the scoutProgressMap - fetch it
  const { data: rankProgressData } = await supabase
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
    .in('scout_id', summary?.scouts.map(s => s.id) || [])

  interface RankProgress {
    id: string
    scout_id: string
    status: string
    awarded_at: string | null
    bsa_ranks: { id: string; code: string; name: string; display_order: number } | null
    scout_rank_requirement_progress: Array<{ id: string; status: string; completed_at: string | null }>
  }

  const rankProgress = (rankProgressData || []) as RankProgress[]

  // Build lookup map
  const rankProgressByScout: Record<string, RankProgress[]> = {}
  for (const rp of rankProgress) {
    if (!rankProgressByScout[rp.scout_id]) {
      rankProgressByScout[rp.scout_id] = []
    }
    rankProgressByScout[rp.scout_id].push(rp)
  }

  // Build scout progress map
  for (const scout of summary?.scouts || []) {
    const scoutRanks = rankProgressByScout[scout.id] || []
    const inProgressRank = scoutRanks.find((r) => r.status === 'in_progress')

    if (inProgressRank) {
      const completed = inProgressRank.scout_rank_requirement_progress.filter(
        (req) => req.status === 'completed' || req.status === 'approved' || req.status === 'awarded'
      ).length
      const total = inProgressRank.scout_rank_requirement_progress.length
      scoutProgressMap[scout.id] = {
        currentRank: inProgressRank,
        completedCount: completed,
        totalCount: total,
        progressPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
      }
    } else {
      scoutProgressMap[scout.id] = {
        currentRank: null,
        completedCount: 0,
        totalCount: 0,
        progressPercent: 0,
      }
    }
  }

  // Format scouts for component
  const scouts = (summary?.scouts || []).map(s => ({
    id: s.id,
    first_name: s.first_name,
    last_name: s.last_name,
    rank: s.rank,
    is_active: true as const,
    patrols: s.patrol_name ? { name: s.patrol_name } : null,
  }))

  // Type definitions for pending approvals
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

  const pendingApprovals = (pendingApprovalsResult.data || []) as PendingApproval[]
  const pendingBadgeApprovals = (pendingBadgeApprovalsResult.data || []) as PendingBadgeApproval[]

  // Type definitions for browser data
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
    requirement_version_year: number | null
  }

  const scoutsWithRankProgress = (scoutsWithRankProgressResult.data || []) as ScoutWithRankProgress[]
  const scoutsWithBadgeProgress = (scoutsWithBadgeProgressResult.data || []) as ScoutWithBadgeProgress[]
  const badges = (badgesResult.data || []) as unknown as Badge[]

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
          rankProgressPercent: summary?.rankStats.avgProgressPercent || 0,
          scoutsWorkingOnRanks: summary?.rankStats.scoutsWorkingOnRanks || 0,
          meritBadgesInProgress: summary?.badgeStats.inProgress || 0,
          meritBadgesEarned: summary?.badgeStats.earned || 0,
        }}
        ranks={rankData?.ranks || []}
        rankRequirements={rankData?.requirements || []}
        scoutsWithRankProgress={scoutsWithRankProgress}
        badges={badges}
        categories={categories}
        scoutsWithBadgeProgress={scoutsWithBadgeProgress}
        unitId={membership.unit_id}
        canEdit={canEdit}
        currentUserName={currentUserName}
      />
    </div>
  )
}
