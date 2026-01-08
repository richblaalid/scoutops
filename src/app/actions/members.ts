'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type MemberRole = 'admin' | 'treasurer' | 'leader' | 'parent' | 'scout'
export type MemberStatus = 'invited' | 'active' | 'inactive'

interface InviteMemberParams {
  unitId: string
  email: string
  role: MemberRole
  scoutIds?: string[]
}

interface ActionResult {
  success: boolean
  error?: string
}

// Invite a new member to the unit
// Creates a membership record with status='invited'
export async function inviteMember({ unitId, email, role, scoutIds }: InviteMemberParams): Promise<ActionResult> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Check if user is admin of this unit
  const { data: membership } = await supabase
    .from('unit_memberships')
    .select('role')
    .eq('unit_id', unitId)
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership || membership.role !== 'admin') {
    return { success: false, error: 'Only admins can invite members' }
  }

  // Check if email already has an active membership
  const { data: existingActive } = await supabase
    .from('unit_memberships')
    .select('id')
    .eq('unit_id', unitId)
    .eq('email', email.toLowerCase())
    .eq('status', 'active')
    .single()

  if (existingActive) {
    return { success: false, error: 'This email is already a member of this unit' }
  }

  // Check if there's already a pending invite
  const { data: existingInvite } = await supabase
    .from('unit_memberships')
    .select('id')
    .eq('unit_id', unitId)
    .eq('email', email.toLowerCase())
    .eq('status', 'invited')
    .single()

  if (existingInvite) {
    return { success: false, error: 'A pending invite already exists for this email' }
  }

  // Create the membership record with status='invited'
  const { error: membershipError } = await supabase
    .from('unit_memberships')
    .insert({
      unit_id: unitId,
      email: email.toLowerCase(),
      role,
      status: 'invited',
      scout_ids: role === 'parent' && scoutIds?.length ? scoutIds : null,
      invited_by: user.id,
      invited_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

  if (membershipError) {
    console.error('Membership creation error:', membershipError)
    return { success: false, error: 'Failed to create invite' }
  }

  // Send the invite email via Supabase Admin Auth API
  try {
    const adminSupabase = createAdminClient()

    // Try inviteUserByEmail (for new users)
    const { error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(
      email.toLowerCase(),
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
      }
    )

    // If user already exists, they can log in via normal login flow
    if (inviteError?.code === 'email_exists') {
      console.log('User already exists, they can log in to accept invite:', email)
      return { success: true, error: 'User already has an account. They can log in to accept the invite.' }
    } else if (inviteError) {
      console.error('Auth email error:', inviteError)
      return { success: true, error: 'Invite created but email may not have been sent. You can resend it.' }
    }
  } catch (err) {
    console.error('Admin client error:', err)
    return { success: true, error: 'Invite created but email may not have been sent. Check service role key configuration.' }
  }

  revalidatePath('/members')
  return { success: true }
}

// Accept pending invites (called after auth)
// Finds memberships with status='invited' matching user's email and activates them
export async function acceptPendingInvites(): Promise<{ accepted: number; unitId?: string }> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return { accepted: 0 }
  }

  // Find invited memberships for this email
  const { data: invites, error: invitesError } = await supabase
    .from('unit_memberships')
    .select('id, unit_id, role, scout_ids')
    .eq('email', user.email.toLowerCase())
    .eq('status', 'invited')

  if (invitesError) {
    console.error('Error checking invites:', invitesError.message)
    return { accepted: 0 }
  }

  if (!invites || invites.length === 0) {
    console.log('No pending invites found for:', user.email.toLowerCase())
    return { accepted: 0 }
  }

  console.log(`Found ${invites.length} pending invite(s) for ${user.email}`)

  let accepted = 0
  let lastUnitId: string | undefined

  for (const invite of invites) {
    // Update the membership: set profile_id, status='active', accepted_at
    const { error: updateError } = await supabase
      .from('unit_memberships')
      .update({
        profile_id: user.id,
        status: 'active',
        accepted_at: new Date().toISOString(),
        joined_at: new Date().toISOString(),
      })
      .eq('id', invite.id)

    if (updateError) {
      console.error('Failed to accept invite:', updateError.message, {
        membership_id: invite.id,
        profile_id: user.id,
      })
      continue
    }

    // Create scout_guardians records for parent role
    // Use admin client to bypass RLS (user doesn't have permission to insert guardians)
    if (invite.role === 'parent' && invite.scout_ids && invite.scout_ids.length > 0) {
      const guardianRecords = invite.scout_ids.map((scoutId: string, index: number) => ({
        scout_id: scoutId,
        profile_id: user.id,
        is_primary: index === 0,
        relationship: 'parent',
      }))

      const adminSupabase = createAdminClient()
      const { error: guardianError } = await adminSupabase
        .from('scout_guardians')
        .insert(guardianRecords)

      if (guardianError) {
        console.error('Failed to create guardian links:', guardianError.message)
      } else {
        console.log(`Created ${guardianRecords.length} guardian link(s) for user ${user.email}`)
      }
    }

    accepted++
    lastUnitId = invite.unit_id
  }

  return { accepted, unitId: lastUnitId }
}

