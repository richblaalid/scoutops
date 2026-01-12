import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UnitInfoForm } from '@/components/settings/unit-info-form'
import { PatrolList } from '@/components/settings/patrol-list'
import { LogoUpload } from '@/components/settings/logo-upload'
import { TroopStructureForm } from '@/components/settings/troop-structure-form'

export default async function UnitSettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's membership and unit info (including linked troop fields)
  // Note: Must specify the foreign key since section_unit_id also references units
  const { data: membership } = await supabase
    .from('unit_memberships')
    .select(
      `unit_id, role, units:units!unit_memberships_unit_id_fkey(
        id,
        name,
        unit_number,
        unit_type,
        unit_gender,
        unit_group_id,
        council,
        district,
        chartered_org,
        logo_url
      )`
    )
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) {
    redirect('/login')
  }

  // Only admin can access unit settings
  if (membership.role !== 'admin') {
    redirect('/settings')
  }

  const unit = membership.units as {
    id: string
    name: string
    unit_number: string
    unit_type: string
    unit_gender: 'boys' | 'girls' | 'coed' | null
    unit_group_id: string | null
    council: string | null
    district: string | null
    chartered_org: string | null
    logo_url: string | null
  } | null

  if (!unit) {
    redirect('/settings')
  }

  // Get sections (sub-units) if this is a linked troop
  const { data: sections } = await supabase
    .from('units')
    .select('id, name, unit_number, unit_gender')
    .eq('parent_unit_id', unit.id)
    .order('unit_gender')

  const sectionsList = (sections || []) as Array<{
    id: string
    name: string
    unit_number: string
    unit_gender: 'boys' | 'girls' | null
  }>

  // Get patrols - from parent unit AND all sections
  const unitIdsForPatrols = [membership.unit_id, ...sectionsList.map(s => s.id)]
  const { data: patrols } = await supabase
    .from('patrols')
    .select('id, name, display_order, is_active, unit_id')
    .in('unit_id', unitIdsForPatrols)
    .order('unit_id')
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Unit Settings</h1>
        <p className="text-stone-600">
          Configure settings for {unit.unit_type.charAt(0).toUpperCase() + unit.unit_type.slice(1)} {unit.unit_number}
        </p>
      </div>

      <div className="grid gap-6">
        <UnitInfoForm
          unitId={unit.id}
          name={unit.name}
          unitNumber={unit.unit_number}
          unitType={unit.unit_type}
          council={unit.council}
          district={unit.district}
          charteredOrg={unit.chartered_org}
        />

        <TroopStructureForm
          unitId={unit.id}
          unitName={unit.name}
          unitNumber={unit.unit_number}
          unitType={unit.unit_type}
          unitGender={unit.unit_gender}
          sections={sectionsList}
        />

        <PatrolList
          unitId={membership.unit_id}
          patrols={patrols || []}
          sections={sectionsList}
        />

        <LogoUpload
          unitId={membership.unit_id}
          currentLogoUrl={unit.logo_url}
        />
      </div>
    </div>
  )
}
