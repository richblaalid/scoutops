import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AccessDenied } from '@/components/ui/access-denied'
import { canAccessPage, canPerformAction } from '@/lib/roles'
import { ScoutsList } from '@/components/scouts/scouts-list'
import { AddScoutButton } from '@/components/scouts/add-scout-button'

interface PageProps {
  searchParams: Promise<{ section?: string }>
}

export default async function ScoutsPage({ searchParams }: PageProps) {
  const { section: sectionFilter } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get user's unit membership (include section_unit_id for leaders)
  const { data: membershipData } = await supabase
    .from('unit_memberships')
    .select('unit_id, role, section_unit_id')
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .single()

  const membership = membershipData as { unit_id: string; role: string; section_unit_id: string | null } | null

  if (!membership) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-2xl font-bold text-stone-900">No Unit Access</h1>
        <p className="mt-2 text-stone-600">
          You are not currently a member of any unit.
        </p>
      </div>
    )
  }

  // Check role-based access
  if (!canAccessPage(membership.role, 'scouts')) {
    return <AccessDenied message="You don't have permission to view the scouts roster." />
  }

  // Get sections (sub-units) for section filtering and form
  const { data: sectionsData } = await supabase
    .from('units')
    .select('id, name, unit_number, unit_gender')
    .eq('parent_unit_id', membership.unit_id)

  interface SectionInfo {
    id: string
    name: string
    unit_number: string
    unit_gender: 'boys' | 'girls' | null
  }

  const sections = (sectionsData || []) as SectionInfo[]
  const hasSections = sections.length > 0

  // Leaders with assigned sections can only view their section
  const isLeaderWithSection = membership.role === 'leader' && membership.section_unit_id && hasSections

  // Determine which unit IDs to query based on sections and filter
  // Scouts are assigned to section units (boys/girls), not the parent
  let unitIdsToQuery: string[] = [membership.unit_id]
  if (hasSections) {
    if (isLeaderWithSection) {
      // Leaders can only see their assigned section
      unitIdsToQuery = [membership.section_unit_id!]
    } else if (sectionFilter === 'boys') {
      const boysSection = sections.find(s => s.unit_gender === 'boys')
      unitIdsToQuery = boysSection ? [boysSection.id] : []
    } else if (sectionFilter === 'girls') {
      const girlsSection = sections.find(s => s.unit_gender === 'girls')
      unitIdsToQuery = girlsSection ? [girlsSection.id] : []
    } else {
      // 'all' or no filter - query all sections plus parent (for unassigned scouts)
      unitIdsToQuery = [...sections.map(s => s.id), membership.unit_id]
    }
  }

  interface ScoutWithAccount {
    id: string
    first_name: string
    last_name: string
    patrol: string | null
    patrol_id: string | null
    rank: string | null
    is_active: boolean | null
    date_of_birth: string | null
    bsa_member_id: string | null
    scout_accounts: { id: string; balance: number | null } | null
  }

  const canManageScouts = canPerformAction(membership.role, 'manage_scouts')
  const isParent = membership.role === 'parent'

  let scouts: ScoutWithAccount[] = []

  if (unitIdsToQuery.length === 0) {
    // No sections to query (shouldn't happen normally)
    scouts = []
  } else if (isParent) {
    // Parents only see scouts they are guardians of
    const { data: guardianData } = await supabase
      .from('scout_guardians')
      .select('scout_id')
      .eq('profile_id', user.id)

    const scoutIds = (guardianData || []).map(g => g.scout_id)

    if (scoutIds.length > 0) {
      const { data: scoutsData } = await supabase
        .from('scouts')
        .select(`
          id,
          first_name,
          last_name,
          patrol,
          patrol_id,
          rank,
          is_active,
          date_of_birth,
          bsa_member_id,
          scout_accounts (
            id,
            balance
          )
        `)
        .in('id', scoutIds)
        .in('unit_id', unitIdsToQuery)
        .order('last_name', { ascending: true })

      scouts = (scoutsData as ScoutWithAccount[]) || []
    }
  } else {
    // Admin, treasurer, leader see all scouts
    const { data: scoutsData } = await supabase
      .from('scouts')
      .select(`
        id,
        first_name,
        last_name,
        patrol,
        patrol_id,
        rank,
        is_active,
        date_of_birth,
        bsa_member_id,
        scout_accounts (
          id,
          balance
        )
      `)
      .in('unit_id', unitIdsToQuery)
      .order('last_name', { ascending: true })

    scouts = (scoutsData as ScoutWithAccount[]) || []
  }

  // Get section info for display
  const getSectionLabel = () => {
    if (!hasSections || !sectionFilter) return null
    if (sectionFilter === 'boys') {
      const section = sections.find(s => s.unit_gender === 'boys')
      return section ? `Troop ${section.unit_number}` : 'Boys section'
    }
    if (sectionFilter === 'girls') {
      const section = sections.find(s => s.unit_gender === 'girls')
      return section ? `Troop ${section.unit_number}` : 'Girls section'
    }
    return 'all sections'
  }
  const sectionLabel = getSectionLabel()

  // When adding a scout with sections, determine which unit to use
  // - Leaders with assigned sections can only add to their section
  // - If filtered to a specific section, use that section
  // - Otherwise use the parent unit (form can handle section selection if needed)
  const getAddScoutUnitId = () => {
    if (!hasSections) return membership.unit_id
    // Leaders can only add scouts to their assigned section
    if (isLeaderWithSection) {
      return membership.section_unit_id!
    }
    if (sectionFilter === 'boys') {
      const boysSection = sections.find(s => s.unit_gender === 'boys')
      return boysSection?.id || membership.unit_id
    }
    if (sectionFilter === 'girls') {
      const girlsSection = sections.find(s => s.unit_gender === 'girls')
      return girlsSection?.id || membership.unit_id
    }
    // For "all" view, use parent unit - scouts can be assigned to sections later
    return membership.unit_id
  }
  const addScoutUnitId = getAddScoutUnitId()

  // Leaders with assigned sections shouldn't see section selector in form
  const sectionsForForm = isLeaderWithSection ? [] : sections

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Scouts</h1>
          <p className="mt-1 text-stone-600">
            {isParent ? 'Your linked scouts' : 'Manage your unit\'s scout roster'}
          </p>
        </div>
        {canManageScouts && <AddScoutButton unitId={addScoutUnitId} sections={sectionsForForm} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scout Roster</CardTitle>
          <CardDescription>
            {scouts.length} scout{scouts.length !== 1 ? 's' : ''}
            {sectionLabel ? ` in ${sectionLabel}` : ' in your unit'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScoutsList scouts={scouts} canManage={canManageScouts} unitId={membership.unit_id} />
        </CardContent>
      </Card>
    </div>
  )
}
