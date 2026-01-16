'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface ActionResult {
  success: boolean
  error?: string
  data?: unknown
}

export async function getFundraiserTypes(unitId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('fundraiser_types')
    .select('*')
    .eq('unit_id', unitId)
    .eq('is_active', true)
    .order('name')

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function createFundraiserType(
  unitId: string,
  name: string,
  description?: string
): Promise<ActionResult> {
  const supabase = await createClient()

  // Verify user has permission
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get current user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) {
    return { success: false, error: 'Profile not found' }
  }

  const { data: membership, error: membershipError } = await supabase
    .from('unit_memberships')
    .select('role')
    .eq('unit_id', unitId)
    .eq('profile_id', profile.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError) {
    return { success: false, error: 'Failed to verify permissions' }
  }

  if (!membership || !['admin', 'treasurer'].includes(membership.role)) {
    return { success: false, error: 'Only admins and treasurers can manage fundraiser types' }
  }

  const { data, error } = await supabase
    .from('fundraiser_types')
    .insert({
      unit_id: unitId,
      name: name.trim(),
      description: description?.trim() || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'A fundraiser type with this name already exists' }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/payments')
  revalidatePath('/accounts')

  return { success: true, data }
}

export async function updateFundraiserType(
  id: string,
  name: string,
  description?: string
): Promise<ActionResult> {
  const supabase = await createClient()

  // Verify user has permission
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get current user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) {
    return { success: false, error: 'Profile not found' }
  }

  // Get the fundraiser type to check unit
  const { data: fundraiserType, error: fetchError } = await supabase
    .from('fundraiser_types')
    .select('unit_id')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    return { success: false, error: 'Failed to find fundraiser type' }
  }

  if (!fundraiserType) {
    return { success: false, error: 'Fundraiser type not found' }
  }

  const { data: membership, error: membershipError } = await supabase
    .from('unit_memberships')
    .select('role')
    .eq('unit_id', fundraiserType.unit_id)
    .eq('profile_id', profile.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError) {
    return { success: false, error: 'Failed to verify permissions' }
  }

  if (!membership || !['admin', 'treasurer'].includes(membership.role)) {
    return { success: false, error: 'Only admins and treasurers can manage fundraiser types' }
  }

  const { data, error } = await supabase
    .from('fundraiser_types')
    .update({
      name: name.trim(),
      description: description?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'A fundraiser type with this name already exists' }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/payments')
  revalidatePath('/accounts')

  return { success: true, data }
}

export async function deleteFundraiserType(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Verify user has permission
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get current user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) {
    return { success: false, error: 'Profile not found' }
  }

  // Get the fundraiser type to check unit
  const { data: fundraiserType, error: fetchError } = await supabase
    .from('fundraiser_types')
    .select('unit_id')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    return { success: false, error: 'Failed to find fundraiser type' }
  }

  if (!fundraiserType) {
    return { success: false, error: 'Fundraiser type not found' }
  }

  const { data: membership, error: membershipError } = await supabase
    .from('unit_memberships')
    .select('role')
    .eq('unit_id', fundraiserType.unit_id)
    .eq('profile_id', profile.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError) {
    return { success: false, error: 'Failed to verify permissions' }
  }

  if (!membership || !['admin', 'treasurer'].includes(membership.role)) {
    return { success: false, error: 'Only admins and treasurers can manage fundraiser types' }
  }

  // Soft delete by marking as inactive
  const { error } = await supabase
    .from('fundraiser_types')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/payments')
  revalidatePath('/accounts')

  return { success: true }
}
