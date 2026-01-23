'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import {
  type ParsedRankProgress,
  type ParsedMeritBadge,
  type ParsedLeadershipPosition,
  type ParsedActivities,
} from '@/lib/import/scoutbook-history-parser'
import type { ImportSelections } from '@/components/import/scoutbook-history-preview'
import { scoutbookToDisplayFormat } from '@/lib/format/requirement-number'

interface ActionResult<T = void> {
  success: boolean
  error?: string
  data?: T
}

interface ImportResult {
  ranksImported: number
  requirementsImported: number
  badgesImported: number
  leadershipImported: number
  activitiesImported: number
}

/**
 * Normalize requirement number from Scoutbook CSV format
 *
 * The CSV uses Scoutbook's parenthetical format (6A(a)(1)).
 * We now store this format directly in scoutbook_requirement_number column.
 *
 * This function normalizes case and whitespace for matching.
 */
function normalizeScoutbookRequirement(csvReq: string): string {
  // Just trim whitespace - preserve exact format for matching
  return csvReq.trim()
}

/**
 * Legacy: Normalize requirement number from CSV format to display format
 *
 * Handles Option A/B badge structures like Cycling requirement 6:
 * - CSV format: 6A(a)(1) where:
 *   - 6 = main requirement
 *   - A = Option A (vs B)
 *   - (a) = sub-requirement letter
 *   - (1) = detail number
 * - Display format: 6Aa1
 *
 * @deprecated Use normalizeScoutbookRequirement and match against scoutbook_requirement_number
 */
function normalizeRequirementNumber(csvReq: string): string {
  return scoutbookToDisplayFormat(csvReq.trim()).toLowerCase()
}

// Helper to verify leader role
async function verifyLeaderRole(unitId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
    return { error: 'Only leaders can import advancement records' }
  }

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Unknown'
  return { profileId: profile.id, role: membership.role, fullName }
}

/**
 * Import ScoutBook history data for a specific scout
 */
