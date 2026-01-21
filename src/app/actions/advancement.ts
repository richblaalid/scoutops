'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { isFeatureEnabled, FeatureFlag } from '@/lib/feature-flags'
import { appendNote, serializeNotes, createCompletionNote, createUndoNote } from '@/lib/notes-utils'

interface ActionResult<T = void> {
  success: boolean
  error?: string
  data?: T
}

// Helper to check if feature is enabled
function checkFeatureEnabled<T>(): ActionResult<T> | null {
  if (!isFeatureEnabled(FeatureFlag.ADVANCEMENT_TRACKING)) {
    return { success: false, error: 'Advancement tracking feature is not enabled' }
  }
  return null
}

// Helper to get current user's profile and verify leader role
async function verifyLeaderRole(unitId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) {
    return { error: 'Profile not found' }
  }

  const { data: membership } = await supabase
    .from('unit_memberships')
    .select('role')
    .eq('unit_id', unitId)
    .eq('profile_id', profile.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!membership || !['admin', 'treasurer', 'leader'].includes(membership.role)) {
    return { error: 'Only leaders can modify advancement records' }
  }

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Unknown'
  return { profileId: profile.id, role: membership.role, fullName }
}

// Helper to verify parent access to a scout
async function verifyParentAccess(scoutId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) {
    return { error: 'Profile not found' }
  }

  // Check if user is a guardian of the scout
  const { data: guardian } = await supabase
    .from('scout_guardians')
    .select('id')
    .eq('scout_id', scoutId)
    .eq('profile_id', profile.id)
    .maybeSingle()

  if (!guardian) {
    return { error: 'You are not a guardian of this scout' }
  }

  return { profileId: profile.id }
}

// ==========================================
// RANK PROGRESS ACTIONS
// ==========================================

/**
 * Initialize rank progress for a scout
 */
