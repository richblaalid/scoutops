'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type MemberRole = 'admin' | 'treasurer' | 'leader' | 'parent' | 'scout'
export type MemberStatus = 'roster' | 'invited' | 'active' | 'inactive'

interface InviteMemberParams {
  unitId: string
  email: string
  role: MemberRole
  linkedScoutId?: string
}

interface ActionResult {
  success: boolean
  error?: string
  warning?: string
}

// Invite a new member to the unit
// Creates a membership record with status='invited'
export async function inviteMember({ unitId, email, role, linkedScoutId }: InviteMemberParams): Promise<ActionResult> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get current user's profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    console.error('Profile lookup error:', profileError)
    return { success: false, error: 'Failed to find your profile' }
  }

  // Check if user is admin of this unit
  const { data: membership, error: membershipError } = await supabase
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

  if (!membership || membership.role !== 'admin') {
    return { success: false, error: 'Only admins can invite members' }
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

  // Check if there's already a pending invite
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

  // Create the membership record with status='invited'
  const { error: insertError } = await supabase
    .from('unit_memberships')
    .insert({
      unit_id: unitId,
      email: email.toLowerCase(),
      role,
      status: 'invited',
      linked_scout_id: role === 'scout' && linkedScoutId ? linkedScoutId : null,
      invited_by: profile.id,
      invited_at: new Date().toISOString(),
    })

  if (insertError) {
    console.error('Membership creation error:', insertError)
    return { success: false, error: 'Failed to create invite' }
  }

  // Send the invite email via Supabase Admin Auth API
  try {
    const adminSupabase = createAdminClient()

    // Try inviteUserByEmail (for new users)
    const { error: emailError } = await adminSupabase.auth.admin.inviteUserByEmail(
      email.toLowerCase(),
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
      }
    )

    // If user already exists, they can log in via normal login flow
    if (emailError?.code === 'email_exists') {
      // Note: User already exists - logged for debugging
      return { success: true, warning: 'User already has an account. They can log in to accept the invite.' }
    } else if (emailError) {
      console.error('Auth email error:', emailError)
      return { success: true, warning: 'Invite created but email may not have been sent. You can resend it.' }
    }
  } catch (err) {
    console.error('Admin client error:', err)
    return { success: true, warning: 'Invite created but email may not have been sent. Check service role key configuration.' }
  }

  revalidatePath('/members')
  return { success: true }
}

