import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isFeatureEnabled, FeatureFlag } from '@/lib/feature-flags'
import { BulkEntryInterfaceLazy } from '@/components/advancement/bulk-entry-interface-lazy'

export default async function BulkEntryPage() {
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
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profileData) redirect('/setup')

  const { data: membershipData } = await supabase
    .from('unit_memberships')
    .select('unit_id, role')
    .eq('profile_id', profileData.id)
    .eq('status', 'active')
    .single()

  if (!membershipData) redirect('/setup')

  const membership = membershipData as { unit_id: string; role: string }

  // Only leaders can do bulk entry
  if (!['admin', 'treasurer', 'leader'].includes(membership.role)) {
    redirect('/advancement')
  }

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

  // Get all ranks with their requirements
  const { data: ranksData } = await supabase
    .from('bsa_ranks')
    .select('*')
    .order('display_order')

  const { data: rankRequirementsData } = await supabase
    .from('bsa_rank_requirements')
    .select('*')
    .eq('version_id', versionData.id)
    .order('display_order')

  // Get all merit badges with their requirements
  const { data: badgesData } = await supabase
    .from('bsa_merit_badges')
    .select('*')
    .eq('is_active', true)
    .order('name')

  const { data: badgeRequirementsData } = await supabase
    .from('bsa_merit_badge_requirements')
    .select('*')
    .eq('version_id', versionData.id)
    .order('display_order')

  // Get all active scouts with their progress
  const { data: scoutsData } = await supabase
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
      ),
      scout_merit_badge_progress (
        id,
        merit_badge_id,
        status,
        scout_merit_badge_requirement_progress (
          id,
          requirement_id,
          status
        )
      )
    `)
    .eq('unit_id', membership.unit_id)
    .eq('is_active', true)
    .order('last_name')

  // Type definitions
  interface Rank {
    id: string
    code: string
    name: string
    display_order: number
  }

  interface Requirement {
    id: string
    rank_id?: string
    merit_badge_id?: string
    requirement_number: string
    sub_requirement_letter: string | null
    description: string
    display_order: number
  }

  interface Badge {
    id: string
    code: string
    name: string
    category: string | null
    is_eagle_required: boolean | null
  }

  interface RankReqProgress {
    id: string
    requirement_id: string
    status: string
  }

  interface RankProgress {
    id: string
    rank_id: string
    status: string
    scout_rank_requirement_progress: RankReqProgress[]
  }

  interface BadgeReqProgress {
    id: string
    requirement_id: string
    status: string
  }

  interface BadgeProgress {
    id: string
    merit_badge_id: string
    status: string
    scout_merit_badge_requirement_progress: BadgeReqProgress[]
  }

  interface Scout {
    id: string
    first_name: string
    last_name: string
    rank: string | null
    is_active: boolean | null
    scout_rank_progress: RankProgress[]
    scout_merit_badge_progress: BadgeProgress[]
  }

  const ranks = (ranksData || []) as Rank[]
  const rankRequirements = (rankRequirementsData || []) as Requirement[]
  const badges = (badgesData || []) as Badge[]
  const badgeRequirements = (badgeRequirementsData || []) as Requirement[]
  const scouts = (scoutsData || []) as Scout[]

  return (
    <BulkEntryInterfaceLazy
      ranks={ranks}
      rankRequirements={rankRequirements}
      badges={badges}
      badgeRequirements={badgeRequirements}
      scouts={scouts}
      unitId={membership.unit_id}
      versionId={versionData.id}
    />
  )
}