// Update a member's role
export async function updateMemberRole(
  unitId: string,
  memberId: string,
  newRole: MemberRole
): Promise<ActionResult> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Check if user is admin
  const { data: adminCheck } = await supabase
    .from('unit_memberships')
    .select('role')
    .eq('unit_id', unitId)
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .single()

  if (!adminCheck || adminCheck.role !== 'admin') {
    return { success: false, error: 'Only admins can change roles' }
  }

  // Prevent admin from demoting themselves if they're the only admin
  const { data: targetMember } = await supabase
    .from('unit_memberships')
    .select('profile_id, role')
    .eq('id', memberId)
    .single()

  if (targetMember?.profile_id === user.id && targetMember?.role === 'admin' && newRole !== 'admin') {
    const { data: otherAdmins } = await supabase
      .from('unit_memberships')
      .select('id')
      .eq('unit_id', unitId)
      .eq('role', 'admin')
      .eq('status', 'active')
      .neq('profile_id', user.id)

    if (!otherAdmins || otherAdmins.length === 0) {
      return { success: false, error: 'Cannot demote yourself - you are the only admin' }
    }
  }

  // Update the role
  const { error } = await supabase
    .from('unit_memberships')
    .update({ role: newRole })
    .eq('id', memberId)

  if (error) {
    console.error('Update role error:', error)
    return { success: false, error: 'Failed to update role' }
  }

  revalidatePath('/members')
  return { success: true }
}

// Remove a member from the unit (or cancel invite)
export async function removeMember(unitId: string, memberId: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Check if user is admin
  const { data: adminCheck } = await supabase
    .from('unit_memberships')
    .select('role')
    .eq('unit_id', unitId)
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .single()

  if (!adminCheck || adminCheck.role !== 'admin') {
    return { success: false, error: 'Only admins can remove members' }
  }

  // Get target member info
  const { data: targetMember } = await supabase
    .from('unit_memberships')
    .select('profile_id, role, status')
    .eq('id', memberId)
    .single()

  // Prevent removing yourself if you're the only admin
  if (targetMember?.profile_id === user.id && targetMember?.role === 'admin') {
    const { data: otherAdmins } = await supabase
      .from('unit_memberships')
      .select('id')
      .eq('unit_id', unitId)
      .eq('role', 'admin')
      .eq('status', 'active')
      .neq('profile_id', user.id)

    if (!otherAdmins || otherAdmins.length === 0) {
      return { success: false, error: 'Cannot remove yourself - you are the only admin' }
    }
  }

  // For invited members, delete the record. For active members, set status to inactive
  if (targetMember?.status === 'invited') {
    const { error } = await supabase
      .from('unit_memberships')
      .delete()
      .eq('id', memberId)

    if (error) {
      console.error('Delete invite error:', error)
      return { success: false, error: 'Failed to cancel invite' }
    }
  } else {
    const { error } = await supabase
      .from('unit_memberships')
      .update({ status: 'inactive' })
      .eq('id', memberId)

    if (error) {
      console.error('Remove member error:', error)
      return { success: false, error: 'Failed to remove member' }
    }
  }

  revalidatePath('/members')
  return { success: true }
}

// Resend an invite
export async function resendInvite(memberId: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get the membership
  const { data: membership } = await supabase
    .from('unit_memberships')
    .select('id, unit_id, email, status')
    .eq('id', memberId)
    .single()

  if (!membership) {
    return { success: false, error: 'Member not found' }
  }

  if (membership.status !== 'invited') {
    return { success: false, error: 'Can only resend invites for pending members' }
  }

  if (!membership.email) {
    return { success: false, error: 'No email address for this invite' }
  }

  // Check if user is admin of this unit
  const { data: adminCheck } = await supabase
    .from('unit_memberships')
    .select('role')
    .eq('unit_id', membership.unit_id)
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .single()

  if (!adminCheck || adminCheck.role !== 'admin') {
    return { success: false, error: 'Only admins can resend invites' }
  }

  // Update expiration
  const { error: updateError } = await supabase
    .from('unit_memberships')
    .update({ expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
    .eq('id', memberId)

  if (updateError) {
    return { success: false, error: 'Failed to update invite' }
  }

  // Resend the invite email
  try {
    const adminSupabase = createAdminClient()

    const { error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(
      membership.email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
      }
    )

    if (inviteError?.code === 'email_exists') {
      return { success: true, error: 'User already has an account. They can log in to accept the invite.' }
    } else if (inviteError) {
      console.error('Auth email error:', inviteError)
      return { success: false, error: 'Failed to send invite email' }
    }
  } catch (err) {
    console.error('Admin client error:', err)
    return { success: false, error: 'Failed to send invite email. Check service role key configuration.' }
  }

  revalidatePath('/members')
  return { success: true }
}