// Accept pending invites (called after auth)
// Finds memberships with status='invited' matching user's email and activates them
export async function acceptPendingInvites(): Promise<{ accepted: number; unitId?: string }> {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return { accepted: 0 }
  }

  // Get the user's profile (created by signup trigger)
  // Use admin client to bypass RLS - this is a trusted server action
  const { data: userProfile, error: profileError } = await adminSupabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Error fetching profile:', profileError.message)
    return { accepted: 0 }
  }

  if (!userProfile) {
    console.error('No profile found for user:', user.id)
    return { accepted: 0 }
  }

  // Find invited memberships for this email
  const { data: invites, error: invitesError } = await adminSupabase
    .from('unit_memberships')
    .select('id, unit_id, role, profile_id, linked_scout_id')
    .eq('email', user.email.toLowerCase())
    .eq('status', 'invited')

  if (invitesError) {
    console.error('Error checking invites:', invitesError.message)
    return { accepted: 0 }
  }

  if (!invites || invites.length === 0) {
    return { accepted: 0 }
  }

  // Process invites without logging email

  let accepted = 0
  let lastUnitId: string | undefined

  for (const invite of invites) {
    let finalProfileId = userProfile.id

    // If membership already has a profile_id (roster invite), keep it and link to auth user
    if (invite.profile_id && invite.profile_id !== userProfile.id) {

      // Link the roster profile to the auth user
      const { error: linkError } = await adminSupabase
        .from('profiles')
        .update({ user_id: user.id })
        .eq('id', invite.profile_id)

      if (linkError) {
        console.error('Failed to link roster profile to user:', linkError.message)
      } else {
        finalProfileId = invite.profile_id

        // Delete the duplicate profile created by signup trigger if it's empty
        const { data: duplicateProfile } = await adminSupabase
          .from('profiles')
          .select('member_type, bsa_member_id')
          .eq('id', userProfile.id)
          .single()

        if (duplicateProfile && !duplicateProfile.member_type && !duplicateProfile.bsa_member_id) {
          // Clean up duplicate empty profile
          await adminSupabase
            .from('profiles')
            .delete()
            .eq('id', userProfile.id)
        }
      }
    }

    // Update the membership: set status='active', accepted_at
    const { error: updateError } = await adminSupabase
      .from('unit_memberships')
      .update({
        profile_id: finalProfileId,
        status: 'active',
        accepted_at: new Date().toISOString(),
        joined_at: new Date().toISOString(),
      })
      .eq('id', invite.id)

    if (updateError) {
      console.error('Failed to accept invite:', updateError.message, {
        membership_id: invite.id,
        profile_id: finalProfileId,
      })
      continue
    }

    // Note: Guardian links for parent role are now created via the roster import
    // or can be added manually by admin after the invite is accepted

    // Link profile to scout record for scout role
    if (invite.role === 'scout' && invite.linked_scout_id) {
      const { error: scoutLinkError } = await adminSupabase
        .from('scouts')
        .update({ profile_id: finalProfileId })
        .eq('id', invite.linked_scout_id)

      if (scoutLinkError) {
        console.error('Failed to link profile to scout:', scoutLinkError.message)
      }
      // Successfully linked profile to scout
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

  // Get current user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) {
    return { success: false, error: 'Profile not found' }
  }

  // Check if user is admin
  const { data: adminCheck, error: adminError } = await supabase
    .from('unit_memberships')
    .select('role')
    .eq('unit_id', unitId)
    .eq('profile_id', profile.id)
    .eq('status', 'active')
    .maybeSingle()

  if (adminError) {
    console.error('Admin check error:', adminError)
    return { success: false, error: 'Failed to verify permissions' }
  }

  if (!adminCheck || adminCheck.role !== 'admin') {
    return { success: false, error: 'Only admins can change roles' }
  }

  // Prevent admin from demoting themselves if they're the only admin
  const { data: targetMember, error: targetError } = await supabase
    .from('unit_memberships')
    .select('profile_id, role')
    .eq('id', memberId)
    .maybeSingle()

  if (targetError) {
    console.error('Target member error:', targetError)
    return { success: false, error: 'Failed to find member' }
  }

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

  // Get current user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) {
    return { success: false, error: 'Profile not found' }
  }

  // Check if user is admin
  const { data: adminCheck, error: adminError } = await supabase
    .from('unit_memberships')
    .select('role')
    .eq('unit_id', unitId)
    .eq('profile_id', profile.id)
    .eq('status', 'active')
    .maybeSingle()

  if (adminError) {
    console.error('Admin check error:', adminError)
    return { success: false, error: 'Failed to verify permissions' }
  }

  if (!adminCheck || adminCheck.role !== 'admin') {
    return { success: false, error: 'Only admins can remove members' }
  }

  // Get target member info
  const { data: targetMember, error: targetError } = await supabase
    .from('unit_memberships')
    .select('profile_id, role, status')
    .eq('id', memberId)
    .maybeSingle()

  if (targetError) {
    console.error('Target member error:', targetError)
    return { success: false, error: 'Failed to find member' }
  }

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

  // Get current user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) {
    return { success: false, error: 'Profile not found' }
  }

  // Get the membership
  const { data: membership, error: membershipError } = await supabase
    .from('unit_memberships')
    .select('id, unit_id, email, status')
    .eq('id', memberId)
    .maybeSingle()

  if (membershipError) {
    console.error('Membership lookup error:', membershipError)
    return { success: false, error: 'Failed to find member' }
  }

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
  const { data: adminCheck, error: adminError } = await supabase
    .from('unit_memberships')
    .select('role')
    .eq('unit_id', membership.unit_id)
    .eq('profile_id', profile.id)
    .eq('status', 'active')
    .maybeSingle()

  if (adminError) {
    console.error('Admin check error:', adminError)
    return { success: false, error: 'Failed to verify permissions' }
  }

  if (!adminCheck || adminCheck.role !== 'admin') {
    return { success: false, error: 'Only admins can resend invites' }
  }

  // Update invited_at to mark when invite was resent
  const { error: updateError } = await supabase
    .from('unit_memberships')
    .update({ invited_at: new Date().toISOString() })
    .eq('id', memberId)

  if (updateError) {
    return { success: false, error: 'Failed to update invite' }
  }

  // Resend the invite email
  try {
    const adminSupabase = createAdminClient()

    const { error: emailError } = await adminSupabase.auth.admin.inviteUserByEmail(
      membership.email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
      }
    )

    if (emailError?.code === 'email_exists') {
      return { success: true, warning: 'User already has an account. They can log in to accept the invite.' }
    } else if (emailError) {
      console.error('Auth email error:', emailError)
      return { success: false, error: 'Failed to send invite email' }
    }
  } catch (err) {
    console.error('Admin client error:', err)
    return { success: false, error: 'Failed to send invite email. Check service role key configuration.' }
  }

  revalidatePath('/members')
  return { success: true }
}

