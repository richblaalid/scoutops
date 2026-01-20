import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isFeatureEnabled, FeatureFlag } from '@/lib/feature-flags'
import { MeritBadgeBrowser } from '@/components/advancement/merit-badge-browser'

export default async function MeritBadgesPage() {
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

  // Get all merit badges
  const { data: badgesData } = await supabase
    .from('bsa_merit_badges')
    .select('*')
    .eq('is_active', true)
    .order('name')

  // Note: Requirements are now fetched on-demand per badge to avoid Supabase 1000 row limit
  // This empty array is passed for backward compatibility but isn't used for display
  const requirementsData: never[] = []

  // Get all scouts with their merit badge progress
  const { data: scoutsData } = await supabase
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
          status
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

  interface Requirement {
    id: string
    version_id: string
    merit_badge_id: string
    requirement_number: string
    parent_requirement_id: string | null
    sub_requirement_letter: string | null
    description: string
    display_order: number
  }

  interface RequirementProgress {
    id: string
    requirement_id: string
    status: string
  }

  interface BadgeProgress {
    id: string
    merit_badge_id: string
    status: string
    counselor_name: string | null
    started_at: string | null
    completed_at: string | null
    awarded_at: string | null
    scout_merit_badge_requirement_progress: RequirementProgress[]
  }

  interface Scout {
    id: string
    first_name: string
    last_name: string
    is_active: boolean | null
    scout_merit_badge_progress: BadgeProgress[]
  }

  const badges = (badgesData || []) as unknown as Badge[]
  const requirements = (requirementsData || []) as unknown as Requirement[]
  const scouts = (scoutsData || []) as Scout[]

  // Get unique categories
  const categories = [...new Set(badges.map((b) => b.category).filter(Boolean))] as string[]

  return (
    <MeritBadgeBrowser
      badges={badges}
      requirements={requirements}
      scouts={scouts}
      categories={categories}
      unitId={membership.unit_id}
      versionId={versionData.id}
      canEdit={canEdit}
    />
  )
}
