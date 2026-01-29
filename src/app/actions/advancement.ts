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

  // Get the rank to find its requirement_version_year
  const { data: rank } = await adminSupabase
    .from('bsa_ranks')
    .select('id, requirement_version_year')
    .eq('id', rankId)
    .single()

  if (!rank) {
    return { success: false, error: 'Rank not found' }
  }

  if (!rank.requirement_version_year) {
    return { success: false, error: 'Rank does not have a version year set' }
  }

  // Create rank progress record (no version_id needed)
  const { data: progress, error: progressError } = await adminSupabase
    .from('scout_rank_progress')
    .insert({
      scout_id: scoutId,
      rank_id: rankId,
      status: 'in_progress',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (progressError) {
    console.error('Error creating rank progress:', progressError)
    return { success: false, error: 'Failed to initialize rank progress' }
  }

  // Get all top-level requirements for this rank's current version
  const { data: requirements } = await adminSupabase
    .from('bsa_rank_requirements')
    .select('id')
    .eq('rank_id', rankId)
    .eq('version_year', rank.requirement_version_year)
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

  // Only allow undo on completed or approved requirements (not awarded)
  if (!['completed', 'approved'].includes(existing.status)) {
    return { success: false, error: 'Only completed or approved requirements can be undone' }
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
 * Undo a completed/approved merit badge requirement, reverting it to not_started status.
 * Requires a reason note for the audit trail.
 */
export async function undoMeritBadgeRequirementCompletion(
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
    .from('scout_merit_badge_requirement_progress')
    .select('notes, status, scout_merit_badge_progress_id')
    .eq('id', requirementProgressId)
    .single()

  if (!existing) {
    return { success: false, error: 'Requirement progress not found' }
  }

  // Only allow undo on completed or approved requirements (not awarded)
  if (!['completed', 'approved'].includes(existing.status)) {
    return { success: false, error: 'Only completed or approved requirements can be undone' }
  }

  // Append the undo note with reason
  const newNotes = appendNote(existing.notes || null, {
    text: `Undo: ${undoReason.trim()}`,
    author: auth.fullName,
    authorId: auth.profileId,
    type: 'undo',
  })

  const { error } = await adminSupabase
    .from('scout_merit_badge_requirement_progress')
    .update({
      status: 'not_started',
      completed_at: null,
      completed_by: null,
      notes: newNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requirementProgressId)

  if (error) {
    console.error('Error undoing MB requirement completion:', error)
    return { success: false, error: 'Failed to undo requirement completion' }
  }

  // Get scout ID for path revalidation
  const { data: progress } = await adminSupabase
    .from('scout_merit_badge_progress')
    .select('scout_id')
    .eq('id', existing.scout_merit_badge_progress_id)
    .single()

  revalidatePath('/advancement')
  if (progress?.scout_id) {
    revalidatePath(`/scouts/${progress.scout_id}`)
  }
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
 * Add a note to a rank requirement, creating progress record if needed.
 */
export async function addRankRequirementNoteWithInit(params: {
  scoutId: string
  rankId: string
  requirementId: string
  unitId: string
  noteText: string
}): Promise<ActionResult<{ progressId: string }>> {
  const featureCheck = checkFeatureEnabled<{ progressId: string }>()
  if (featureCheck) return featureCheck

  if (!params.noteText || params.noteText.trim().length === 0) {
    return { success: false, error: 'Note text is required' }
  }

  const auth = await verifyLeaderRole(params.unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()

  // Get the rank to find its requirement_version_year
  const { data: rank } = await adminSupabase
    .from('bsa_ranks')
    .select('id, requirement_version_year')
    .eq('id', params.rankId)
    .single()

  if (!rank || !rank.requirement_version_year) {
    return { success: false, error: 'Rank not found or missing version year' }
  }

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

    // Create all requirement progress records for this rank's current version
    const { data: requirements } = await adminSupabase
      .from('bsa_rank_requirements')
      .select('id')
      .eq('rank_id', params.rankId)
      .eq('version_year', rank.requirement_version_year)

    if (requirements && requirements.length > 0) {
      const reqProgressRecords = requirements.map((req) => ({
        scout_rank_progress_id: rankProgress!.id,
        requirement_id: req.id,
        status: 'not_started' as const,
      }))

      await adminSupabase.from('scout_rank_requirement_progress').insert(reqProgressRecords)
    }
  }

  // Find the requirement progress record
  const { data: reqProgress } = await adminSupabase
    .from('scout_rank_requirement_progress')
    .select('id, notes')
    .eq('scout_rank_progress_id', rankProgress.id)
    .eq('requirement_id', params.requirementId)
    .maybeSingle()

  if (!reqProgress) {
    return { success: false, error: 'Requirement progress not found' }
  }

  // Append the new note
  const newNotes = appendNote(reqProgress.notes || null, {
    text: params.noteText.trim(),
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
    .eq('id', reqProgress.id)

  if (error) {
    console.error('Error adding note:', error)
    return { success: false, error: 'Failed to add note' }
  }

  revalidatePath('/advancement')
  revalidatePath(`/scouts/${params.scoutId}`)
  return { success: true, data: { progressId: reqProgress.id } }
}

/**
 * Add a note to a merit badge requirement (requires existing progress record).
 */
export async function updateMeritBadgeRequirementNotes(
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
    .from('scout_merit_badge_requirement_progress')
    .select('notes, scout_merit_badge_progress_id')
    .eq('id', requirementProgressId)
    .single()

  if (!existing) {
    return { success: false, error: 'Requirement progress not found' }
  }

  // Append the new note
  const newNotes = appendNote(existing.notes || null, {
    text: noteText.trim(),
    author: auth.fullName,
    authorId: auth.profileId,
    type: 'general',
  })

  const { error } = await adminSupabase
    .from('scout_merit_badge_requirement_progress')
    .update({
      notes: newNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requirementProgressId)

  if (error) {
    console.error('Error updating MB requirement notes:', error)
    return { success: false, error: 'Failed to update notes' }
  }

  // Get scout ID for path revalidation
  const { data: progress } = await adminSupabase
    .from('scout_merit_badge_progress')
    .select('scout_id')
    .eq('id', existing.scout_merit_badge_progress_id)
    .single()

  revalidatePath('/advancement')
  if (progress?.scout_id) {
    revalidatePath(`/scouts/${progress.scout_id}`)
  }
  return { success: true }
}

/**
 * Add a note to a merit badge requirement, creating progress record if needed.
 */
export async function addMeritBadgeRequirementNoteWithInit(params: {
  meritBadgeProgressId: string
  requirementId: string
  unitId: string
  noteText: string
}): Promise<ActionResult<{ progressId: string }>> {
  const featureCheck = checkFeatureEnabled<{ progressId: string }>()
  if (featureCheck) return featureCheck

  if (!params.noteText || params.noteText.trim().length === 0) {
    return { success: false, error: 'Note text is required' }
  }

  const auth = await verifyLeaderRole(params.unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()

  // Check if requirement progress already exists
  let { data: reqProgress } = await adminSupabase
    .from('scout_merit_badge_requirement_progress')
    .select('id, notes')
    .eq('scout_merit_badge_progress_id', params.meritBadgeProgressId)
    .eq('requirement_id', params.requirementId)
    .maybeSingle()

  // Create requirement progress if it doesn't exist
  if (!reqProgress) {
    const { data: newProgress, error: createError } = await adminSupabase
      .from('scout_merit_badge_requirement_progress')
      .insert({
        scout_merit_badge_progress_id: params.meritBadgeProgressId,
        requirement_id: params.requirementId,
        status: 'not_started',
      })
      .select('id, notes')
      .single()

    if (createError) {
      console.error('Error creating MB requirement progress:', createError)
      return { success: false, error: 'Failed to create requirement progress' }
    }

    reqProgress = newProgress
  }

  // Append the new note
  const newNotes = appendNote(reqProgress.notes || null, {
    text: params.noteText.trim(),
    author: auth.fullName,
    authorId: auth.profileId,
    type: 'general',
  })

  const { error } = await adminSupabase
    .from('scout_merit_badge_requirement_progress')
    .update({
      notes: newNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reqProgress.id)

  if (error) {
    console.error('Error adding MB note:', error)
    return { success: false, error: 'Failed to add note' }
  }

  // Get scout ID for path revalidation
  const { data: progress } = await adminSupabase
    .from('scout_merit_badge_progress')
    .select('scout_id')
    .eq('id', params.meritBadgeProgressId)
    .single()

  revalidatePath('/advancement')
  if (progress?.scout_id) {
    revalidatePath(`/scouts/${progress.scout_id}`)
  }
  return { success: true, data: { progressId: reqProgress.id } }
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
 * Bulk approve merit badge requirements, creating progress records for sub-requirements if needed.
 * This handles the case where sub-requirements (e.g., 1a, 1b) don't have progress records yet.
 */
export async function bulkApproveMeritBadgeRequirementsWithInit(params: {
  scoutId: string
  meritBadgeId: string
  meritBadgeProgressId: string
  requirementIds: string[]
  unitId: string
  completedAt?: string
  notes?: string
}): Promise<ActionResult<{ successCount: number; failedCount: number }>> {
  const featureCheck = checkFeatureEnabled<{ successCount: number; failedCount: number }>()
  if (featureCheck) return featureCheck

  if (params.requirementIds.length === 0) {
    return { success: true, data: { successCount: 0, failedCount: 0 } }
  }

  const auth = await verifyLeaderRole(params.unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()
  const timestamp = params.completedAt || new Date().toISOString()

  // Get existing requirement progress records for this merit badge progress
  const { data: existingProgress } = await adminSupabase
    .from('scout_merit_badge_requirement_progress')
    .select('id, requirement_id')
    .eq('scout_merit_badge_progress_id', params.meritBadgeProgressId)

  const existingProgressByReqId = new Map(
    existingProgress?.map(p => [p.requirement_id, p.id]) || []
  )

  // Separate requirements into those with existing progress and those needing creation
  const requirementsNeedingProgress = params.requirementIds.filter(
    reqId => !existingProgressByReqId.has(reqId)
  )
  const existingProgressIds = params.requirementIds
    .filter(reqId => existingProgressByReqId.has(reqId))
    .map(reqId => existingProgressByReqId.get(reqId)!)

  let successCount = 0
  let failedCount = 0

  // Create progress records for sub-requirements that don't have them
  if (requirementsNeedingProgress.length > 0) {
    const newProgressRecords = requirementsNeedingProgress.map(reqId => ({
      scout_merit_badge_progress_id: params.meritBadgeProgressId,
      requirement_id: reqId,
      status: 'completed' as const,
      completed_at: timestamp,
      completed_by: auth.profileId,
      notes: params.notes || null,
    }))

    const { data: inserted, error: insertError } = await adminSupabase
      .from('scout_merit_badge_requirement_progress')
      .insert(newProgressRecords)
      .select('id')

    if (insertError) {
      console.error('Error creating MB requirement progress:', insertError)
      failedCount += requirementsNeedingProgress.length
    } else {
      successCount += inserted?.length || 0
    }
  }

  // Update existing progress records
  if (existingProgressIds.length > 0) {
    const { data, error } = await adminSupabase
      .from('scout_merit_badge_requirement_progress')
      .update({
        status: 'completed',
        completed_at: timestamp,
        completed_by: auth.profileId,
        notes: params.notes || null,
        updated_at: new Date().toISOString(),
      })
      .in('id', existingProgressIds)
      .not('status', 'in', '("approved")')
      .select('id')

    if (error) {
      console.error('Error bulk updating MB requirements:', error)
      failedCount += existingProgressIds.length
    } else {
      successCount += data?.length || 0
    }
  }

  revalidatePath('/advancement')
  revalidatePath(`/scouts/${params.scoutId}`)
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

  // Get the current active version for this badge
  let effectiveVersionYear: number | null = null

  const { data: currentVersion } = await adminSupabase
    .from('bsa_merit_badge_versions')
    .select('version_year')
    .eq('merit_badge_id', meritBadgeId)
    .eq('is_current', true)
    .maybeSingle()

  if (currentVersion) {
    effectiveVersionYear = currentVersion.version_year
  } else {
    // Fallback: get the badge's requirement_version_year
    const { data: badge } = await adminSupabase
      .from('bsa_merit_badges')
      .select('requirement_version_year')
      .eq('id', meritBadgeId)
      .single()

    if (!badge?.requirement_version_year) {
      return { success: false, error: 'Merit badge does not have a version year set' }
    }
    effectiveVersionYear = badge.requirement_version_year
  }

  // Create merit badge progress record with version tracking
  const { data: progress, error: progressError } = await adminSupabase
    .from('scout_merit_badge_progress')
    .insert({
      scout_id: scoutId,
      merit_badge_id: meritBadgeId,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      counselor_name: counselorName,
      counselor_profile_id: counselorProfileId,
      requirement_version_year: effectiveVersionYear,
    })
    .select('id')
    .single()

  if (progressError) {
    console.error('Error creating merit badge progress:', progressError)
    return { success: false, error: 'Failed to start merit badge tracking' }
  }

  // Get all completable requirements for this badge's active version
  // (exclude headers which are just grouping containers)
  const { data: requirements } = await adminSupabase
    .from('bsa_merit_badge_requirements')
    .select('id')
    .eq('merit_badge_id', meritBadgeId)
    .eq('version_year', effectiveVersionYear)
    .neq('is_header', true)

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

  // Get the rank to find its requirement_version_year
  const { data: rank } = await adminSupabase
    .from('bsa_ranks')
    .select('id, requirement_version_year')
    .eq('id', params.rankId)
    .single()

  if (!rank) {
    return { success: false, error: 'Rank not found' }
  }

  if (!rank.requirement_version_year) {
    return { success: false, error: 'Rank does not have a version year set' }
  }

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

        // Create all requirement progress records for this rank's current version
        const { data: requirements } = await adminSupabase
          .from('bsa_rank_requirements')
          .select('id')
          .eq('rank_id', params.rankId)
          .eq('version_year', rank.requirement_version_year)

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

  // Get the merit badge to find its requirement_version_year
  const { data: badge } = await adminSupabase
    .from('bsa_merit_badges')
    .select('id, requirement_version_year')
    .eq('id', params.meritBadgeId)
    .single()

  if (!badge) {
    return { success: false, error: 'Merit badge not found' }
  }

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
  // Use admin client to bypass RLS for this read-only BSA reference query
  const supabase = createAdminClient()

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
  // Use admin client to bypass RLS for this read-only BSA reference query
  const supabase = createAdminClient()

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
  // Use admin client to bypass RLS for this read-only BSA reference query
  const supabase = createAdminClient()

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
  // Use admin client to bypass RLS for this read-only query
  // Authorization is handled by the calling page which checks user role
  const supabase = createAdminClient()

  // Run all 4 queries in parallel - they are completely independent
  const [rankResult, mbResult, leadResult, actResult] = await Promise.all([
    supabase
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
      .order('bsa_ranks(display_order)'),
    supabase
      .from('scout_merit_badge_progress')
      .select(`
        *,
        bsa_merit_badges(*),
        scout_merit_badge_requirement_progress(
          *,
          bsa_merit_badge_requirements(*)
        )
      `)
      .eq('scout_id', scoutId),
    supabase
      .from('scout_leadership_history')
      .select(`
        *,
        bsa_leadership_positions(*)
      `)
      .eq('scout_id', scoutId)
      .order('start_date', { ascending: false }),
    supabase
      .from('scout_activity_entries')
      .select('*')
      .eq('scout_id', scoutId)
      .order('activity_date', { ascending: false }),
  ])

  const { data: rankProgress, error: rankError } = rankResult
  const { data: meritBadgeProgress, error: mbError } = mbResult
  const { data: leadershipHistory, error: leadError } = leadResult
  const { data: activityEntries, error: actError } = actResult

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
  completedAt: string,
  profileId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  // Get the rank to find its requirement_version_year
  const { data: rank } = await adminSupabase
    .from('bsa_ranks')
    .select('id, requirement_version_year')
    .eq('id', rankId)
    .single()

  if (!rank) {
    return { success: false, error: 'Rank not found' }
  }

  if (!rank.requirement_version_year) {
    return { success: false, error: 'Rank does not have a version year set' }
  }

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
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (progressError) {
      return { success: false, error: 'Failed to create rank progress' }
    }

    rankProgress = newProgress

    // Create all requirement progress records for this rank's current version
    const { data: requirements } = await adminSupabase
      .from('bsa_rank_requirements')
      .select('id')
      .eq('rank_id', rankId)
      .eq('version_year', rank.requirement_version_year)

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
  completedAt: string,
  profileId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  // Get the current active version for this badge
  let effectiveVersionYear: number | null = null

  const { data: currentVersion } = await adminSupabase
    .from('bsa_merit_badge_versions')
    .select('version_year')
    .eq('merit_badge_id', meritBadgeId)
    .eq('is_current', true)
    .maybeSingle()

  if (currentVersion) {
    effectiveVersionYear = currentVersion.version_year
  } else {
    // Fallback: get the badge's requirement_version_year
    const { data: badge } = await adminSupabase
      .from('bsa_merit_badges')
      .select('requirement_version_year')
      .eq('id', meritBadgeId)
      .single()

    if (!badge?.requirement_version_year) {
      return { success: false, error: 'Merit badge does not have a version year set' }
    }
    effectiveVersionYear = badge.requirement_version_year
  }

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
        status: 'in_progress',
        started_at: new Date().toISOString(),
        requirement_version_year: effectiveVersionYear,
      })
      .select('id')
      .single()

    if (progressError) {
      return { success: false, error: 'Failed to create badge progress' }
    }

    badgeProgress = newProgress

    // Create all requirement progress records for this badge's active version
    const { data: requirements } = await adminSupabase
      .from('bsa_merit_badge_requirements')
      .select('id')
      .eq('merit_badge_id', meritBadgeId)
      .eq('version_year', effectiveVersionYear)

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
 * @param meritBadgeId - The merit badge ID
 * @param versionYear - Optional version year (e.g., from scout's progress). If not provided, uses the current active version.
 */
export async function getMeritBadgeRequirements(meritBadgeId: string, versionYear?: number) {
  // Use admin client to bypass RLS for this read-only BSA reference query
  const supabase = createAdminClient()

  let effectiveVersionYear = versionYear

  // If no version year provided, get the current active version
  if (!effectiveVersionYear) {
    const { data: currentVersion } = await supabase
      .from('bsa_merit_badge_versions')
      .select('version_year')
      .eq('merit_badge_id', meritBadgeId)
      .eq('is_current', true)
      .maybeSingle()

    if (currentVersion) {
      effectiveVersionYear = currentVersion.version_year
    } else {
      // Fallback: get the badge's requirement_version_year
      const { data: badge } = await supabase
        .from('bsa_merit_badges')
        .select('requirement_version_year')
        .eq('id', meritBadgeId)
        .single()

      if (!badge?.requirement_version_year) {
        console.error('Merit badge does not have a version year set')
        return []
      }
      effectiveVersionYear = badge.requirement_version_year
    }
  }

  const { data, error } = await supabase
    .from('bsa_merit_badge_requirements')
    .select(`
      id,
      version_year,
      merit_badge_id,
      requirement_number,
      parent_requirement_id,
      sub_requirement_letter,
      description,
      display_order,
      is_alternative,
      alternatives_group,
      nesting_depth,
      required_count,
      is_header
    `)
    .eq('merit_badge_id', meritBadgeId)
    .eq('version_year', effectiveVersionYear)
    .order('display_order')

  if (error) {
    console.error('Error fetching merit badge requirements:', error)
    return []
  }

  // Return with explicit type to ensure all fields are available
  return data as Array<{
    id: string
    version_year: number | null
    merit_badge_id: string
    requirement_number: string
    parent_requirement_id: string | null
    sub_requirement_letter: string | null
    description: string
    display_order: number
    is_alternative: boolean | null
    alternatives_group: string | null
    nesting_depth: number | null
    required_count: number | null
    is_header: boolean | null
  }>
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
  completedAt?: string
  notes?: string
}): Promise<ActionResult<{ requirementProgressId: string }>> {
  const featureCheck = checkFeatureEnabled<{ requirementProgressId: string }>()
  if (featureCheck) return featureCheck

  const auth = await verifyLeaderRole(params.unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()

  // Get the rank to find its requirement_version_year
  const { data: rank } = await adminSupabase
    .from('bsa_ranks')
    .select('id, requirement_version_year')
    .eq('id', params.rankId)
    .single()

  if (!rank) {
    return { success: false, error: 'Rank not found' }
  }

  if (!rank.requirement_version_year) {
    return { success: false, error: 'Rank does not have a version year set' }
  }

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

    // Create all requirement progress records for this rank's current version
    const { data: requirements } = await adminSupabase
      .from('bsa_rank_requirements')
      .select('id')
      .eq('rank_id', params.rankId)
      .eq('version_year', rank.requirement_version_year)

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

  // Get the rank to find its requirement_version_year
  const { data: rank } = await adminSupabase
    .from('bsa_ranks')
    .select('id, requirement_version_year')
    .eq('id', params.rankId)
    .single()

  if (!rank) {
    return { success: false, error: 'Rank not found' }
  }

  if (!rank.requirement_version_year) {
    return { success: false, error: 'Rank does not have a version year set' }
  }

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

    // Create all requirement progress records for this rank's current version
    const { data: requirements } = await adminSupabase
      .from('bsa_rank_requirements')
      .select('id')
      .eq('rank_id', params.rankId)
      .eq('version_year', rank.requirement_version_year)

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

  // Get the rank with its requirement_version_year
  const { data: rankData, error: rankError } = await supabase
    .from('bsa_ranks')
    .select('id, code, name, display_order, requirement_version_year')
    .eq('code', rankCode)
    .single()

  if (rankError || !rankData) {
    console.error('Error fetching rank:', rankError)
    return null
  }

  if (!rankData.requirement_version_year) {
    console.error('Rank does not have a version year set')
    return null
  }

  // Capture version year as non-null after the check
  const versionYear = rankData.requirement_version_year

  // Add image_url (images are stored in filesystem, not database)
  const rank = {
    ...rankData,
    image_url: null as string | null,
  }

  // Get all requirements for this rank's current version
  const { data: requirements, error: reqError } = await supabase
    .from('bsa_rank_requirements')
    .select('id, requirement_number, description, parent_requirement_id, is_alternative, alternatives_group, version_year')
    .eq('rank_id', rank.id)
    .eq('version_year', versionYear)
    .order('display_order')

  if (reqError) {
    console.error('Error fetching requirements:', reqError)
    return null
  }

  return {
    rank,
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

/**
 * Bulk sign off requirements for multiple scouts
 * Used by the unit-level advancement view (/advancement)
 * Creates progress records for each scout × requirement combination
 */
export async function bulkSignOffForScouts(params: {
  type: 'rank' | 'merit-badge'
  requirementIds: string[]
  scoutIds: string[]
  unitId: string
  itemId: string // rank_id or merit_badge_id
  date: string
  completedBy: string
}): Promise<ActionResult<{ successCount: number; failedCount: number; errors: string[] }>> {
  // Convert to the format expected by bulkRecordProgress
  const entries: Array<{
    scoutId: string
    requirementId: string
    type: 'rank' | 'merit_badge'
    parentId: string
  }> = []

  for (const scoutId of params.scoutIds) {
    for (const requirementId of params.requirementIds) {
      entries.push({
        scoutId,
        requirementId,
        type: params.type === 'rank' ? 'rank' : 'merit_badge',
        parentId: params.itemId,
      })
    }
  }

  return bulkRecordProgress({
    entries,
    unitId: params.unitId,
    completedAt: params.date,
    notes: `Signed off by ${params.completedBy}`,
  })
}

/**
 * Get available versions for a merit badge
 * Returns all versions stored in bsa_merit_badge_versions
 */
export async function getMeritBadgeVersions(meritBadgeId: string): Promise<ActionResult<{
  versions: Array<{
    version_year: number
    is_current: boolean | null
    source: string | null
  }>
  currentYear: number | null
}>> {
  // Use admin client to bypass RLS for this read-only BSA reference query
  const supabase = createAdminClient()

  const { data: versions, error } = await supabase
    .from('bsa_merit_badge_versions')
    .select('version_year, is_current, source')
    .eq('merit_badge_id', meritBadgeId)
    .order('version_year', { ascending: false })

  if (error) {
    console.error('Error fetching merit badge versions:', error)
    return { success: false, error: 'Failed to fetch versions' }
  }

  const currentVersion = versions?.find(v => v.is_current)

  return {
    success: true,
    data: {
      versions: versions || [],
      currentYear: currentVersion?.version_year || null,
    },
  }
}

/**
 * Get a scout's current version year for a merit badge
 */
export async function getScoutMeritBadgeVersion(
  scoutId: string,
  meritBadgeId: string
): Promise<ActionResult<{ versionYear: number | null; progressId: string | null }>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('scout_merit_badge_progress')
    .select('id, requirement_version_year')
    .eq('scout_id', scoutId)
    .eq('merit_badge_id', meritBadgeId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching scout merit badge version:', error)
    return { success: false, error: 'Failed to fetch version' }
  }

  return {
    success: true,
    data: {
      versionYear: data?.requirement_version_year || null,
      progressId: data?.id || null,
    },
  }
}

/**
 * Get requirements for a specific version of a merit badge
 * Used for version comparison/switching
 */
export async function getMeritBadgeRequirementsForVersion(
  meritBadgeId: string,
  versionYear: number
): Promise<ActionResult<Array<{
  id: string
  requirement_number: string
  scoutbook_requirement_number: string | null
  description: string
  display_order: number
  parent_requirement_id: string | null
  nesting_depth: number | null
  is_header: boolean | null
}>>> {
  // Use admin client to bypass RLS for this read-only BSA reference query
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('bsa_merit_badge_requirements')
    .select(`
      id,
      requirement_number,
      scoutbook_requirement_number,
      description,
      display_order,
      parent_requirement_id,
      nesting_depth,
      is_header
    `)
    .eq('merit_badge_id', meritBadgeId)
    .eq('version_year', versionYear)
    .order('display_order')

  if (error) {
    console.error('Error fetching requirements for version:', error)
    return { success: false, error: 'Failed to fetch requirements' }
  }

  return { success: true, data: data || [] }
}

interface RequirementMapping {
  sourceReqNumber: string
  targetReqId: string | null
  targetReqNumber: string | null
  confidence: 'exact' | 'likely' | 'manual' | 'none'
}

/**
 * Switch a scout's merit badge to a different requirement version.
 * This will:
 * 1. Update the progress record with the new version year
 * 2. Map completed requirements to the new version based on provided mappings
 * 3. Create new requirement progress records for mapped requirements
 * 4. Preserve unmapped requirements as historical notes
 */
export async function switchMeritBadgeVersion(params: {
  unitId: string
  scoutId: string
  meritBadgeId: string
  progressId: string
  currentVersionYear: number
  targetVersionYear: number
  mappings: RequirementMapping[]
}): Promise<ActionResult<{
  mappedCount: number
  unmappedCount: number
}>> {
  const featureCheck = checkFeatureEnabled<{ mappedCount: number; unmappedCount: number }>()
  if (featureCheck) return featureCheck

  const auth = await verifyLeaderRole(params.unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()
  const timestamp = new Date().toISOString()

  try {
    // 1. Get existing requirement progress for this badge (with requirement_number for matching)
    const { data: existingProgress } = await adminSupabase
      .from('scout_merit_badge_requirement_progress')
      .select(`
        id,
        requirement_id,
        status,
        completed_at,
        completed_by,
        notes,
        bsa_merit_badge_requirements!inner(requirement_number)
      `)
      .eq('scout_merit_badge_progress_id', params.progressId)
      .eq('status', 'completed')

    // 2. Update the main progress record with new version year
    const { error: updateError } = await adminSupabase
      .from('scout_merit_badge_progress')
      .update({
        requirement_version_year: params.targetVersionYear,
        updated_at: timestamp,
      })
      .eq('id', params.progressId)

    if (updateError) {
      console.error('Error updating progress version:', updateError)
      return { success: false, error: 'Failed to update version' }
    }

    // 3. Delete old requirement progress records
    if (existingProgress && existingProgress.length > 0) {
      const { error: deleteError } = await adminSupabase
        .from('scout_merit_badge_requirement_progress')
        .delete()
        .eq('scout_merit_badge_progress_id', params.progressId)

      if (deleteError) {
        console.error('Error deleting old progress:', deleteError)
        // Don't fail completely, try to continue
      }
    }

    // 4. Create new requirement progress records for mapped requirements
    let mappedCount = 0
    let unmappedCount = 0

    for (const mapping of params.mappings) {
      if (mapping.targetReqId && mapping.confidence !== 'none') {
        // Find the original progress for this requirement by matching requirement_number
        const originalProgress = existingProgress?.find(p => {
          const reqNumber = (p.bsa_merit_badge_requirements as { requirement_number: string })?.requirement_number
          return reqNumber === mapping.sourceReqNumber
        })

        const { error: insertError } = await adminSupabase
          .from('scout_merit_badge_requirement_progress')
          .insert({
            scout_merit_badge_progress_id: params.progressId,
            requirement_id: mapping.targetReqId,
            status: 'completed',
            completed_at: originalProgress?.completed_at || timestamp,
            completed_by: originalProgress?.completed_by || auth.profileId,
            notes: appendNote(originalProgress?.notes || null, {
              text: `Mapped from ${params.currentVersionYear} requirement ${mapping.sourceReqNumber} (${mapping.confidence} match)`,
              author: auth.fullName,
              authorId: auth.profileId,
              type: 'general',
            }),
          })

        if (insertError) {
          console.error('Error inserting mapped progress:', insertError)
          unmappedCount++
        } else {
          mappedCount++
        }
      } else {
        unmappedCount++
      }
    }

    revalidatePath(`/scouts/${params.scoutId}`)
    revalidatePath('/advancement')

    return {
      success: true,
      data: { mappedCount, unmappedCount },
    }
  } catch (error) {
    console.error('Error switching version:', error)
    return { success: false, error: 'Failed to switch version' }
  }
}

// ==========================================
// OPTIMIZED UNIT ADVANCEMENT QUERIES
// ==========================================

/**
 * Get unit advancement summary stats in a single optimized query.
 * Returns counts needed for the summary tab without loading all data.
 * Uses admin client for read-only access - authorization handled by calling page.
 */
export async function getUnitAdvancementSummary(unitId: string): Promise<ActionResult<{
  scoutCount: number
  scouts: Array<{
    id: string
    first_name: string
    last_name: string
    rank: string | null
    patrol_name: string | null
  }>
  rankStats: {
    scoutsWorkingOnRanks: number
    avgProgressPercent: number
  }
  badgeStats: {
    inProgress: number
    earned: number
  }
  pendingApprovals: {
    rankRequirements: number
    meritBadges: number
  }
}>> {
  // Use admin client for read-only query - authorization handled by calling page
  const supabase = createAdminClient()

  // Get scouts with minimal data
  const { data: scouts, error: scoutsError } = await supabase
    .from('scouts')
    .select(`
      id,
      first_name,
      last_name,
      rank,
      patrols (name)
    `)
    .eq('unit_id', unitId)
    .eq('is_active', true)
    .order('last_name')

  if (scoutsError) {
    console.error('Error fetching scouts:', scoutsError)
    return { success: false, error: 'Failed to fetch scouts' }
  }

  const scoutIds = scouts?.map(s => s.id) || []

  if (scoutIds.length === 0) {
    return {
      success: true,
      data: {
        scoutCount: 0,
        scouts: [],
        rankStats: { scoutsWorkingOnRanks: 0, avgProgressPercent: 0 },
        badgeStats: { inProgress: 0, earned: 0 },
        pendingApprovals: { rankRequirements: 0, meritBadges: 0 },
      },
    }
  }

  // Run parallel queries for stats only
  const [rankProgressResult, badgeProgressResult, pendingRankResult, pendingBadgeResult] = await Promise.all([
    // Rank progress with requirement counts
    supabase
      .from('scout_rank_progress')
      .select(`
        id,
        scout_id,
        status,
        scout_rank_requirement_progress (
          status
        )
      `)
      .in('scout_id', scoutIds)
      .eq('status', 'in_progress'),

    // Merit badge counts by status
    supabase
      .from('scout_merit_badge_progress')
      .select('id, status')
      .in('scout_id', scoutIds),

    // Pending rank requirement approvals count
    supabase
      .from('scout_rank_requirement_progress')
      .select('id', { count: 'exact', head: true })
      .eq('approval_status', 'pending_approval'),

    // Pending merit badge approvals count
    supabase
      .from('scout_merit_badge_progress')
      .select('id', { count: 'exact', head: true })
      .in('scout_id', scoutIds)
      .eq('status', 'completed'),
  ])

  // Calculate rank stats
  const inProgressRanks = rankProgressResult.data || []
  let totalReqs = 0
  let completedReqs = 0
  for (const rp of inProgressRanks) {
    const reqs = rp.scout_rank_requirement_progress || []
    totalReqs += reqs.length
    completedReqs += reqs.filter((r: { status: string }) =>
      ['completed', 'approved', 'awarded'].includes(r.status)
    ).length
  }
  const avgProgressPercent = totalReqs > 0 ? Math.round((completedReqs / totalReqs) * 100) : 0

  // Calculate badge stats
  const badgeProgress = badgeProgressResult.data || []
  const inProgressBadges = badgeProgress.filter(b => b.status === 'in_progress').length
  const earnedBadges = badgeProgress.filter(b => b.status === 'awarded').length

  return {
    success: true,
    data: {
      scoutCount: scouts?.length || 0,
      scouts: (scouts || []).map(s => ({
        id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        rank: s.rank,
        patrol_name: (s.patrols as { name: string } | null)?.name || null,
      })),
      rankStats: {
        scoutsWorkingOnRanks: inProgressRanks.length,
        avgProgressPercent,
      },
      badgeStats: {
        inProgress: inProgressBadges,
        earned: earnedBadges,
      },
      pendingApprovals: {
        rankRequirements: pendingRankResult.count || 0,
        meritBadges: pendingBadgeResult.count || 0,
      },
    },
  }
}

/**
 * Get distinct merit badge categories.
 * Much lighter than loading all 141 badges just to extract categories.
 * Uses admin client for read-only access - authorization handled by calling page.
 */
export async function getMeritBadgeCategories(): Promise<ActionResult<string[]>> {
  const supabase = createAdminClient()

  // Use distinct query to get only unique categories
  const { data, error } = await supabase
    .from('bsa_merit_badges')
    .select('category')
    .eq('is_active', true)
    .not('category', 'is', null)

  if (error) {
    console.error('Error fetching categories:', error)
    return { success: false, error: 'Failed to fetch categories' }
  }

  // Extract unique categories
  const categories = [...new Set(data?.map(b => b.category).filter(Boolean) as string[])]
  return { success: true, data: categories.sort() }
}

/**
 * Get rank requirements filtered by version year.
 * Only loads requirements for the current version, not all 1000+ historical requirements.
 * Uses admin client for read-only access - authorization handled by calling page.
 */
export async function getRankRequirementsForUnit(
  versionYear?: number
): Promise<ActionResult<{
  ranks: Array<{
    id: string
    code: string
    name: string
    display_order: number
    is_eagle_required: boolean | null
    description: string | null
    requirement_version_year: number | null
  }>
  requirements: Array<{
    id: string
    rank_id: string
    version_year: number | null
    requirement_number: string
    parent_requirement_id: string | null
    sub_requirement_letter: string | null
    description: string
    is_alternative: boolean | null
    alternatives_group: string | null
    display_order: number
  }>
}>> {
  const supabase = createAdminClient()

  // Get ranks with their version years
  const { data: ranks, error: ranksError } = await supabase
    .from('bsa_ranks')
    .select('id, code, name, display_order, is_eagle_required, description, requirement_version_year')
    .order('display_order')

  if (ranksError) {
    console.error('Error fetching ranks:', ranksError)
    return { success: false, error: 'Failed to fetch ranks' }
  }

  // Build query for requirements - filter by version year if provided
  let reqQuery = supabase
    .from('bsa_rank_requirements')
    .select('id, rank_id, version_year, requirement_number, parent_requirement_id, sub_requirement_letter, description, is_alternative, alternatives_group, display_order')
    .order('display_order')

  // If version year specified, filter to that year
  // Otherwise, filter to each rank's requirement_version_year
  if (versionYear) {
    reqQuery = reqQuery.eq('version_year', versionYear)
  } else {
    // Get only requirements matching each rank's current version
    const rankVersionYears = [...new Set(
      (ranks || [])
        .map(r => r.requirement_version_year)
        .filter((y): y is number => y !== null)
    )]
    if (rankVersionYears.length > 0) {
      reqQuery = reqQuery.in('version_year', rankVersionYears)
    }
  }

  const { data: requirements, error: reqError } = await reqQuery

  if (reqError) {
    console.error('Error fetching rank requirements:', reqError)
    return { success: false, error: 'Failed to fetch requirements' }
  }

  return {
    success: true,
    data: {
      ranks: ranks || [],
      requirements: requirements || [],
    },
  }
}

/**
 * Get data for the Rank Requirements Browser tab (lazy loaded).
 * Fetches scouts with their rank progress for a unit.
 * Uses admin client for read-only access - authorization handled by calling page.
 */
export async function getRankBrowserData(unitId: string): Promise<ActionResult<{
  scouts: Array<{
    id: string
    first_name: string
    last_name: string
    rank: string | null
    is_active: boolean | null
    scout_rank_progress: Array<{
      id: string
      rank_id: string
      status: string
      scout_rank_requirement_progress: Array<{
        id: string
        requirement_id: string
        status: string
      }>
    }>
  }>
}>> {
  const supabase = createAdminClient()

  const { data: scouts, error } = await supabase
    .from('scouts')
    .select(`
      id,
      first_name,
      last_name,
      rank,
      is_active,
      scout_rank_progress (
        id,
        rank_id,
        status,
        scout_rank_requirement_progress (
          id,
          requirement_id,
          status
        )
      )
    `)
    .eq('unit_id', unitId)
    .eq('is_active', true)
    .order('last_name')

  if (error) {
    console.error('Error fetching rank browser data:', error)
    return { success: false, error: 'Failed to fetch rank browser data' }
  }

  return {
    success: true,
    data: {
      scouts: scouts || [],
    },
  }
}

/**
 * Get data for the Merit Badge Browser tab (lazy loaded).
 * Fetches scouts with badge progress and all active badges.
 * Uses admin client for read-only access - authorization handled by calling page.
 */
export async function getMeritBadgeBrowserData(unitId: string): Promise<ActionResult<{
  badges: Array<{
    id: string
    code: string
    name: string
    category: string | null
    description: string | null
    is_eagle_required: boolean | null
    is_active: boolean | null
    image_url: string | null
    pamphlet_url: string | null
    requirement_version_year: number | null
  }>
  scouts: Array<{
    id: string
    first_name: string
    last_name: string
    is_active: boolean | null
    scout_merit_badge_progress: Array<{
      id: string
      merit_badge_id: string
      status: string
      counselor_name: string | null
      started_at: string | null
      completed_at: string | null
      awarded_at: string | null
      scout_merit_badge_requirement_progress: Array<{
        id: string
        requirement_id: string
        status: string
        completed_at: string | null
        completed_by: string | null
        notes: string | null
      }>
    }>
  }>
}>> {
  const supabase = createAdminClient()

  // Run both queries in parallel
  const [badgesResult, scoutsResult] = await Promise.all([
    supabase
      .from('bsa_merit_badges')
      .select('id, code, name, category, description, is_eagle_required, is_active, image_url, pamphlet_url, requirement_version_year')
      .eq('is_active', true)
      .order('name'),

    supabase
      .from('scouts')
      .select(`
        id,
        first_name,
        last_name,
        is_active,
        scout_merit_badge_progress (
          id,
          merit_badge_id,
          status,
          counselor_name,
          started_at,
          completed_at,
          awarded_at,
          scout_merit_badge_requirement_progress (
            id,
            requirement_id,
            status,
            completed_at,
            completed_by,
            notes
          )
        )
      `)
      .eq('unit_id', unitId)
      .eq('is_active', true)
      .order('last_name'),
  ])

  if (badgesResult.error) {
    console.error('Error fetching badges:', badgesResult.error)
    return { success: false, error: 'Failed to fetch badges' }
  }

  if (scoutsResult.error) {
    console.error('Error fetching scouts with badge progress:', scoutsResult.error)
    return { success: false, error: 'Failed to fetch scout badge progress' }
  }

  return {
    success: true,
    data: {
      badges: badgesResult.data || [],
      scouts: scoutsResult.data || [],
    },
  }
}