// Update a member's profile (admin only)
export async function updateMemberProfile(
  unitId: string,
  profileId: string,
  data: {
    first_name: string | null
    last_name: string | null
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null
    phone_primary: string | null
    phone_secondary: string | null
    email_secondary: string | null
    address_street: string | null
    address_city: string | null
    address_state: string | null
    address_zip: string | null
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
    return { success: false, error: 'Only admins can update member profiles' }
  }

  // Verify the target profile is a member of the same unit
  const { data: targetMembership, error: targetError } = await supabase
    .from('unit_memberships')
    .select('id')
    .eq('profile_id', profileId)
    .eq('unit_id', unitId)
    .eq('status', 'active')
    .maybeSingle()

  if (targetError) {
    console.error('Target membership check error:', targetError)
    return { success: false, error: 'Failed to verify member' }
  }

  if (!targetMembership) {
    return { success: false, error: 'Member not found in your unit' }
  }

  // Update the profile using admin client to bypass RLS
  const adminSupabase = createAdminClient()

  const updateData: Record<string, unknown> = {
    first_name: data.first_name,
    last_name: data.last_name,
    full_name: [data.first_name, data.last_name].filter(Boolean).join(' ') || null,
    phone_primary: data.phone_primary,
    phone_secondary: data.phone_secondary,
    email_secondary: data.email_secondary,
    address_street: data.address_street,
    address_city: data.address_city,
    address_state: data.address_state,
    address_zip: data.address_zip,
  }

  // Only include gender if explicitly provided
  if ('gender' in data) {
    updateData.gender = data.gender
  }

  const { error } = await adminSupabase
    .from('profiles')
    .update(updateData)
    .eq('id', profileId)

  if (error) {
    console.error('Update profile error:', error)
    return { success: false, error: 'Failed to update profile' }
  }

  revalidatePath(`/members`)
  return { success: true }
}

// Add a scout guardian association (admin only)
export async function addScoutGuardian(
  unitId: string,
  profileId: string,
  scoutId: string,
  relationship: string
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
    return { success: false, error: 'Only admins can manage scout associations' }
  }

  // Verify the scout belongs to the specified unit
  const { data: scout, error: scoutError } = await supabase
    .from('scouts')
    .select('id')
    .eq('id', scoutId)
    .eq('unit_id', unitId)
    .maybeSingle()

  if (scoutError) {
    console.error('Scout lookup error:', scoutError)
    return { success: false, error: 'Failed to verify scout' }
  }

  if (!scout) {
    return { success: false, error: 'Scout not found in your unit' }
  }

  // Check if association already exists
  const { data: existing, error: existingError } = await supabase
    .from('scout_guardians')
    .select('id')
    .eq('profile_id', profileId)
    .eq('scout_id', scoutId)
    .maybeSingle()

  if (existingError) {
    console.error('Existing check error:', existingError)
    return { success: false, error: 'Failed to check existing association' }
  }

  if (existing) {
    return { success: false, error: 'This association already exists' }
  }

  // Create the guardian association using admin client
  const adminSupabase = createAdminClient()

  const { error } = await adminSupabase
    .from('scout_guardians')
    .insert({
      profile_id: profileId,
      scout_id: scoutId,
      relationship,
      is_primary: false,
    })

  if (error) {
    console.error('Add guardian error:', error)
    return { success: false, error: 'Failed to add scout association' }
  }

  revalidatePath(`/members`)
  revalidatePath(`/scouts`)
  return { success: true }
}

