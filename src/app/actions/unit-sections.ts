'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function setupTroopSections(formData: {
  unitId: string
  boysNumber: string
  girlsNumber: string
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Verify user is admin of the unit
  const { data: membership } = await supabase
    .from('unit_memberships')
    .select('role')
    .eq('profile_id', user.id)
    .eq('unit_id', formData.unitId)
    .eq('status', 'active')
    .single()

  if (!membership || membership.role !== 'admin') {
    return { error: 'Only admins can configure troop structure' }
  }

  // Check if sections already exist
  const { data: existingSections } = await supabase
    .from('units')
    .select('id, unit_gender')
    .eq('parent_unit_id', formData.unitId)

  if (existingSections && existingSections.length > 0) {
    // Update existing sections instead of creating new ones
    const boysSection = existingSections.find(s => s.unit_gender === 'boys')
    const girlsSection = existingSections.find(s => s.unit_gender === 'girls')

    if (boysSection) {
      await supabase
        .from('units')
        .update({ unit_number: formData.boysNumber })
        .eq('id', boysSection.id)
    }

    if (girlsSection) {
      await supabase
        .from('units')
        .update({ unit_number: formData.girlsNumber })
        .eq('id', girlsSection.id)
    }

    revalidatePath('/settings/unit')
    return { success: true }
  }

  // Get parent unit info to determine default section for existing scouts
  const { data: parentUnit } = await supabase
    .from('units')
    .select('unit_gender')
    .eq('id', formData.unitId)
    .single()

  // Use the database function to create sections
  const { data, error } = await supabase.rpc('create_unit_sections', {
    p_parent_unit_id: formData.unitId,
    p_boys_number: formData.boysNumber,
    p_girls_number: formData.girlsNumber,
  })

  if (error) {
    return { error: error.message }
  }

  // Migrate existing scouts and their accounts to appropriate section
  // If parent was boys-only, assign to boys section; if girls-only, assign to girls section
  // If was coed or null, default to boys section
  const result = data as { boys_section_id: string | null; girls_section_id: string | null }[] | null
  const sectionResult = result?.[0]

  if (sectionResult) {
    // Determine which section to migrate to based on parent unit's gender
    const defaultGender = parentUnit?.unit_gender === 'girls' ? 'girls' : 'boys'
    const defaultSectionId = defaultGender === 'girls'
      ? sectionResult.girls_section_id
      : sectionResult.boys_section_id

    if (defaultSectionId) {
      // Migrate scouts from parent unit to default section
      const { error: scoutMigrateError } = await supabase
        .from('scouts')
        .update({ unit_id: defaultSectionId })
        .eq('unit_id', formData.unitId)

      if (scoutMigrateError) {
        console.error('Error migrating scouts:', scoutMigrateError)
      }

      // Migrate scout_accounts from parent unit to default section
      const { error: accountMigrateError } = await supabase
        .from('scout_accounts')
        .update({ unit_id: defaultSectionId })
        .eq('unit_id', formData.unitId)

      if (accountMigrateError) {
        console.error('Error migrating scout accounts:', accountMigrateError)
      }

      // Migrate patrols from parent unit to default section
      const { error: patrolMigrateError } = await supabase
        .from('patrols')
        .update({ unit_id: defaultSectionId })
        .eq('unit_id', formData.unitId)

      if (patrolMigrateError) {
        console.error('Error migrating patrols:', patrolMigrateError)
      }
    }

    // Migrate leaders based on their gender
    // Get all leaders with profile info
    const { data: leaderMemberships } = await supabase
      .from('unit_memberships')
      .select('id, profile_id, profiles!unit_memberships_profile_id_fkey(gender)')
      .eq('unit_id', formData.unitId)
      .eq('role', 'leader')
      .eq('status', 'active')
      .is('section_unit_id', null)

    if (leaderMemberships && leaderMemberships.length > 0) {
      const boysSection = sectionResult?.boys_section_id
      const girlsSection = sectionResult?.girls_section_id

      for (const leader of leaderMemberships) {
        const profile = leader.profiles as { gender: string | null } | null
        const gender = profile?.gender

        // Assign to section based on gender
        // Male -> boys, Female -> girls, Other/null -> default section
        let assignedSection: string | null = null
        if (gender === 'male' && boysSection) {
          assignedSection = boysSection
        } else if (gender === 'female' && girlsSection) {
          assignedSection = girlsSection
        } else if (defaultSectionId) {
          // Default for other/prefer_not_to_say/null
          assignedSection = defaultSectionId
        }

        if (assignedSection) {
          const { error: leaderMigrateError } = await supabase
            .from('unit_memberships')
            .update({ section_unit_id: assignedSection })
            .eq('id', leader.id)

          if (leaderMigrateError) {
            console.error('Error migrating leader:', leaderMigrateError)
          }
        }
      }
    }
  }

  revalidatePath('/settings/unit')
  return { success: true, sections: data }
}

export async function removeTroopSections(unitId: string, newGender: 'boys' | 'girls') {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Verify user is admin of the unit
  const { data: membership } = await supabase
    .from('unit_memberships')
    .select('role')
    .eq('profile_id', user.id)
    .eq('unit_id', unitId)
    .eq('status', 'active')
    .single()

  if (!membership || membership.role !== 'admin') {
    return { error: 'Only admins can configure troop structure' }
  }

  // Check if there are scouts in the sections being removed
  const { data: sections } = await supabase
    .from('units')
    .select('id')
    .eq('parent_unit_id', unitId)

  if (sections && sections.length > 0) {
    const sectionIds = sections.map(s => s.id)

    // Check for scouts in these sections
    const { count: scoutCount } = await supabase
      .from('scouts')
      .select('*', { count: 'exact', head: true })
      .in('unit_id', sectionIds)

    if (scoutCount && scoutCount > 0) {
      return {
        error: `Cannot remove sections: ${scoutCount} scout(s) are assigned to sections. Please reassign them first.`
      }
    }

    // Delete the sections
    const { error: deleteError } = await supabase
      .from('units')
      .delete()
      .in('id', sectionIds)

    if (deleteError) {
      return { error: deleteError.message }
    }
  }

  // Update the parent unit's gender
  const { error: updateError } = await supabase
    .from('units')
    .update({ unit_gender: newGender })
    .eq('id', unitId)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/settings/unit')
  return { success: true }
}

export async function getSections(unitId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('units')
    .select('id, name, unit_number, unit_gender')
    .eq('parent_unit_id', unitId)
    .order('unit_gender')

  if (error) {
    return { error: error.message, sections: [] }
  }

  return { sections: data || [] }
}

export async function getExistingDataCounts(unitId: string) {
  const supabase = await createClient()

  // Get counts of scouts, accounts, and patrols on the parent unit
  const [scoutsResult, accountsResult, patrolsResult] = await Promise.all([
    supabase
      .from('scouts')
      .select('*', { count: 'exact', head: true })
      .eq('unit_id', unitId),
    supabase
      .from('scout_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('unit_id', unitId),
    supabase
      .from('patrols')
      .select('*', { count: 'exact', head: true })
      .eq('unit_id', unitId),
  ])

  return {
    scouts: scoutsResult.count || 0,
    accounts: accountsResult.count || 0,
    patrols: patrolsResult.count || 0,
  }
}