export async function initializeRankProgress(
  scoutId: string,
  rankId: string,
  unitId: string
): Promise<ActionResult<{ progressId: string }>> {
  const featureCheck = checkFeatureEnabled<{ progressId: string }>()
  if (featureCheck) return featureCheck

  const auth = await verifyLeaderRole(unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()

  // Get the active requirement version
  const { data: version } = await adminSupabase
    .from('bsa_requirement_versions')
    .select('id')
    .eq('is_active', true)
    .order('effective_date', { ascending: false })
    .limit(1)
    .single()

  if (!version) {
    return { success: false, error: 'No active requirement version found' }
  }

  // Create rank progress record
  const { data: progress, error: progressError } = await adminSupabase
    .from('scout_rank_progress')
    .insert({
      scout_id: scoutId,
      rank_id: rankId,
      version_id: version.id,
      status: 'in_progress',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (progressError) {
    console.error('Error creating rank progress:', progressError)
    return { success: false, error: 'Failed to initialize rank progress' }
  }

  // Get all top-level requirements for this rank and version
  const { data: requirements } = await adminSupabase
    .from('bsa_rank_requirements')
    .select('id')
    .eq('version_id', version.id)
    .eq('rank_id', rankId)
    .is('parent_requirement_id', null)

  if (requirements && requirements.length > 0) {
    // Create requirement progress records
    const reqProgressRecords = requirements.map((req) => ({
      scout_rank_progress_id: progress.id,
      requirement_id: req.id,
      status: 'not_started' as const,
    }))

    await adminSupabase.from('scout_rank_requirement_progress').insert(reqProgressRecords)
  }

  revalidatePath(`/scouts/${scoutId}`)
  return { success: true, data: { progressId: progress.id } }
}

/**
 * Mark a single requirement as complete
 * @param noteText - Optional note text to add to the structured notes array
 */
export async function markRequirementComplete(
  requirementProgressId: string,
  unitId: string,
  completedAt?: string,
  noteText?: string
): Promise<ActionResult> {
  const featureCheck = checkFeatureEnabled<void>()
  if (featureCheck) return featureCheck

  const auth = await verifyLeaderRole(unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()

  // Fetch existing notes to append to
  const { data: existing } = await adminSupabase
    .from('scout_rank_requirement_progress')
    .select('notes')
    .eq('id', requirementProgressId)
    .single()

  // Build the new notes value
  let newNotes: string | null = existing?.notes || null
  if (noteText) {
    newNotes = appendNote(existing?.notes || null, {
      text: noteText,
      author: auth.fullName,
      authorId: auth.profileId,
      type: 'completion',
    })
  } else {
    // Even without explicit note text, record who completed it
    newNotes = appendNote(existing?.notes || null, {
      text: 'Requirement completed',
      author: auth.fullName,
      authorId: auth.profileId,
      type: 'completion',
    })
  }

  const { error } = await adminSupabase
    .from('scout_rank_requirement_progress')
    .update({
      status: 'completed',
      completed_at: completedAt || new Date().toISOString(),
      completed_by: auth.profileId,
      notes: newNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requirementProgressId)

  if (error) {
    console.error('Error marking requirement complete:', error)
    return { success: false, error: 'Failed to mark requirement complete' }
  }

  revalidatePath('/advancement')
  return { success: true }
}

/**
 * Undo a completed requirement - resets status and adds undo note
 * @param undoReason - Required reason for undoing the completion (for audit trail)
 */
export async function undoRequirementCompletion(
  requirementProgressId: string,
  unitId: string,
  undoReason: string
): Promise<ActionResult> {
  const featureCheck = checkFeatureEnabled<void>()
  if (featureCheck) return featureCheck

  if (!undoReason || undoReason.trim().length === 0) {
    return { success: false, error: 'A reason is required to undo a completed requirement' }
  }

  const auth = await verifyLeaderRole(unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()

  // Fetch existing requirement progress
  const { data: existing } = await adminSupabase
    .from('scout_rank_requirement_progress')
    .select('notes, status')
    .eq('id', requirementProgressId)
    .single()

  if (!existing) {
    return { success: false, error: 'Requirement progress not found' }
  }

  // Only allow undo on completed requirements (not approved or awarded)
  if (!['completed'].includes(existing.status)) {
    return { success: false, error: 'Only completed requirements can be undone' }
  }

  // Append the undo note with reason
  const newNotes = appendNote(existing.notes || null, {
    text: `Undo: ${undoReason.trim()}`,
    author: auth.fullName,
    authorId: auth.profileId,
    type: 'undo',
  })

  const { error } = await adminSupabase
    .from('scout_rank_requirement_progress')
    .update({
      status: 'not_started',
      completed_at: null,
      completed_by: null,
      notes: newNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requirementProgressId)

  if (error) {
    console.error('Error undoing requirement completion:', error)
    return { success: false, error: 'Failed to undo requirement completion' }
  }

  revalidatePath('/advancement')
  return { success: true }
}

/**
 * Bulk mark requirements complete (for meeting entries)
 */
export async function bulkMarkRequirementsComplete(
  entries: Array<{
    scoutId: string
    requirementProgressId: string
  }>,
  unitId: string,
  completedAt: string
): Promise<ActionResult<{ successCount: number; failedCount: number }>> {
  const featureCheck = checkFeatureEnabled<{ successCount: number; failedCount: number }>()
  if (featureCheck) return featureCheck

  const auth = await verifyLeaderRole(unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()

  let successCount = 0
  let failedCount = 0

  for (const entry of entries) {
    const { error } = await adminSupabase
      .from('scout_rank_requirement_progress')
      .update({
        status: 'completed',
        completed_at: completedAt,
        completed_by: auth.profileId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entry.requirementProgressId)

    if (error) {
      console.error('Error marking requirement complete:', error)
      failedCount++
    } else {
      successCount++
    }
  }

  revalidatePath('/advancement')
  return { success: true, data: { successCount, failedCount } }
}

/**
 * Bulk approve requirements for a single scout (for quick bulk approval on scout profile)
 * Takes an array of requirement progress IDs and approves them all with the same date/notes
 */
export async function bulkApproveRequirements(
  requirementProgressIds: string[],
  unitId: string,
  completedAt?: string,
  notes?: string
): Promise<ActionResult<{ successCount: number; failedCount: number }>> {
  const featureCheck = checkFeatureEnabled<{ successCount: number; failedCount: number }>()
  if (featureCheck) return featureCheck

  if (requirementProgressIds.length === 0) {
    return { success: true, data: { successCount: 0, failedCount: 0 } }
  }

  const auth = await verifyLeaderRole(unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()
  const timestamp = completedAt || new Date().toISOString()

  // Use a single update query for efficiency
  const { data, error } = await adminSupabase
    .from('scout_rank_requirement_progress')
    .update({
      status: 'completed',
      completed_at: timestamp,
      completed_by: auth.profileId,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .in('id', requirementProgressIds)
    .not('status', 'in', '("approved","awarded")')
    .select('id')

  if (error) {
    console.error('Error bulk approving requirements:', error)
    return { success: false, error: 'Failed to approve requirements' }
  }

  const successCount = data?.length || 0
  const failedCount = requirementProgressIds.length - successCount

  revalidatePath('/advancement')
  return { success: true, data: { successCount, failedCount } }
}

/**
 * Add a note to a requirement without changing its status
 * Appends to the structured notes array
 */
export async function updateRequirementNotes(
  requirementProgressId: string,
  unitId: string,
  noteText: string
): Promise<ActionResult> {
  const featureCheck = checkFeatureEnabled<void>()
  if (featureCheck) return featureCheck

  if (!noteText || noteText.trim().length === 0) {
    return { success: false, error: 'Note text is required' }
  }

  const auth = await verifyLeaderRole(unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()

  // Fetch existing notes to append to
  const { data: existing } = await adminSupabase
    .from('scout_rank_requirement_progress')
    .select('notes')
    .eq('id', requirementProgressId)
    .single()

  // Append the new note
  const newNotes = appendNote(existing?.notes || null, {
    text: noteText.trim(),
    author: auth.fullName,
    authorId: auth.profileId,
    type: 'general',
  })

  const { error } = await adminSupabase
    .from('scout_rank_requirement_progress')
    .update({
      notes: newNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requirementProgressId)

  if (error) {
    console.error('Error updating requirement notes:', error)
    return { success: false, error: 'Failed to update notes' }
  }

  revalidatePath('/advancement')
  return { success: true }
}

/**
 * Bulk approve merit badge requirements for a single scout
 */
export async function bulkApproveMeritBadgeRequirements(
  requirementProgressIds: string[],
  unitId: string,
  completedAt?: string,
  notes?: string
): Promise<ActionResult<{ successCount: number; failedCount: number }>> {
  const featureCheck = checkFeatureEnabled<{ successCount: number; failedCount: number }>()
  if (featureCheck) return featureCheck

  if (requirementProgressIds.length === 0) {
    return { success: true, data: { successCount: 0, failedCount: 0 } }
  }

  const auth = await verifyLeaderRole(unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()
  const timestamp = completedAt || new Date().toISOString()

  // Use a single update query for efficiency
  const { data, error } = await adminSupabase
    .from('scout_merit_badge_requirement_progress')
    .update({
      status: 'completed',
      completed_at: timestamp,
      completed_by: auth.profileId,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .in('id', requirementProgressIds)
    .not('status', 'in', '("approved")')
    .select('id')

  if (error) {
    console.error('Error bulk approving MB requirements:', error)
    return { success: false, error: 'Failed to approve requirements' }
  }

  const successCount = data?.length || 0
  const failedCount = requirementProgressIds.length - successCount

  revalidatePath('/advancement')
  return { success: true, data: { successCount, failedCount } }
}

/**
 * Submit requirement completion for leader approval (parent action)
 */
export async function submitRequirementForApproval(
  requirementProgressId: string,
  scoutId: string,
  completedAt: string,
  notes: string
): Promise<ActionResult> {
  const featureCheck = checkFeatureEnabled<void>()
  if (featureCheck) return featureCheck

  const auth = await verifyParentAccess(scoutId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()

  const { error } = await adminSupabase
    .from('scout_rank_requirement_progress')
    .update({
      submitted_by: auth.profileId,
      submitted_at: new Date().toISOString(),
      submission_notes: notes,
      approval_status: 'pending_approval',
      updated_at: new Date().toISOString(),
    })
    .eq('id', requirementProgressId)

  if (error) {
    console.error('Error submitting requirement:', error)
    return { success: false, error: 'Failed to submit requirement for approval' }
  }

  revalidatePath('/my-progress')
  revalidatePath('/advancement')
  return { success: true }
}

/**
 * Approve parent submission
 */
export async function approveRequirementSubmission(
  requirementProgressId: string,
  unitId: string
): Promise<ActionResult> {
  const featureCheck = checkFeatureEnabled<void>()
  if (featureCheck) return featureCheck

  const auth = await verifyLeaderRole(unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()

  // Get the submission to preserve the completion date from the parent
  const { data: submission } = await adminSupabase
    .from('scout_rank_requirement_progress')
    .select('submitted_at')
    .eq('id', requirementProgressId)
    .single()

  const { error } = await adminSupabase
    .from('scout_rank_requirement_progress')
    .update({
      status: 'completed',
      completed_at: submission?.submitted_at || new Date().toISOString(),
      completed_by: auth.profileId,
      approval_status: 'approved',
      reviewed_by: auth.profileId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', requirementProgressId)

  if (error) {
    console.error('Error approving submission:', error)
    return { success: false, error: 'Failed to approve submission' }
  }

  revalidatePath('/advancement')
  return { success: true }
}

/**
 * Deny parent submission with reason
 */
export async function denyRequirementSubmission(
  requirementProgressId: string,
  unitId: string,
  denialReason: string
): Promise<ActionResult> {
  const featureCheck = checkFeatureEnabled<void>()
  if (featureCheck) return featureCheck

  const auth = await verifyLeaderRole(unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()

  const { error } = await adminSupabase
    .from('scout_rank_requirement_progress')
    .update({
      approval_status: 'denied',
      denial_reason: denialReason,
      reviewed_by: auth.profileId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', requirementProgressId)

  if (error) {
    console.error('Error denying submission:', error)
    return { success: false, error: 'Failed to deny submission' }
  }

  revalidatePath('/advancement')
  return { success: true }
}

/**
 * Approve a rank (after all requirements completed)
 */
export async function approveRank(
  rankProgressId: string,
  unitId: string,
  approvedAt?: string
): Promise<ActionResult> {
  const featureCheck = checkFeatureEnabled<void>()
  if (featureCheck) return featureCheck

  const auth = await verifyLeaderRole(unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()

  const { error } = await adminSupabase
    .from('scout_rank_progress')
    .update({
      status: 'approved',
      approved_at: approvedAt || new Date().toISOString(),
      approved_by: auth.profileId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', rankProgressId)

  if (error) {
    console.error('Error approving rank:', error)
    return { success: false, error: 'Failed to approve rank' }
  }

  revalidatePath('/advancement')
  return { success: true }
}

/**
 * Award a rank (final step, updates scout's current rank)
 */
export async function awardRank(
  rankProgressId: string,
  scoutId: string,
  unitId: string,
  awardedAt?: string
): Promise<ActionResult> {
  const featureCheck = checkFeatureEnabled<void>()
  if (featureCheck) return featureCheck

  const auth = await verifyLeaderRole(unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()

  // Get the rank name
  const { data: progress } = await adminSupabase
    .from('scout_rank_progress')
    .select('rank_id, bsa_ranks(name)')
    .eq('id', rankProgressId)
    .single()

  if (!progress) {
    return { success: false, error: 'Rank progress not found' }
  }

  const timestamp = awardedAt || new Date().toISOString()

  // Update rank progress
  const { error: progressError } = await adminSupabase
    .from('scout_rank_progress')
    .update({
      status: 'awarded',
      awarded_at: timestamp,
      awarded_by: auth.profileId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', rankProgressId)

  if (progressError) {
    console.error('Error awarding rank:', progressError)
    return { success: false, error: 'Failed to award rank' }
  }

  // Update scout's current rank
  const rankName = (progress.bsa_ranks as { name: string })?.name
  if (rankName) {
    await adminSupabase
      .from('scouts')
      .update({ rank: rankName, updated_at: new Date().toISOString() })
      .eq('id', scoutId)
  }

  revalidatePath('/advancement')
  revalidatePath(`/scouts/${scoutId}`)
  return { success: true }
}

// ==========================================
// MERIT BADGE ACTIONS
// ==========================================

/**
 * Start tracking a merit badge for a scout
 */
export async function startMeritBadge(
  scoutId: string,
  meritBadgeId: string,
  unitId: string,
  counselorName?: string,
  counselorProfileId?: string
): Promise<ActionResult<{ progressId: string }>> {
  const featureCheck = checkFeatureEnabled<{ progressId: string }>()
  if (featureCheck) return featureCheck

  const auth = await verifyLeaderRole(unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()

  // Get the active requirement version
  const { data: version } = await adminSupabase
    .from('bsa_requirement_versions')
    .select('id')
    .eq('is_active', true)
    .order('effective_date', { ascending: false })
    .limit(1)
    .single()

  if (!version) {
    return { success: false, error: 'No active requirement version found' }
  }

  // Create merit badge progress record
  const { data: progress, error: progressError } = await adminSupabase
    .from('scout_merit_badge_progress')
    .insert({
      scout_id: scoutId,
      merit_badge_id: meritBadgeId,
      version_id: version.id,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      counselor_name: counselorName,
      counselor_profile_id: counselorProfileId,
    })
    .select('id')
    .single()

  if (progressError) {
    console.error('Error creating merit badge progress:', progressError)
    return { success: false, error: 'Failed to start merit badge tracking' }
  }

  // Get all requirements for this badge and version
  const { data: requirements } = await adminSupabase
    .from('bsa_merit_badge_requirements')
    .select('id')
    .eq('version_id', version.id)
    .eq('merit_badge_id', meritBadgeId)
    .is('parent_requirement_id', null)

  if (requirements && requirements.length > 0) {
    // Create requirement progress records
    const reqProgressRecords = requirements.map((req) => ({
      scout_merit_badge_progress_id: progress.id,
      requirement_id: req.id,
      status: 'not_started' as const,
    }))

    await adminSupabase.from('scout_merit_badge_requirement_progress').insert(reqProgressRecords)
  }

  revalidatePath(`/scouts/${scoutId}`)
  revalidatePath('/advancement/merit-badges')
  return { success: true, data: { progressId: progress.id } }
}

/**
 * Mark a merit badge requirement complete
 */
export async function markMeritBadgeRequirement(
  requirementProgressId: string,
  unitId: string,
  completedAt?: string,
  notes?: string
): Promise<ActionResult> {
  const featureCheck = checkFeatureEnabled<void>()
  if (featureCheck) return featureCheck

  const auth = await verifyLeaderRole(unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()

  const { error } = await adminSupabase
    .from('scout_merit_badge_requirement_progress')
    .update({
      status: 'completed',
      completed_at: completedAt || new Date().toISOString(),
      completed_by: auth.profileId,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requirementProgressId)

  if (error) {
    console.error('Error marking MB requirement complete:', error)
    return { success: false, error: 'Failed to mark requirement complete' }
  }

  revalidatePath('/advancement')
  return { success: true }
}

/**
 * Complete and award a merit badge
 */
export async function completeMeritBadge(
  meritBadgeProgressId: string,
  unitId: string,
  counselorSignedAt?: string
): Promise<ActionResult> {
  const featureCheck = checkFeatureEnabled<void>()
  if (featureCheck) return featureCheck

  const auth = await verifyLeaderRole(unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()

  const { error } = await adminSupabase
    .from('scout_merit_badge_progress')
    .update({
      status: 'awarded',
      completed_at: new Date().toISOString(),
      awarded_at: new Date().toISOString(),
      counselor_signed_at: counselorSignedAt,
      approved_by: auth.profileId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', meritBadgeProgressId)

  if (error) {
    console.error('Error completing merit badge:', error)
    return { success: false, error: 'Failed to complete merit badge' }
  }

  revalidatePath('/advancement')
  return { success: true }
}

/**
 * Bulk award merit badges (mark as awarded by scoutmaster)
 * Used when badges are "completed" (all requirements done) and need final approval
 */
export async function bulkAwardMeritBadges(
  meritBadgeProgressIds: string[],
  unitId: string
): Promise<ActionResult<{ successCount: number; failedCount: number }>> {
  const featureCheck = checkFeatureEnabled<{ successCount: number; failedCount: number }>()
  if (featureCheck) return featureCheck

  const auth = await verifyLeaderRole(unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()
  const now = new Date().toISOString()

  let successCount = 0
  let failedCount = 0

  // Process each badge
  for (const progressId of meritBadgeProgressIds) {
    const { error } = await adminSupabase
      .from('scout_merit_badge_progress')
      .update({
        status: 'awarded',
        awarded_at: now,
        approved_by: auth.profileId,
        updated_at: now,
      })
      .eq('id', progressId)
      .eq('status', 'completed') // Only update badges that are in 'completed' status

    if (error) {
      console.error('Error awarding merit badge:', error)
      failedCount++
    } else {
      successCount++
    }
  }

  revalidatePath('/advancement')
  return { success: true, data: { successCount, failedCount } }
}

// ==========================================
// LEADERSHIP ACTIONS
// ==========================================

/**
 * Add a leadership position for a scout
 */
export async function addLeadershipPosition(
  scoutId: string,
  positionId: string,
  unitId: string,
  startDate: string,
  notes?: string
): Promise<ActionResult<{ historyId: string }>> {
  const featureCheck = checkFeatureEnabled<{ historyId: string }>()
  if (featureCheck) return featureCheck

  const auth = await verifyLeaderRole(unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()

  const { data: history, error } = await adminSupabase
    .from('scout_leadership_history')
    .insert({
      scout_id: scoutId,
      position_id: positionId,
      unit_id: unitId,
      start_date: startDate,
      notes,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error adding leadership position:', error)
    return { success: false, error: 'Failed to add leadership position' }
  }

  revalidatePath(`/scouts/${scoutId}`)
  revalidatePath('/advancement')
  return { success: true, data: { historyId: history.id } }
}

/**
 * End a leadership position
 */
export async function endLeadershipPosition(
  historyId: string,
  unitId: string,
  endDate: string
): Promise<ActionResult> {
  const featureCheck = checkFeatureEnabled<void>()
  if (featureCheck) return featureCheck

  const auth = await verifyLeaderRole(unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()

  const { error } = await adminSupabase
    .from('scout_leadership_history')
    .update({
      end_date: endDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', historyId)

  if (error) {
    console.error('Error ending leadership position:', error)
    return { success: false, error: 'Failed to end leadership position' }
  }

  revalidatePath('/advancement')
  return { success: true }
}

// ==========================================
// ACTIVITY LOG ACTIONS
// ==========================================

/**
 * Log an activity entry (camping, hiking, service)
 */
export async function logActivity(
  scoutId: string,
  unitId: string,
  activityType: 'camping' | 'hiking' | 'service' | 'conservation',
  activityDate: string,
  value: number,
  description?: string,
  location?: string,
  eventId?: string
): Promise<ActionResult<{ entryId: string }>> {
  const featureCheck = checkFeatureEnabled<{ entryId: string }>()
  if (featureCheck) return featureCheck

  const auth = await verifyLeaderRole(unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()

  const { data: entry, error } = await adminSupabase
    .from('scout_activity_entries')
    .insert({
      scout_id: scoutId,
      activity_type: activityType,
      activity_date: activityDate,
      value,
      description,
      location,
      event_id: eventId,
      verified_by: auth.profileId,
      verified_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error logging activity:', error)
    return { success: false, error: 'Failed to log activity' }
  }

  revalidatePath(`/scouts/${scoutId}`)
  revalidatePath('/advancement')
  return { success: true, data: { entryId: entry.id } }
}

/**
 * Bulk log activities for multiple scouts
 */
export async function bulkLogActivities(
  entries: Array<{
    scoutId: string
    value: number
  }>,
  unitId: string,
  activityType: 'camping' | 'hiking' | 'service' | 'conservation',
  activityDate: string,
  description?: string,
  location?: string,
  eventId?: string
): Promise<ActionResult<{ successCount: number; failedCount: number }>> {
  const featureCheck = checkFeatureEnabled<{ successCount: number; failedCount: number }>()
  if (featureCheck) return featureCheck

  const auth = await verifyLeaderRole(unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()

  const records = entries.map((entry) => ({
    scout_id: entry.scoutId,
    activity_type: activityType,
    activity_date: activityDate,
    value: entry.value,
    description,
    location,
    event_id: eventId,
    verified_by: auth.profileId,
    verified_at: new Date().toISOString(),
  }))

  const { data, error } = await adminSupabase
    .from('scout_activity_entries')
    .insert(records)
    .select('id')

  if (error) {
    console.error('Error bulk logging activities:', error)
    return { success: false, error: 'Failed to log activities' }
  }

  revalidatePath('/advancement')
  return {
    success: true,
    data: {
      successCount: data?.length || 0,
      failedCount: entries.length - (data?.length || 0),
    },
  }
}

// ==========================================
// BULK REQUIREMENT ASSIGNMENT
// ==========================================

/**
 * Assign a requirement completion to multiple scouts
 * Creates rank progress if not exists, then marks requirement complete
 */
export async function assignRequirementToScouts(params: {
  requirementId: string
  rankId: string
  versionId: string
  unitId: string
  scoutIds: string[]
  completedAt: string
  notes?: string
}): Promise<ActionResult<{ successCount: number; failedCount: number; errors: string[] }>> {
  const featureCheck = checkFeatureEnabled<{ successCount: number; failedCount: number; errors: string[] }>()
  if (featureCheck) return featureCheck

  const auth = await verifyLeaderRole(params.unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()

  let successCount = 0
  let failedCount = 0
  const errors: string[] = []

  for (const scoutId of params.scoutIds) {
    try {
      // Check if scout has rank progress for this rank
      let { data: rankProgress } = await adminSupabase
        .from('scout_rank_progress')
        .select('id')
        .eq('scout_id', scoutId)
        .eq('rank_id', params.rankId)
        .maybeSingle()

      // Create rank progress if it doesn't exist
      if (!rankProgress) {
        const { data: newProgress, error: progressError } = await adminSupabase
          .from('scout_rank_progress')
          .insert({
            scout_id: scoutId,
            rank_id: params.rankId,
            version_id: params.versionId,
            status: 'in_progress',
            started_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (progressError) {
          console.error('Error creating rank progress:', progressError)
          errors.push(`Failed to create rank progress for scout ${scoutId}`)
          failedCount++
          continue
        }

        rankProgress = newProgress

        // Create all requirement progress records for this rank
        const { data: requirements } = await adminSupabase
          .from('bsa_rank_requirements')
          .select('id')
          .eq('version_id', params.versionId)
          .eq('rank_id', params.rankId)

        if (requirements && requirements.length > 0) {
          const reqProgressRecords = requirements.map((req) => ({
            scout_rank_progress_id: rankProgress!.id,
            requirement_id: req.id,
            status: 'not_started' as const,
          }))

          await adminSupabase.from('scout_rank_requirement_progress').insert(reqProgressRecords)
        }
      }

      // Check if requirement progress exists
      let { data: reqProgress } = await adminSupabase
        .from('scout_rank_requirement_progress')
        .select('id, status')
        .eq('scout_rank_progress_id', rankProgress.id)
        .eq('requirement_id', params.requirementId)
        .maybeSingle()

      // Create requirement progress if it doesn't exist
      if (!reqProgress) {
        const { data: newReqProgress, error: newReqError } = await adminSupabase
          .from('scout_rank_requirement_progress')
          .insert({
            scout_rank_progress_id: rankProgress.id,
            requirement_id: params.requirementId,
            status: 'not_started',
          })
          .select('id, status')
          .single()

        if (newReqError) {
          console.error('Error creating requirement progress:', newReqError)
          errors.push(`Failed to create requirement progress for scout ${scoutId}`)
          failedCount++
          continue
        }

        reqProgress = newReqProgress
      }

      // Skip if already completed
      if (['completed', 'approved', 'awarded'].includes(reqProgress.status)) {
        // Already done, count as success
        successCount++
        continue
      }

      // Mark requirement as complete
      const { error: updateError } = await adminSupabase
        .from('scout_rank_requirement_progress')
        .update({
          status: 'completed',
          completed_at: params.completedAt,
          completed_by: auth.profileId,
          notes: params.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reqProgress.id)

      if (updateError) {
        console.error('Error marking requirement complete:', updateError)
        errors.push(`Failed to mark requirement complete for scout ${scoutId}`)
        failedCount++
        continue
      }

      successCount++
    } catch (err) {
      console.error('Unexpected error:', err)
      errors.push(`Unexpected error for scout ${scoutId}`)
      failedCount++
    }
  }

  revalidatePath('/advancement')
  revalidatePath('/advancement/ranks')

  return {
    success: failedCount === 0,
    data: { successCount, failedCount, errors },
    error: failedCount > 0 ? `Failed to assign to ${failedCount} scout(s)` : undefined,
  }
}

/**
 * Assign a merit badge requirement completion to multiple scouts
 */
export async function assignMeritBadgeRequirementToScouts(params: {
  requirementId: string
  meritBadgeId: string
  versionId: string
  unitId: string
  assignments: Array<{
    scoutId: string
    badgeProgressId: string | null // null if scout is not yet tracking this badge
    requirementProgressId: string | null
  }>
  completedAt: string
  notes?: string
}): Promise<ActionResult<{ successCount: number; failedCount: number; errors: string[] }>> {
  const featureCheck = checkFeatureEnabled<{ successCount: number; failedCount: number; errors: string[] }>()
  if (featureCheck) return featureCheck

  const auth = await verifyLeaderRole(params.unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()

  let successCount = 0
  let failedCount = 0
  const errors: string[] = []

  for (const assignment of params.assignments) {
    try {
      let badgeProgressId = assignment.badgeProgressId
      let requirementProgressId = assignment.requirementProgressId

      // If scout is not tracking this badge yet, create badge progress first
      if (!badgeProgressId) {
        // Create merit badge progress record
        const { data: newBadgeProgress, error: badgeError } = await adminSupabase
          .from('scout_merit_badge_progress')
          .insert({
            scout_id: assignment.scoutId,
            merit_badge_id: params.meritBadgeId,
            version_id: params.versionId,
            status: 'in_progress',
            started_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (badgeError) {
          console.error('Error creating badge progress:', badgeError)
          errors.push(`Failed to start badge tracking for scout ${assignment.scoutId}`)
          failedCount++
          continue
        }

        badgeProgressId = newBadgeProgress.id
      }

      // Create requirement progress if it doesn't exist
      if (!requirementProgressId) {
        const { data: newReqProgress, error: createError } = await adminSupabase
          .from('scout_merit_badge_requirement_progress')
          .insert({
            scout_merit_badge_progress_id: badgeProgressId,
            requirement_id: params.requirementId,
            status: 'not_started',
          })
          .select('id')
          .single()

        if (createError) {
          console.error('Error creating MB requirement progress:', createError)
          errors.push(`Failed to create requirement progress for scout ${assignment.scoutId}`)
          failedCount++
          continue
        }

        requirementProgressId = newReqProgress.id
      }

      // Check current status
      const { data: currentProgress } = await adminSupabase
        .from('scout_merit_badge_requirement_progress')
        .select('status')
        .eq('id', requirementProgressId)
        .single()

      // Skip if already completed
      if (currentProgress && ['completed', 'approved'].includes(currentProgress.status)) {
        successCount++
        continue
      }

      // Mark requirement as complete
      const { error: updateError } = await adminSupabase
        .from('scout_merit_badge_requirement_progress')
        .update({
          status: 'completed',
          completed_at: params.completedAt,
          completed_by: auth.profileId,
          notes: params.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requirementProgressId)

      if (updateError) {
        console.error('Error marking MB requirement complete:', updateError)
        errors.push(`Failed to mark requirement complete for scout ${assignment.scoutId}`)
        failedCount++
        continue
      }

      successCount++
    } catch (err) {
      console.error('Unexpected error:', err)
      errors.push(`Unexpected error for scout ${assignment.scoutId}`)
      failedCount++
    }
  }

  revalidatePath('/advancement')
  revalidatePath('/advancement/merit-badges')

  return {
    success: failedCount === 0,
    data: { successCount, failedCount, errors },
    error: failedCount > 0 ? `Failed to assign to ${failedCount} scout(s)` : undefined,
  }
}

// ==========================================
// USER INFO
// ==========================================

/**
 * Get the current user's profile info for display in UI
 */
export async function getCurrentUserInfo(unitId: string): Promise<ActionResult<{
  profileId: string
  fullName: string
  role: string
}>> {
  const auth = await verifyLeaderRole(unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  return {
    success: true,
    data: {
      profileId: auth.profileId,
      fullName: auth.fullName,
      role: auth.role,
    },
  }
}

// ==========================================
// READ-ONLY DATA FETCHING
// ==========================================

/**
 * Get BSA ranks reference data
 */
export async function getBsaRanks() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('bsa_ranks')
    .select('*')
    .order('display_order')

  if (error) {
    console.error('Error fetching ranks:', error)
    return []
  }

  return data
}

/**
 * Get BSA merit badges reference data
 */
export async function getBsaMeritBadges(filters?: { category?: string; isEagleRequired?: boolean }) {
  const supabase = await createClient()

  let query = supabase
    .from('bsa_merit_badges')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }
  if (filters?.isEagleRequired !== undefined) {
    query = query.eq('is_eagle_required', filters.isEagleRequired)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching merit badges:', error)
    return []
  }

  return data
}

/**
 * Get leadership positions reference data
 */
export async function getBsaLeadershipPositions() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('bsa_leadership_positions')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching leadership positions:', error)
    return []
  }

  return data
}

/**
 * Get scout's advancement progress
 */
export async function getScoutAdvancementProgress(scoutId: string) {
  const supabase = await createClient()

  const { data: rankProgress, error: rankError } = await supabase
    .from('scout_rank_progress')
    .select(`
      *,
      bsa_ranks(*),
      scout_rank_requirement_progress(
        *,
        bsa_rank_requirements(*)
      )
    `)
    .eq('scout_id', scoutId)
    .order('bsa_ranks(display_order)')

  const { data: meritBadgeProgress, error: mbError } = await supabase
    .from('scout_merit_badge_progress')
    .select(`
      *,
      bsa_merit_badges(*),
      scout_merit_badge_requirement_progress(
        *,
        bsa_merit_badge_requirements(*)
      )
    `)
    .eq('scout_id', scoutId)

  const { data: leadershipHistory, error: leadError } = await supabase
    .from('scout_leadership_history')
    .select(`
      *,
      bsa_leadership_positions(*)
    `)
    .eq('scout_id', scoutId)
    .order('start_date', { ascending: false })

  const { data: activityEntries, error: actError } = await supabase
    .from('scout_activity_entries')
    .select('*')
    .eq('scout_id', scoutId)
    .order('activity_date', { ascending: false })

  if (rankError || mbError || leadError || actError) {
    console.error('Error fetching advancement progress')
    return null
  }

  // Calculate activity totals
  const activityTotals = {
    camping: 0,
    hiking: 0,
    service: 0,
    conservation: 0,
  }

  activityEntries?.forEach((entry) => {
    activityTotals[entry.activity_type as keyof typeof activityTotals] += Number(entry.value)
  })

  return {
    rankProgress,
    meritBadgeProgress,
    leadershipHistory,
    activityEntries,
    activityTotals,
  }
}

// ==========================================
// BULK ENTRY ACTIONS
// ==========================================

/**
 * Bulk record requirement progress from the bulk entry interface
 * Handles both rank and merit badge requirements
 */
export async function bulkRecordProgress(params: {
  entries: Array<{
    scoutId: string
    requirementId: string
    type: 'rank' | 'merit_badge'
    parentId: string // rank_id or merit_badge_id
  }>
  unitId: string
  versionId: string
  completedAt: string
  notes?: string
}): Promise<ActionResult<{ successCount: number; failedCount: number; errors: string[] }>> {
  const featureCheck = checkFeatureEnabled<{ successCount: number; failedCount: number; errors: string[] }>()
  if (featureCheck) return featureCheck

  const auth = await verifyLeaderRole(params.unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()

  let successCount = 0
  let failedCount = 0
  const errors: string[] = []

  for (const entry of params.entries) {
    try {
      if (entry.type === 'rank') {
        // Handle rank requirement
        const result = await processRankRequirementEntry(
          adminSupabase,
          entry.scoutId,
          entry.requirementId,
          entry.parentId,
          params.versionId,
          params.completedAt,
          auth.profileId,
          params.notes
        )

        if (result.success) {
          successCount++
        } else {
          errors.push(result.error || `Failed for scout ${entry.scoutId}`)
          failedCount++
        }
      } else {
        // Handle merit badge requirement
        const result = await processMeritBadgeRequirementEntry(
          adminSupabase,
          entry.scoutId,
          entry.requirementId,
          entry.parentId,
          params.versionId,
          params.completedAt,
          auth.profileId,
          params.notes
        )

        if (result.success) {
          successCount++
        } else {
          errors.push(result.error || `Failed for scout ${entry.scoutId}`)
          failedCount++
        }
      }
    } catch (err) {
      console.error('Unexpected error in bulk entry:', err)
      errors.push(`Unexpected error for scout ${entry.scoutId}`)
      failedCount++
    }
  }

  revalidatePath('/advancement')
  revalidatePath('/advancement/bulk-entry')

  return {
    success: failedCount === 0,
    data: { successCount, failedCount, errors },
    error: failedCount > 0 ? `Failed to record ${failedCount} entry/entries` : undefined,
  }
}

// Helper function to process a rank requirement entry
async function processRankRequirementEntry(
  adminSupabase: ReturnType<typeof createAdminClient>,
  scoutId: string,
  requirementId: string,
  rankId: string,
  versionId: string,
  completedAt: string,
  profileId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  // Check if scout has rank progress for this rank
  let { data: rankProgress } = await adminSupabase
    .from('scout_rank_progress')
    .select('id')
    .eq('scout_id', scoutId)
    .eq('rank_id', rankId)
    .maybeSingle()

  // Create rank progress if it doesn't exist
  if (!rankProgress) {
    const { data: newProgress, error: progressError } = await adminSupabase
      .from('scout_rank_progress')
      .insert({
        scout_id: scoutId,
        rank_id: rankId,
        version_id: versionId,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (progressError) {
      return { success: false, error: 'Failed to create rank progress' }
    }

    rankProgress = newProgress

    // Create all requirement progress records for this rank
    const { data: requirements } = await adminSupabase
      .from('bsa_rank_requirements')
      .select('id')
      .eq('version_id', versionId)
      .eq('rank_id', rankId)

    if (requirements && requirements.length > 0) {
      const reqProgressRecords = requirements.map((req) => ({
        scout_rank_progress_id: rankProgress!.id,
        requirement_id: req.id,
        status: 'not_started' as const,
      }))

      await adminSupabase.from('scout_rank_requirement_progress').insert(reqProgressRecords)
    }
  }

  // Check if requirement progress exists
  let { data: reqProgress } = await adminSupabase
    .from('scout_rank_requirement_progress')
    .select('id, status')
    .eq('scout_rank_progress_id', rankProgress.id)
    .eq('requirement_id', requirementId)
    .maybeSingle()

  // Create requirement progress if it doesn't exist
  if (!reqProgress) {
    const { data: newReqProgress, error: newReqError } = await adminSupabase
      .from('scout_rank_requirement_progress')
      .insert({
        scout_rank_progress_id: rankProgress.id,
        requirement_id: requirementId,
        status: 'not_started',
      })
      .select('id, status')
      .single()

    if (newReqError) {
      return { success: false, error: 'Failed to create requirement progress' }
    }

    reqProgress = newReqProgress
  }

  // Skip if already completed
  if (['completed', 'approved', 'awarded'].includes(reqProgress.status)) {
    return { success: true }
  }

  // Mark requirement as complete
  const { error: updateError } = await adminSupabase
    .from('scout_rank_requirement_progress')
    .update({
      status: 'completed',
      completed_at: completedAt,
      completed_by: profileId,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reqProgress.id)

  if (updateError) {
    return { success: false, error: 'Failed to mark requirement complete' }
  }

  return { success: true }
}

// Helper function to process a merit badge requirement entry
async function processMeritBadgeRequirementEntry(
  adminSupabase: ReturnType<typeof createAdminClient>,
  scoutId: string,
  requirementId: string,
  meritBadgeId: string,
  versionId: string,
  completedAt: string,
  profileId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  // Check if scout has badge progress for this merit badge
  let { data: badgeProgress } = await adminSupabase
    .from('scout_merit_badge_progress')
    .select('id')
    .eq('scout_id', scoutId)
    .eq('merit_badge_id', meritBadgeId)
    .maybeSingle()

  // Create badge progress if it doesn't exist
  if (!badgeProgress) {
    const { data: newProgress, error: progressError } = await adminSupabase
      .from('scout_merit_badge_progress')
      .insert({
        scout_id: scoutId,
        merit_badge_id: meritBadgeId,
        version_id: versionId,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (progressError) {
      return { success: false, error: 'Failed to create badge progress' }
    }

    badgeProgress = newProgress

    // Create all requirement progress records for this badge
    const { data: requirements } = await adminSupabase
      .from('bsa_merit_badge_requirements')
      .select('id')
      .eq('version_id', versionId)
      .eq('merit_badge_id', meritBadgeId)

    if (requirements && requirements.length > 0) {
      const reqProgressRecords = requirements.map((req) => ({
        scout_merit_badge_progress_id: badgeProgress!.id,
        requirement_id: req.id,
        status: 'not_started' as const,
      }))

      await adminSupabase.from('scout_merit_badge_requirement_progress').insert(reqProgressRecords)
    }
  }

  // Check if requirement progress exists
  let { data: reqProgress } = await adminSupabase
    .from('scout_merit_badge_requirement_progress')
    .select('id, status')
    .eq('scout_merit_badge_progress_id', badgeProgress.id)
    .eq('requirement_id', requirementId)
    .maybeSingle()

  // Create requirement progress if it doesn't exist
  if (!reqProgress) {
    const { data: newReqProgress, error: newReqError } = await adminSupabase
      .from('scout_merit_badge_requirement_progress')
      .insert({
        scout_merit_badge_progress_id: badgeProgress.id,
        requirement_id: requirementId,
        status: 'not_started',
      })
      .select('id, status')
      .single()

    if (newReqError) {
      return { success: false, error: 'Failed to create requirement progress' }
    }

    reqProgress = newReqProgress
  }

  // Skip if already completed
  if (['completed', 'approved'].includes(reqProgress.status)) {
    return { success: true }
  }

  // Mark requirement as complete
  const { error: updateError } = await adminSupabase
    .from('scout_merit_badge_requirement_progress')
    .update({
      status: 'completed',
      completed_at: completedAt,
      completed_by: profileId,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reqProgress.id)

  if (updateError) {
    return { success: false, error: 'Failed to mark requirement complete' }
  }

  return { success: true }
}

/**
 * Get requirements for a specific merit badge
 * Fetches on-demand to avoid Supabase 1000 row limit when loading all badges
 */
export async function getMeritBadgeRequirements(meritBadgeId: string, versionId: string) {
  const supabase = await createClient()

  // If versionId is empty, fetch the active version
  let actualVersionId = versionId
  if (!actualVersionId) {
    const { data: version } = await supabase
      .from('bsa_requirement_versions')
      .select('id')
      .eq('is_active', true)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single()

    if (!version) {
      console.error('No active requirement version found')
      return []
    }
    actualVersionId = version.id
  }

  const { data, error } = await supabase
    .from('bsa_merit_badge_requirements')
    .select('*')
    .eq('version_id', actualVersionId)
    .eq('merit_badge_id', meritBadgeId)
    .order('display_order')

  if (error) {
    console.error('Error fetching merit badge requirements:', error)
    return []
  }

  return data
}

/**
 * Mark a requirement complete, auto-initializing progress records if needed
 * This is used when a scout hasn't started a rank yet but we want to mark a requirement
 */
export async function markRequirementCompleteWithInit(params: {
  scoutId: string
  rankId: string
  requirementId: string
  unitId: string
  versionId: string
  completedAt?: string
  notes?: string
}): Promise<ActionResult<{ requirementProgressId: string }>> {
  const featureCheck = checkFeatureEnabled<{ requirementProgressId: string }>()
  if (featureCheck) return featureCheck

  const auth = await verifyLeaderRole(params.unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()

  // Check if scout has rank progress for this rank
  let { data: rankProgress } = await adminSupabase
    .from('scout_rank_progress')
    .select('id')
    .eq('scout_id', params.scoutId)
    .eq('rank_id', params.rankId)
    .maybeSingle()

  // Create rank progress if it doesn't exist
  if (!rankProgress) {
    const { data: newProgress, error: progressError } = await adminSupabase
      .from('scout_rank_progress')
      .insert({
        scout_id: params.scoutId,
        rank_id: params.rankId,
        version_id: params.versionId,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (progressError) {
      console.error('Error creating rank progress:', progressError)
      return { success: false, error: 'Failed to create rank progress' }
    }

    rankProgress = newProgress

    // Create all requirement progress records for this rank
    const { data: requirements } = await adminSupabase
      .from('bsa_rank_requirements')
      .select('id')
      .eq('version_id', params.versionId)
      .eq('rank_id', params.rankId)

    if (requirements && requirements.length > 0) {
      const reqProgressRecords = requirements.map((req) => ({
        scout_rank_progress_id: rankProgress!.id,
        requirement_id: req.id,
        status: 'not_started' as const,
      }))

      await adminSupabase.from('scout_rank_requirement_progress').insert(reqProgressRecords)
    }
  }

  // Get the requirement progress record
  const { data: reqProgress, error: reqFetchError } = await adminSupabase
    .from('scout_rank_requirement_progress')
    .select('id, status')
    .eq('scout_rank_progress_id', rankProgress.id)
    .eq('requirement_id', params.requirementId)
    .maybeSingle()

  if (reqFetchError || !reqProgress) {
    console.error('Error fetching requirement progress:', reqFetchError)
    return { success: false, error: 'Failed to find requirement progress' }
  }

  // Skip if already completed
  if (['completed', 'approved', 'awarded'].includes(reqProgress.status)) {
    return { success: true, data: { requirementProgressId: reqProgress.id } }
  }

  // Mark requirement as complete
  const { error: updateError } = await adminSupabase
    .from('scout_rank_requirement_progress')
    .update({
      status: 'completed',
      completed_at: params.completedAt || new Date().toISOString(),
      completed_by: auth.profileId,
      notes: params.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reqProgress.id)

  if (updateError) {
    console.error('Error marking requirement complete:', updateError)
    return { success: false, error: 'Failed to mark requirement complete' }
  }

  revalidatePath(`/scouts/${params.scoutId}`)
  revalidatePath('/advancement')
  return { success: true, data: { requirementProgressId: reqProgress.id } }
}

/**
 * Bulk approve requirements with auto-initialization for unstarted ranks
 * This handles the case where a scout hasn't started a rank yet
 */
export async function bulkApproveRequirementsWithInit(params: {
  scoutId: string
  rankId: string
  requirementIds: string[]
  unitId: string
  versionId: string
  completedAt?: string
  notes?: string
}): Promise<ActionResult<{ successCount: number; failedCount: number; rankProgressId?: string }>> {
  const featureCheck = checkFeatureEnabled<{ successCount: number; failedCount: number; rankProgressId?: string }>()
  if (featureCheck) return featureCheck

  if (params.requirementIds.length === 0) {
    return { success: true, data: { successCount: 0, failedCount: 0 } }
  }

  const auth = await verifyLeaderRole(params.unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()
  const timestamp = params.completedAt || new Date().toISOString()

  // Check if scout has rank progress for this rank
  let { data: rankProgress } = await adminSupabase
    .from('scout_rank_progress')
    .select('id')
    .eq('scout_id', params.scoutId)
    .eq('rank_id', params.rankId)
    .maybeSingle()

  // Create rank progress if it doesn't exist
  if (!rankProgress) {
    const { data: newProgress, error: progressError } = await adminSupabase
      .from('scout_rank_progress')
      .insert({
        scout_id: params.scoutId,
        rank_id: params.rankId,
        version_id: params.versionId,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (progressError) {
      console.error('Error creating rank progress:', progressError)
      return { success: false, error: 'Failed to create rank progress' }
    }

    rankProgress = newProgress

    // Create all requirement progress records for this rank
    const { data: requirements } = await adminSupabase
      .from('bsa_rank_requirements')
      .select('id')
      .eq('version_id', params.versionId)
      .eq('rank_id', params.rankId)

    if (requirements && requirements.length > 0) {
      const reqProgressRecords = requirements.map((req) => ({
        scout_rank_progress_id: rankProgress!.id,
        requirement_id: req.id,
        status: 'not_started' as const,
      }))

      await adminSupabase.from('scout_rank_requirement_progress').insert(reqProgressRecords)
    }
  }

  // Now bulk update the selected requirements
  const { data, error } = await adminSupabase
    .from('scout_rank_requirement_progress')
    .update({
      status: 'completed',
      completed_at: timestamp,
      completed_by: auth.profileId,
      notes: params.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('scout_rank_progress_id', rankProgress.id)
    .in('requirement_id', params.requirementIds)
    .not('status', 'in', '("approved","awarded")')
    .select('id')

  if (error) {
    console.error('Error bulk approving requirements:', error)
    return { success: false, error: 'Failed to approve requirements' }
  }

  const successCount = data?.length || 0
  const failedCount = params.requirementIds.length - successCount

  revalidatePath(`/scouts/${params.scoutId}`)
  revalidatePath('/advancement')
  return { success: true, data: { successCount, failedCount, rankProgressId: rankProgress.id } }
}

/**
 * Get rank requirements by rank code
 * Returns requirements for display even when scout has no progress record
 */
export async function getRankRequirements(rankCode: string) {
  const supabase = await createClient()

  // Get the rank
  const { data: rankData, error: rankError } = await supabase
    .from('bsa_ranks')
    .select('id, code, name, display_order')
    .eq('code', rankCode)
    .single()

  if (rankError || !rankData) {
    console.error('Error fetching rank:', rankError)
    return null
  }

  // Add image_url (images are stored in filesystem, not database)
  const rank = {
    ...rankData,
    image_url: null as string | null,
  }

  // Get the active requirement version
  const { data: version } = await supabase
    .from('bsa_requirement_versions')
    .select('id')
    .eq('is_active', true)
    .order('effective_date', { ascending: false })
    .limit(1)
    .single()

  if (!version) {
    console.error('No active requirement version found')
    return null
  }

  // Get all requirements for this rank (including sub-requirements)
  const { data: requirements, error: reqError } = await supabase
    .from('bsa_rank_requirements')
    .select('id, requirement_number, description, parent_requirement_id')
    .eq('version_id', version.id)
    .eq('rank_id', rank.id)
    .order('display_order')

  if (reqError) {
    console.error('Error fetching requirements:', reqError)
    return null
  }

  return {
    rank,
    versionId: version.id,
    requirements: requirements || [],
  }
}

/**
 * Bulk approve parent submissions (pending_approval items) across multiple scouts
 * Used by the unit-level Pending Approvals modal
 */
export async function bulkApproveParentSubmissions(
  requirementProgressIds: string[],
  unitId: string
): Promise<ActionResult<{ successCount: number; failedCount: number }>> {
  const featureCheck = checkFeatureEnabled<{ successCount: number; failedCount: number }>()
  if (featureCheck) return featureCheck

  if (requirementProgressIds.length === 0) {
    return { success: true, data: { successCount: 0, failedCount: 0 } }
  }

  const auth = await verifyLeaderRole(unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()
  const timestamp = new Date().toISOString()

  // Update all selected pending submissions
  const { data, error } = await adminSupabase
    .from('scout_rank_requirement_progress')
    .update({
      status: 'completed',
      completed_at: timestamp,
      completed_by: auth.profileId,
      approval_status: 'approved',
      reviewed_by: auth.profileId,
      reviewed_at: timestamp,
      updated_at: timestamp,
    })
    .in('id', requirementProgressIds)
    .eq('approval_status', 'pending_approval')
    .select('id')

  if (error) {
    console.error('Error bulk approving parent submissions:', error)
    return { success: false, error: 'Failed to approve submissions' }
  }

  const successCount = data?.length || 0
  const failedCount = requirementProgressIds.length - successCount

  revalidatePath('/advancement')
  return { success: true, data: { successCount, failedCount } }
}

/**
 * Get pending parent submissions for a unit
 */
export async function getPendingSubmissions(unitId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('scout_rank_requirement_progress')
    .select(`
      *,
      scout_rank_progress!inner(
        scout_id,
        scouts!inner(
          id,
          first_name,
          last_name,
          unit_id
        ),
        bsa_ranks(name)
      ),
      bsa_rank_requirements(
        requirement_number,
        description
      ),
      profiles:submitted_by(
        first_name,
        last_name
      )
    `)
    .eq('approval_status', 'pending_approval')
    .eq('scout_rank_progress.scouts.unit_id', unitId)
    .order('submitted_at', { ascending: false })

  if (error) {
    console.error('Error fetching pending submissions:', error)
    return []
  }

  return data
}
