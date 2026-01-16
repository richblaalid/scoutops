'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

type MemberRole = 'admin' | 'treasurer' | 'leader' | 'parent'

interface ActionResult {
  success: boolean
  error?: string
  warning?: string
}

interface InviteRosterAdultParams {
  unitId: string
  rosterAdultId: string
  email: string
  role: MemberRole
}

/**
 * Invite a roster adult to become an app user
 * Creates a unit_membership with status='invited' linked to the roster_adults record
 */
export async function inviteRosterAdult({
  unitId,
  rosterAdultId,
  email,
  role,
}: InviteRosterAdultParams): Promise<ActionResult> {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Check if user is admin or treasurer of this unit
  const { data: membership, error: membershipError } = await supabase
    .from('unit_memberships')
    .select('role')
    .eq('unit_id', unitId)
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError) {
    console.error('Membership check error:', membershipError)
    return { success: false, error: 'Failed to verify permissions' }
  }

  if (!membership || !['admin', 'treasurer'].includes(membership.role)) {
    return { success: false, error: 'Only admins and treasurers can invite roster adults' }
  }

  // Verify the roster adult exists and belongs to this unit
  const { data: rosterAdult, error: rosterError } = await supabase
    .from('roster_adults')
    .select('id, full_name, profile_id')
    .eq('id', rosterAdultId)
    .eq('unit_id', unitId)
    .maybeSingle()

  if (rosterError) {
    console.error('Roster adult lookup error:', rosterError)
    return { success: false, error: 'Failed to find roster adult' }
  }

  if (!rosterAdult) {
    return { success: false, error: 'Roster adult not found in your unit' }
  }

  // Check if already linked to a profile
  if (rosterAdult.profile_id) {
    return { success: false, error: 'This roster adult is already linked to an app user' }
  }

  // Check if email already has an active membership
  const { data: existingActive, error: activeError } = await supabase
    .from('unit_memberships')
    .select('id')
    .eq('unit_id', unitId)
    .eq('email', email.toLowerCase())
    .eq('status', 'active')
    .maybeSingle()

  if (activeError) {
    console.error('Active check error:', activeError)
    return { success: false, error: 'Failed to check existing members' }
  }

  if (existingActive) {
    return { success: false, error: 'This email is already a member of this unit' }
  }

  // Check if there's already a pending invite for this email
  const { data: existingInvite, error: inviteError } = await supabase
    .from('unit_memberships')
    .select('id')
    .eq('unit_id', unitId)
    .eq('email', email.toLowerCase())
    .eq('status', 'invited')
    .maybeSingle()

  if (inviteError) {
    console.error('Invite check error:', inviteError)
    return { success: false, error: 'Failed to check existing invites' }
  }

  if (existingInvite) {
    return { success: false, error: 'A pending invite already exists for this email' }
  }

  // Check if this roster adult already has a pending invite
  const { data: existingRosterInvite, error: rosterInviteError } = await supabase
    .from('unit_memberships')
    .select('id')
    .eq('unit_id', unitId)
    .eq('roster_adult_id', rosterAdultId)
    .eq('status', 'invited')
    .maybeSingle()

  if (rosterInviteError) {
    console.error('Roster invite check error:', rosterInviteError)
    return { success: false, error: 'Failed to check existing roster invites' }
  }

  if (existingRosterInvite) {
    return { success: false, error: 'A pending invite already exists for this roster adult' }
  }

  // Create the membership record with status='invited'
  const { error: insertError } = await supabase.from('unit_memberships').insert({
    unit_id: unitId,
    email: email.toLowerCase(),
    role,
    status: 'invited',
    roster_adult_id: rosterAdultId,
    invited_by: user.id,
    invited_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  })

  if (insertError) {
    console.error('Membership creation error:', insertError)
    return { success: false, error: 'Failed to create invite' }
  }

  // Send the invite email via Supabase Admin Auth API
  try {
    const adminSupabase = createAdminClient()

    const { error: emailError } = await adminSupabase.auth.admin.inviteUserByEmail(
      email.toLowerCase(),
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
      }
    )

    if (emailError?.code === 'email_exists') {
      console.log('User already exists, they can log in to accept invite:', email)
      return {
        success: true,
        warning: 'User already has an account. They can log in to accept the invite.',
      }
    } else if (emailError) {
      console.error('Auth email error:', emailError)
      return {
        success: true,
        warning: 'Invite created but email may not have been sent. You can resend it from the Members page.',
      }
    }
  } catch (err) {
    console.error('Admin client error:', err)
    return {
      success: true,
      warning: 'Invite created but email may not have been sent. Check service role key configuration.',
    }
  }

  revalidatePath('/roster')
  revalidatePath('/members')
  return { success: true }
}

/**
 * Link a roster adult to a profile (called after invite is accepted)
 * This is called from the acceptPendingInvites function when appropriate
 */
export async function linkRosterAdultToProfile(
  rosterAdultId: string,
  profileId: string
): Promise<ActionResult> {
  const adminSupabase = createAdminClient()

  const { error } = await adminSupabase
    .from('roster_adults')
    .update({
      profile_id: profileId,
      linked_at: new Date().toISOString(),
    })
    .eq('id', rosterAdultId)

  if (error) {
    console.error('Failed to link roster adult to profile:', error)
    return { success: false, error: 'Failed to link roster adult to profile' }
  }

  return { success: true }
}