export async function importScoutbookHistory(
  scoutId: string,
  unitId: string,
  selections: ImportSelections,
  activities: ParsedActivities
): Promise<ActionResult<ImportResult>> {
  const auth = await verifyLeaderRole(unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()

  // Get rank IDs with their version years
  const { data: ranks } = await adminSupabase
    .from('bsa_ranks')
    .select('id, code, name, requirement_version_year')
    .order('display_order')

  const rankMap = new Map(ranks?.map((r) => [r.code, r]) || [])
  const rankNameMap = new Map(ranks?.map((r) => [r.name.toLowerCase(), r]) || [])

  // Get merit badge IDs with version years
  const { data: meritBadges } = await adminSupabase
    .from('bsa_merit_badges')
    .select('id, name, requirement_version_year')
    .eq('is_active', true)

  const badgeNameMap = new Map(meritBadges?.map((mb) => [mb.name.toLowerCase().replace(/[^a-z0-9]+/g, '_'), mb]) || [])

  // Get leadership position IDs
  const { data: positions } = await adminSupabase.from('bsa_leadership_positions').select('id, name, code')

  const positionMap = new Map<string, string>()
  positions?.forEach((p) => {
    positionMap.set(p.name.toLowerCase(), p.id)
    if (p.code) positionMap.set(p.code.toLowerCase(), p.id)
  })

  const result: ImportResult = {
    ranksImported: 0,
    requirementsImported: 0,
    badgesImported: 0,
    leadershipImported: 0,
    activitiesImported: 0,
  }

  // Import rank progress
  for (const rankProgress of selections.rankProgress) {
    const rank = rankMap.get(rankProgress.rankCode) || rankNameMap.get(rankProgress.rankName.toLowerCase())
    if (!rank) {
      console.log(`Rank not found: ${rankProgress.rankCode} / ${rankProgress.rankName}`)
      continue
    }

    if (!rank.requirement_version_year) {
      console.log(`Rank ${rank.name} does not have a version year set`)
      continue
    }

    const rankId = rank.id

    // Check if scout already has progress for this rank
    const { data: existingProgress } = await adminSupabase
      .from('scout_rank_progress')
      .select('id')
      .eq('scout_id', scoutId)
      .eq('rank_id', rankId)
      .maybeSingle()

    let progressId: string

    if (existingProgress) {
      progressId = existingProgress.id
      // Update if there's new completion date
      if (rankProgress.completedDate) {
        await adminSupabase
          .from('scout_rank_progress')
          .update({
            status: 'awarded',
            awarded_at: rankProgress.completedDate,
            updated_at: new Date().toISOString(),
          })
          .eq('id', progressId)
      }
    } else {
      // Create new rank progress
      const { data: newProgress, error: progressError } = await adminSupabase
        .from('scout_rank_progress')
        .insert({
          scout_id: scoutId,
          rank_id: rankId,
          status: rankProgress.completedDate ? 'awarded' : 'in_progress',
          started_at: new Date().toISOString(),
          awarded_at: rankProgress.completedDate || null,
        })
        .select('id')
        .single()

      if (progressError || !newProgress) {
        console.error('Error creating rank progress:', progressError)
        continue
      }

      progressId = newProgress.id
      result.ranksImported++
    }

    // Get requirements for this rank's current version
    const { data: requirements } = await adminSupabase
      .from('bsa_rank_requirements')
      .select('id, requirement_number')
      .eq('rank_id', rankId)
      .eq('version_year', rank.requirement_version_year)

    const reqMap = new Map(requirements?.map((r) => [r.requirement_number, r.id]) || [])

    // Import requirement completions
    for (const req of rankProgress.requirements) {
      if (!req.completedDate) continue

      const reqId = reqMap.get(req.requirementNumber)
      if (!reqId) continue

      // Check if requirement progress already exists
      const { data: existingReqProgress } = await adminSupabase
        .from('scout_rank_requirement_progress')
        .select('id, status')
        .eq('scout_rank_progress_id', progressId)
        .eq('requirement_id', reqId)
        .maybeSingle()

      if (existingReqProgress) {
        // Only update if not already completed
        if (!['completed', 'approved', 'awarded'].includes(existingReqProgress.status)) {
          await adminSupabase
            .from('scout_rank_requirement_progress')
            .update({
              status: 'completed',
              completed_at: req.completedDate,
              completed_by: auth.profileId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingReqProgress.id)
          result.requirementsImported++
        }
      } else {
        // Create new requirement progress
        await adminSupabase.from('scout_rank_requirement_progress').insert({
          scout_rank_progress_id: progressId,
          requirement_id: reqId,
          status: 'completed',
          completed_at: req.completedDate,
          completed_by: auth.profileId,
        })
        result.requirementsImported++
      }
    }
  }

  // Import completed merit badges
  for (const badgeEntry of selections.completedMeritBadges) {
    const meritBadge = badgeNameMap.get(badgeEntry.normalizedName)
    if (!meritBadge) {
      console.log(`Badge not found: ${badgeEntry.name} (${badgeEntry.normalizedName})`)
      continue
    }

    const badgeId = meritBadge.id

    // Check if scout already has progress for this badge
    const { data: existingProgress } = await adminSupabase
      .from('scout_merit_badge_progress')
      .select('id')
      .eq('scout_id', scoutId)
      .eq('merit_badge_id', badgeId)
      .maybeSingle()

    if (existingProgress) {
      // Update to awarded if completed
      await adminSupabase
        .from('scout_merit_badge_progress')
        .update({
          status: 'awarded',
          completed_at: badgeEntry.completedDate,
          awarded_at: badgeEntry.completedDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingProgress.id)
    } else {
      // Create new badge progress as awarded
      await adminSupabase.from('scout_merit_badge_progress').insert({
        scout_id: scoutId,
        merit_badge_id: badgeId,
        status: 'awarded',
        started_at: badgeEntry.startDate || badgeEntry.completedDate || new Date().toISOString(),
        completed_at: badgeEntry.completedDate,
        awarded_at: badgeEntry.completedDate,
      })
    }
    result.badgesImported++
  }

  // Import partial merit badges with requirement completions
  for (const badgeEntry of selections.partialMeritBadges) {
    const meritBadge = badgeNameMap.get(badgeEntry.normalizedName)
    if (!meritBadge) {
      console.log(`Badge not found: ${badgeEntry.name} (${badgeEntry.normalizedName})`)
      continue
    }

    if (!meritBadge.requirement_version_year) {
      console.log(`Badge ${meritBadge.name} does not have a version year set`)
      continue
    }

    const badgeId = meritBadge.id

    // Check if scout already has progress for this badge
    let { data: existingProgress } = await adminSupabase
      .from('scout_merit_badge_progress')
      .select('id')
      .eq('scout_id', scoutId)
      .eq('merit_badge_id', badgeId)
      .maybeSingle()

    let progressId: string

    if (!existingProgress) {
      // Determine version year from CSV or badge default
      const versionYear = badgeEntry.version
        ? parseInt(badgeEntry.version, 10)
        : meritBadge.requirement_version_year

      // Create new badge progress as in_progress
      const { data: newProgress } = await adminSupabase
        .from('scout_merit_badge_progress')
        .insert({
          scout_id: scoutId,
          merit_badge_id: badgeId,
          status: 'in_progress',
          started_at: badgeEntry.startDate || new Date().toISOString(),
          requirement_version_year: versionYear,
        })
        .select('id')
        .single()

      if (!newProgress) {
        console.log(`Failed to create progress for badge: ${badgeEntry.name}`)
        continue
      }
      progressId = newProgress.id
      result.badgesImported++
    } else {
      progressId = existingProgress.id
    }

    // Import individual requirement completions
    if (badgeEntry.completedRequirements.length > 0) {
      // Determine version year: use CSV version if available, otherwise badge default
      const versionYear = badgeEntry.version
        ? parseInt(badgeEntry.version, 10)
        : meritBadge.requirement_version_year

      // Get all requirements for this badge's version
      const { data: badgeRequirements } = await adminSupabase
        .from('bsa_merit_badge_requirements')
        .select('id, requirement_number, scoutbook_requirement_number, sub_requirement_letter')
        .eq('merit_badge_id', badgeId)
        .eq('version_year', versionYear)

      if (badgeRequirements && badgeRequirements.length > 0) {
        // Create maps for quick lookup - prefer scoutbook format, fallback to legacy
        const scoutbookReqMap = new Map<string, string>()
        const legacyReqMap = new Map<string, string>()

        for (const req of badgeRequirements) {
          // Primary: Use scoutbook_requirement_number if available
          if (req.scoutbook_requirement_number) {
            scoutbookReqMap.set(req.scoutbook_requirement_number, req.id)
          }

          // Fallback: Use legacy format (requirement_number + sub_requirement_letter)
          const legacyKey = req.sub_requirement_letter
            ? `${req.requirement_number}${req.sub_requirement_letter}`
            : req.requirement_number
          legacyReqMap.set(legacyKey.toLowerCase(), req.id)
        }

        // Import each completed requirement
        for (const reqNum of badgeEntry.completedRequirements) {
          const normalizedScoutbook = normalizeScoutbookRequirement(reqNum)
          const normalizedLegacy = normalizeRequirementNumber(reqNum)

          // Try scoutbook format first, then legacy format
          let requirementId = scoutbookReqMap.get(normalizedScoutbook)
          if (!requirementId) {
            requirementId = legacyReqMap.get(normalizedLegacy)
          }

          if (!requirementId) {
            console.log(
              `Requirement not found for ${badgeEntry.name}: ${reqNum} ` +
                `(scoutbook: ${normalizedScoutbook}, legacy: ${normalizedLegacy})`
            )
            continue
          }

          // Check if this requirement progress already exists
          const { data: existingReqProgress } = await adminSupabase
            .from('scout_merit_badge_requirement_progress')
            .select('id')
            .eq('scout_merit_badge_progress_id', progressId)
            .eq('requirement_id', requirementId)
            .maybeSingle()

          if (!existingReqProgress) {
            await adminSupabase.from('scout_merit_badge_requirement_progress').insert({
              scout_merit_badge_progress_id: progressId,
              requirement_id: requirementId,
              status: 'completed',
              completed_at: badgeEntry.startDate || new Date().toISOString(),
              completed_by: auth.profileId,
              notes: 'Imported from ScoutBook history',
            })
            result.requirementsImported++
          }
        }
      }
    }
  }

  // Import leadership history
  for (const position of selections.leadershipHistory) {
    const positionId = positionMap.get(position.name.toLowerCase())
    if (!positionId) {
      console.log(`Position not found: ${position.name}`)
      continue
    }

    // Skip if no start date
    if (!position.startDate) {
      console.log(`Skipping position without start date: ${position.name}`)
      continue
    }

    // Check if this exact position already exists
    const { data: existingPosition } = await adminSupabase
      .from('scout_leadership_history')
      .select('id')
      .eq('scout_id', scoutId)
      .eq('position_id', positionId)
      .eq('start_date', position.startDate)
      .maybeSingle()

    if (!existingPosition) {
      await adminSupabase.from('scout_leadership_history').insert({
        scout_id: scoutId,
        position_id: positionId,
        unit_id: unitId,
        start_date: position.startDate,
        end_date: position.endDate,
      })
      result.leadershipImported++
    }
  }

  // Import activities if selected
  if (selections.includeActivities) {
    const today = new Date().toISOString().split('T')[0]

    if (activities.campingNights > 0) {
      await adminSupabase.from('scout_activity_entries').insert({
        scout_id: scoutId,
        activity_type: 'camping',
        activity_date: today,
        value: activities.campingNights,
        description: 'Imported from ScoutBook history',
        verified_by: auth.profileId,
        verified_at: new Date().toISOString(),
      })
      result.activitiesImported++
    }

    if (activities.serviceHours > 0) {
      await adminSupabase.from('scout_activity_entries').insert({
        scout_id: scoutId,
        activity_type: 'service',
        activity_date: today,
        value: activities.serviceHours,
        description: 'Imported from ScoutBook history',
        verified_by: auth.profileId,
        verified_at: new Date().toISOString(),
      })
      result.activitiesImported++
    }

    if (activities.hikingMiles > 0) {
      await adminSupabase.from('scout_activity_entries').insert({
        scout_id: scoutId,
        activity_type: 'hiking',
        activity_date: today,
        value: activities.hikingMiles,
        description: 'Imported from ScoutBook history',
        verified_by: auth.profileId,
        verified_at: new Date().toISOString(),
      })
      result.activitiesImported++
    }
  }

  revalidatePath(`/scouts/${scoutId}`)
  revalidatePath('/advancement')

  return { success: true, data: result }
}

/**
 * Find a scout by BSA ID or name
 */
export async function findScoutByBsaIdOrName(
  unitId: string,
  bsaId: string | null,
  firstName: string,
  lastName: string
): Promise<ActionResult<{ id: string; firstName: string; lastName: string; bsaId: string | null } | null>> {
  const auth = await verifyLeaderRole(unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  // Use admin client since we've already verified access
  const adminSupabase = createAdminClient()

  // Normalize the BSA ID (trim whitespace)
  const normalizedBsaId = bsaId?.trim() || null

  // First try to find by BSA ID (only active scouts)
  if (normalizedBsaId) {
    const { data: scoutByBsaId } = await adminSupabase
      .from('scouts')
      .select('id, first_name, last_name, bsa_member_id, is_active')
      .eq('unit_id', unitId)
      .neq('is_active', false)
      .eq('bsa_member_id', normalizedBsaId)
      .maybeSingle()

    if (scoutByBsaId) {
      return {
        success: true,
        data: {
          id: scoutByBsaId.id,
          firstName: scoutByBsaId.first_name,
          lastName: scoutByBsaId.last_name,
          bsaId: scoutByBsaId.bsa_member_id,
        },
      }
    }
  }

  // Fall back to name search (only active scouts)
  const { data: scoutsByName } = await adminSupabase
    .from('scouts')
    .select('id, first_name, last_name, bsa_member_id, is_active')
    .eq('unit_id', unitId)
    .neq('is_active', false)
    .ilike('first_name', firstName.trim())
    .ilike('last_name', lastName.trim())

  if (scoutsByName && scoutsByName.length === 1) {
    return {
      success: true,
      data: {
        id: scoutsByName[0].id,
        firstName: scoutsByName[0].first_name,
        lastName: scoutsByName[0].last_name,
        bsaId: scoutsByName[0].bsa_member_id,
      },
    }
  }

  return { success: true, data: null }
}

/**
 * Get scouts in the unit for selection
 */
export async function getUnitScoutsForImport(
  unitId: string
): Promise<ActionResult<Array<{ id: string; firstName: string; lastName: string; bsaId: string | null }>>> {
  const auth = await verifyLeaderRole(unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  // Use admin client since we've already verified access
  const adminSupabase = createAdminClient()

  const { data: scouts, error } = await adminSupabase
    .from('scouts')
    .select('id, first_name, last_name, bsa_member_id, is_active')
    .eq('unit_id', unitId)
    .order('last_name')
    .order('first_name')

  if (error) {
    console.error('Failed to fetch scouts:', error)
    return { success: false, error: `Failed to fetch scouts: ${error.message}` }
  }

  // Filter to active scouts only (is_active is boolean, default to true if null)
  const activeScouts = scouts?.filter(s => s.is_active !== false) || []

  return {
    success: true,
    data: activeScouts.map((s) => ({
      id: s.id,
      firstName: s.first_name,
      lastName: s.last_name,
      bsaId: s.bsa_member_id,
    })),
  }
}
