import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isFeatureEnabled, FeatureFlag } from '@/lib/feature-flags'
import { RankRequirementsBrowser } from '@/components/advancement/rank-requirements-browser'

export default async function RankRequirementsPage() {
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

  // Get all ranks
  const { data: ranksData } = await supabase
    .from('bsa_ranks')
    .select('*')
    .order('display_order')

  // Get all requirements for active version
  const { data: requirementsData } = await supabase
    .from('bsa_rank_requirements')
    .select('*')
    .eq('version_id', versionData.id)
    .order('display_order')

  // Get all scouts in unit with their rank progress
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

  interface Requirement {
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

  interface RequirementProgress {
    id: string
    requirement_id: string
    status: string
  }

  interface RankProgress {
    id: string
    rank_id: string
    status: string
    scout_rank_requirement_progress: RequirementProgress[]
  }

  interface Scout {
    id: string
    first_name: string
    last_name: string
    rank: string | null
    is_active: boolean | null
    scout_rank_progress: RankProgress[]
  }

  const ranks = (ranksData || []) as Rank[]
  const requirements = (requirementsData || []) as Requirement[]
  const scouts = (scoutsData || []) as Scout[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Rank Requirements</h1>
          <p className="text-stone-500">Browse BSA rank requirements and assign completions to scouts</p>
        </div>
      </div>

      <RankRequirementsBrowser
        ranks={ranks}
        requirements={requirements}
        scouts={scouts}
        unitId={membership.unit_id}
        versionId={versionData.id}
        canEdit={canEdit}
      />
    </div>
  )
}
