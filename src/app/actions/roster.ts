'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

interface ActionResult {
  success: boolean
  error?: string
}

// Update a roster adult's profile (admin only)
export async function updateRosterAdult(
  unitId: string,
  profileId: string,
  data: {
    first_name: string | null
    last_name: string | null
    email_secondary: string | null
    phone_primary: string | null
    phone_secondary: string | null
    address_street: string | null
    address_city: string | null
    address_state: string | null
    address_zip: string | null
    member_type: string | null
    position: string | null
    position_2: string | null
    bsa_member_id: string | null
    is_active: boolean
  }
): Promise<ActionResult> {
  const supabase = await createClient()

  // Get current user
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

  // Check if user is admin of the specified unit
  const { data: currentMembership, error: membershipError } = await supabase
    .from('unit_memberships')
    .select('role')
    .eq('unit_id', unitId)
    .eq('profile_id', profile.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError) {
    console.error('Membership check error:', membershipError)
    return { success: false, error: 'Failed to verify permissions' }
  }

  if (!currentMembership || currentMembership.role !== 'admin') {
    return { success: false, error: 'Only admins can update roster adults' }
  }

  // Verify the target profile is a member of the same unit via unit_memberships
  const { data: targetMembership, error: targetError } = await supabase
    .from('unit_memberships')
    .select('id')
    .eq('profile_id', profileId)
    .eq('unit_id', unitId)
    .maybeSingle()

  if (targetError) {
    console.error('Target membership check error:', targetError)
    return { success: false, error: 'Failed to verify member' }
  }

  if (!targetMembership) {
    return { success: false, error: 'Adult not found in your unit' }
  }

  // Update the profile using admin client to bypass RLS
  const adminSupabase = createAdminClient()

  const updateData = {
    first_name: data.first_name,
    last_name: data.last_name,
    full_name: [data.first_name, data.last_name].filter(Boolean).join(' ') || null,
    email_secondary: data.email_secondary,
    phone_primary: data.phone_primary,
    phone_secondary: data.phone_secondary,
    address_street: data.address_street,
    address_city: data.address_city,
    address_state: data.address_state,
    address_zip: data.address_zip,
    member_type: data.member_type,
    position: data.position,
    position_2: data.position_2,
    bsa_member_id: data.bsa_member_id,
    is_active: data.is_active,
    updated_at: new Date().toISOString(),
  }

  const { error } = await adminSupabase
    .from('profiles')
    .update(updateData)
    .eq('id', profileId)

  if (error) {
    console.error('Update profile error:', error)
    return { success: false, error: 'Failed to update profile' }
  }

  revalidatePath('/roster')
  revalidatePath(`/adults/${profileId}`)
  return { success: true }
}
