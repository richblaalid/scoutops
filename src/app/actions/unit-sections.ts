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

  // Use the database function to create sections
  const { data, error } = await supabase.rpc('create_unit_sections', {
    p_parent_unit_id: formData.unitId,
    p_boys_number: formData.boysNumber,
    p_girls_number: formData.girlsNumber,
  })

  if (error) {
    return { error: error.message }
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