// Remove a scout guardian association (admin only)
export async function removeScoutGuardian(unitId: string, guardianshipId: string): Promise<ActionResult> {
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
    return { success: false, error: 'Only admins can manage scout associations' }
  }

  // Delete the guardian association using admin client
  const adminSupabase = createAdminClient()

  const { error } = await adminSupabase
    .from('scout_guardians')
    .delete()
    .eq('id', guardianshipId)

  if (error) {
    console.error('Remove guardian error:', error)
    return { success: false, error: 'Failed to remove scout association' }
  }

  revalidatePath(`/members`)
  revalidatePath(`/scouts`)
  return { success: true }
}

// Invite an existing profile (adult) to create an app account
export async function inviteProfileToApp({
  unitId,
  profileId,
  email,
  role,
}: {
  unitId: string
  profileId: string
  email: string
  role: MemberRole
}): Promise<ActionResult> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get current user's profile
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!currentProfile) {
    return { success: false, error: 'Failed to find your profile' }
  }

  // Check if user is admin of this unit
  const { data: membership, error: membershipError } = await supabase
    .from('unit_memberships')
    .select('role')
    .eq('unit_id', unitId)
    .eq('profile_id', currentProfile.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError) {
    console.error('Membership check error:', membershipError)
    return { success: false, error: 'Failed to verify permissions' }
  }

  if (!membership || (membership.role !== 'admin' && membership.role !== 'treasurer')) {
    return { success: false, error: 'Only admins and treasurers can send invites' }
  }

  // Verify the profile exists and doesn't already have a user account
  const adminSupabase2 = createAdminClient()
  const { data: targetProfile, error: profileError } = await adminSupabase2
    .from('profiles')
    .select('id, user_id, email')
    .eq('id', profileId)
    .single()

  if (profileError || !targetProfile) {
    return { success: false, error: 'Profile not found' }
  }

  if (targetProfile.user_id) {
    return { success: false, error: 'This person already has an app account' }
  }

  // Update the profile's email
  const { error: updateError } = await adminSupabase2
    .from('profiles')
    .update({ email: email.toLowerCase() })
    .eq('id', profileId)

  if (updateError) {
    console.error('Profile update error:', updateError)
    return { success: false, error: 'Failed to update profile email' }
  }

  // Update the membership: set role and status to 'invited'
  const { error: membershipUpdateError } = await adminSupabase2
    .from('unit_memberships')
    .update({
      role,
      status: 'invited',
      email: email.toLowerCase(),
      invited_at: new Date().toISOString(),
      invited_by: currentProfile.id,
    })
    .eq('unit_id', unitId)
    .eq('profile_id', profileId)

  if (membershipUpdateError) {
    console.error('Membership update error:', membershipUpdateError)
    return { success: false, error: 'Failed to update membership status' }
  }

  // Send the invite email via Supabase Admin Auth API
  try {
    const { error: emailError } = await adminSupabase2.auth.admin.inviteUserByEmail(
      email.toLowerCase(),
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
        data: {
          profile_id: profileId,
        },
      }
    )

    if (emailError?.code === 'email_exists') {
      return { success: true, warning: 'User already has an account. They can log in to access the unit.' }
    } else if (emailError) {
      console.error('Auth email error:', emailError)
      return { success: true, warning: 'Invite created but email may not have been sent.' }
    }
  } catch (err) {
    console.error('Admin client error:', err)
    return { success: true, warning: 'Invite created but email may not have been sent.' }
  }

  revalidatePath('/roster')
  revalidatePath('/members')
  return { success: true }
}
