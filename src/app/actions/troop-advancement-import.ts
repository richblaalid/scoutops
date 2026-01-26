'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import {
  parseTroopAdvancementCSV,
  validateParsedData,
} from '@/lib/import/scoutbook-troop-advancement-parser'
import type {
  StagedTroopAdvancement,
  StagedScoutAdvancement,
  StagedChange,
  TroopAdvancementImportResult,
} from '@/lib/import/troop-advancement-types'

interface ActionResult<T = void> {
  success: boolean
  error?: string
  data?: T
}

// Merit badge name aliases for historical/renamed badges
// Maps normalized alternate names to normalized current names in the database
const MERIT_BADGE_ALIASES: Record<string, string> = {
  // Naming variations
  'fish_and_wildlife_management': 'fish_wildlife_management',
  // Renamed badges - BSA renamed "American Indian Lore" to "American Indian Culture" in 2024
  // Map both directions since DB may have either name depending on canonical data version
  'american_indian_lore': 'american_indian_culture',
  'american_indian_culture': 'american_indian_lore',
  'atomic_energy': 'nuclear_science',
  'consumer_buying': 'personal_management',
  'world_brotherhood': 'citizenship_in_the_world',
  'farm_arrangement': 'farm_mechanics',
  'pigeon_raising': 'bird_study',
  'rabbit_raising': 'animal_science',
  'nut_culture': 'plant_science',
  'bee_keeping': 'beekeeping',
  'life_saving': 'lifesaving',
  'first_aid_to_animals': 'veterinary_medicine',
  'signaling': 'signs_signals_codes',
  'machinery': 'farm_mechanics',
  'physical_development': 'personal_fitness',
  'safety': 'emergency_preparedness',
}

// Batch size for database operations
const BATCH_SIZE = 500

// ============================================
// Auth Helpers
// ============================================

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

// ============================================
// Staging Action
// ============================================

/**
 * Stage troop advancement data for import
 * Parses CSV, matches scouts, and identifies new vs duplicate records
 */
export async function stageTroopAdvancement(
  unitId: string,
  csvContent: string
): Promise<ActionResult<StagedTroopAdvancement>> {
  const auth = await verifyLeaderRole(unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()

  // Parse CSV
  const parsed = parseTroopAdvancementCSV(csvContent)
  const validationErrors = validateParsedData(parsed)

  if (validationErrors.length > 0 && parsed.scouts.size === 0) {
    return { success: false, error: validationErrors.join('; ') }
  }

  // Load all unit scouts
  const { data: unitScouts } = await adminSupabase
    .from('scouts')
    .select('id, first_name, last_name, bsa_member_id, is_active')
    .eq('unit_id', unitId)
    .neq('is_active', false)

  const scoutByBsaId = new Map(
    unitScouts?.filter((s) => s.bsa_member_id).map((s) => [s.bsa_member_id!, s]) || []
  )

  // Load rank reference data
  const { data: ranks } = await adminSupabase
    .from('bsa_ranks')
    .select('id, code, name, requirement_version_year')
    .order('display_order')

  const rankByCode = new Map(ranks?.map((r) => [r.code, r]) || [])

  // Load merit badge reference data (include inactive for historical imports)
  const { data: meritBadges } = await adminSupabase
    .from('bsa_merit_badges')
    .select('id, name, requirement_version_year')

  const badgeByNormalizedName = new Map(
    meritBadges?.map((mb) => [
      mb.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
      mb,
    ]) || []
  )

  // Helper to look up badge with alias fallback
  const findBadge = (normalizedName: string) => {
    // Try direct match first
    let badge = badgeByNormalizedName.get(normalizedName)
    if (badge) return badge

    // Try alias lookup
    const aliasedName = MERIT_BADGE_ALIASES[normalizedName]
    if (aliasedName) {
      badge = badgeByNormalizedName.get(aliasedName)
    }
    return badge
  }

  // Get all scout IDs that match
  const matchedScoutIds = Array.from(parsed.scouts.keys())
    .map((bsaId) => scoutByBsaId.get(bsaId)?.id)
    .filter(Boolean) as string[]

  // Bulk load existing progress for all matched scouts
  const [existingRankProgress, existingBadgeProgress] = await Promise.all([
    matchedScoutIds.length > 0
      ? adminSupabase
          .from('scout_rank_progress')
          .select('id, scout_id, rank_id, status, awarded_at')
          .in('scout_id', matchedScoutIds)
      : Promise.resolve({ data: [] }),
    matchedScoutIds.length > 0
      ? adminSupabase
          .from('scout_merit_badge_progress')
          .select('id, scout_id, merit_badge_id, status')
          .in('scout_id', matchedScoutIds)
      : Promise.resolve({ data: [] }),
  ])

  // Create lookup maps for existing progress
  const existingRankProgressMap = new Map(
    (existingRankProgress.data || []).map((p) => [`${p.scout_id}:${p.rank_id}`, p])
  )
  const existingBadgeProgressMap = new Map(
    (existingBadgeProgress.data || []).map((p) => [`${p.scout_id}:${p.merit_badge_id}`, p])
  )

  // Stage each scout
  const stagedScouts: StagedScoutAdvancement[] = []
  let totalNewRanks = 0
  let totalNewRankReqs = 0
  let totalNewBadges = 0
  let totalNewBadgeReqs = 0
  let totalDuplicates = 0
  let totalUpdates = 0
  let matchedScouts = 0
  let unmatchedScouts = 0
  const warnings: string[] = []

  for (const [bsaMemberId, scoutData] of parsed.scouts) {
    const dbScout = scoutByBsaId.get(bsaMemberId)
    const matchStatus = dbScout ? 'matched' : 'unmatched'

    if (dbScout) {
      matchedScouts++
    } else {
      unmatchedScouts++
    }

    const stagedRanks: StagedChange[] = []
    const stagedRankReqs: StagedChange[] = []
    const stagedBadges: StagedChange[] = []
    const stagedBadgeReqs: StagedChange[] = []

    // Stage ranks (using pre-loaded data)
    for (const rank of scoutData.ranks) {
      const dbRank = rankByCode.get(rank.rankCode)
      if (!dbRank) {
        warnings.push(`Unknown rank: ${rank.rankName}`)
        continue
      }

      let status: 'new' | 'duplicate' | 'update' = 'new'
      let existingId: string | undefined

      if (dbScout) {
        const existing = existingRankProgressMap.get(`${dbScout.id}:${dbRank.id}`)
        if (existing) {
          existingId = existing.id
          if (existing.status === 'awarded') {
            status = 'duplicate'
            totalDuplicates++
          } else {
            status = 'update'
            totalUpdates++
          }
        } else {
          totalNewRanks++
        }
      } else {
        totalNewRanks++
      }

      stagedRanks.push({
        type: 'rank',
        name: rank.rankName,
        code: rank.rankCode,
        version: rank.version,
        date: rank.awardedDate,
        status,
        existingId,
      })
    }

    // Stage rank requirements (simplified - no individual DB queries)
    for (const req of scoutData.rankRequirements) {
      const dbRank = rankByCode.get(req.rankCode)
      if (!dbRank) continue

      // Mark as new for staging (detailed duplicate check during import)
      totalNewRankReqs++

      stagedRankReqs.push({
        type: 'rank_requirement',
        name: `${req.rankCode} ${req.requirementNumber}`,
        code: req.rankCode,
        requirementNumber: req.requirementNumber,
        version: req.version,
        date: req.completedDate,
        status: 'new',
      })
    }

    // Stage merit badges (using pre-loaded data)
    for (const badge of scoutData.meritBadges) {
      const dbBadge = findBadge(badge.normalizedName)
      if (!dbBadge) {
        warnings.push(`Unknown merit badge: ${badge.badgeName}`)
        continue
      }

      let status: 'new' | 'duplicate' | 'update' = 'new'
      let existingId: string | undefined

      if (dbScout) {
        const existing = existingBadgeProgressMap.get(`${dbScout.id}:${dbBadge.id}`)
        if (existing) {
          existingId = existing.id
          if (existing.status === 'awarded') {
            status = 'duplicate'
            totalDuplicates++
          } else {
            status = 'update'
            totalUpdates++
          }
        } else {
          totalNewBadges++
        }
      } else {
        totalNewBadges++
      }

      stagedBadges.push({
        type: 'merit_badge',
        name: badge.badgeName,
        code: badge.normalizedName,
        version: badge.version,
        date: badge.awardedDate,
        status,
        existingId,
      })
    }

    // Stage merit badge requirements (simplified)
    for (const req of scoutData.meritBadgeRequirements) {
      const dbBadge = findBadge(req.normalizedName)
      if (!dbBadge) continue

      totalNewBadgeReqs++

      stagedBadgeReqs.push({
        type: 'merit_badge_requirement',
        name: `${req.badgeName} ${req.requirementNumber}`,
        code: req.normalizedName,
        requirementNumber: req.requirementNumber,
        version: req.version,
        date: req.completedDate,
        status: 'new',
      })
    }

    const newItems =
      stagedRanks.filter((r) => r.status === 'new').length +
      stagedRankReqs.filter((r) => r.status === 'new').length +
      stagedBadges.filter((r) => r.status === 'new').length +
      stagedBadgeReqs.filter((r) => r.status === 'new').length

    const duplicates =
      stagedRanks.filter((r) => r.status === 'duplicate').length +
      stagedRankReqs.filter((r) => r.status === 'duplicate').length +
      stagedBadges.filter((r) => r.status === 'duplicate').length +
      stagedBadgeReqs.filter((r) => r.status === 'duplicate').length

    const updates =
      stagedRanks.filter((r) => r.status === 'update').length +
      stagedRankReqs.filter((r) => r.status === 'update').length +
      stagedBadges.filter((r) => r.status === 'update').length +
      stagedBadgeReqs.filter((r) => r.status === 'update').length

    stagedScouts.push({
      bsaMemberId,
      firstName: scoutData.firstName,
      lastName: scoutData.lastName,
      fullName: `${scoutData.firstName} ${scoutData.lastName}`.trim(),
      scoutId: dbScout?.id || null,
      matchStatus,
      ranks: stagedRanks,
      rankRequirements: stagedRankReqs,
      meritBadges: stagedBadges,
      meritBadgeRequirements: stagedBadgeReqs,
      summary: {
        newItems,
        duplicates,
        updates,
      },
    })
  }

  // Sort scouts: matched first, then by name
  stagedScouts.sort((a, b) => {
    if (a.matchStatus !== b.matchStatus) {
      return a.matchStatus === 'matched' ? -1 : 1
    }
    return a.fullName.localeCompare(b.fullName)
  })

  const staged: StagedTroopAdvancement = {
    scouts: stagedScouts,
    summary: {
      totalScouts: stagedScouts.length,
      matchedScouts,
      unmatchedScouts,
      newRanks: totalNewRanks,
      newRankRequirements: totalNewRankReqs,
      newMeritBadges: totalNewBadges,
      newMeritBadgeRequirements: totalNewBadgeReqs,
      duplicates: totalDuplicates,
      updates: totalUpdates,
    },
    errors: validationErrors,
    warnings: [...new Set(warnings)], // Deduplicate warnings
  }

  return { success: true, data: staged }
}

// ============================================
// Optimized Import Action (Batch Operations)
// ============================================

/**
 * Import staged advancement data using batch operations
 */
export async function importStagedAdvancement(
  unitId: string,
  staged: StagedTroopAdvancement,
  selectedBsaMemberIds: string[],
  createUnmatchedScouts: boolean = true
): Promise<ActionResult<TroopAdvancementImportResult>> {
  const auth = await verifyLeaderRole(unitId)
  if ('error' in auth) return { success: false, error: auth.error }

  const adminSupabase = createAdminClient()

  // Load reference data
  const { data: ranks } = await adminSupabase
    .from('bsa_ranks')
    .select('id, code, name, requirement_version_year')
    .order('display_order')

  const rankByCode = new Map(ranks?.map((r) => [r.code, r]) || [])
  const rankById = new Map(ranks?.map((r) => [r.id, r]) || [])

  const { data: meritBadges } = await adminSupabase
    .from('bsa_merit_badges')
    .select('id, name, requirement_version_year')

  const badgeByNormalizedName = new Map(
    meritBadges?.map((mb) => [
      mb.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
      mb,
    ]) || []
  )
  const badgeById = new Map(meritBadges?.map((mb) => [mb.id, mb]) || [])

  // Helper to look up badge with alias fallback
  const findBadge = (normalizedName: string) => {
    let badge = badgeByNormalizedName.get(normalizedName)
    if (badge) return badge
    const aliasedName = MERIT_BADGE_ALIASES[normalizedName]
    if (aliasedName) {
      badge = badgeByNormalizedName.get(aliasedName)
    }
    return badge
  }

  // Load all rank requirements
  // NOTE: Must specify limit > 1000 as Supabase defaults to 1000 rows
  const { data: allRankRequirements } = await adminSupabase
    .from('bsa_rank_requirements')
    .select('id, rank_id, requirement_number, version_year')
    .limit(10000)

  const rankReqMap = new Map(
    (allRankRequirements || []).map((r) => [
      `${r.rank_id}:${r.requirement_number}:${r.version_year}`,
      r,
    ])
  )

  // Load all merit badge requirements
  // NOTE: Must specify limit > 1000 as Supabase defaults to 1000 rows
  // We have ~11,000+ requirements across all badges and versions
  const { data: allBadgeRequirements } = await adminSupabase
    .from('bsa_merit_badge_requirements')
    .select('id, merit_badge_id, requirement_number, version_year')
    .limit(50000)

  const badgeReqMap = new Map(
    (allBadgeRequirements || []).map((r) => [
      `${r.merit_badge_id}:${r.requirement_number}:${r.version_year}`,
      r,
    ])
  )

  const result: TroopAdvancementImportResult = {
    scoutsCreated: 0,
    ranksImported: 0,
    rankRequirementsImported: 0,
    badgesImported: 0,
    badgeRequirementsImported: 0,
    duplicatesSkipped: 0,
    warnings: [],
  }

  // Filter to selected scouts
  const selectedScouts = staged.scouts.filter((s) => selectedBsaMemberIds.includes(s.bsaMemberId))

  // Step 1: Create unmatched scouts in batch
  const scoutsToCreate = selectedScouts.filter(
    (s) => s.matchStatus === 'unmatched' && createUnmatchedScouts
  )

  const scoutIdByBsaMemberId = new Map<string, string>()

  // Populate with existing scout IDs
  for (const scout of selectedScouts) {
    if (scout.scoutId) {
      scoutIdByBsaMemberId.set(scout.bsaMemberId, scout.scoutId)
    }
  }

  if (scoutsToCreate.length > 0) {
    const scoutInserts = scoutsToCreate.map((s) => ({
      unit_id: unitId,
      first_name: s.firstName,
      last_name: s.lastName,
      bsa_member_id: s.bsaMemberId,
      is_active: true,
    }))

    const { data: newScouts, error: createError } = await adminSupabase
      .from('scouts')
      .insert(scoutInserts)
      .select('id, bsa_member_id')

    if (createError) {
      result.warnings.push({
        type: 'scout_not_found',
        message: `Failed to create scouts: ${createError.message}`,
      })
    } else if (newScouts) {
      result.scoutsCreated = newScouts.length
      for (const scout of newScouts) {
        if (scout.bsa_member_id) {
          scoutIdByBsaMemberId.set(scout.bsa_member_id, scout.id)
        }
      }
    }
  }

  // Get all scout IDs we're working with
  const allScoutIds = Array.from(scoutIdByBsaMemberId.values())

  // Step 2: Load all existing progress records for these scouts
  const [existingRankProgress, existingBadgeProgress] = await Promise.all([
    adminSupabase
      .from('scout_rank_progress')
      .select('id, scout_id, rank_id, status')
      .in('scout_id', allScoutIds),
    adminSupabase
      .from('scout_merit_badge_progress')
      .select('id, scout_id, merit_badge_id, status')
      .in('scout_id', allScoutIds),
  ])

  const existingRankProgressMap = new Map(
    (existingRankProgress.data || []).map((p) => [`${p.scout_id}:${p.rank_id}`, p])
  )
  const existingBadgeProgressMap = new Map(
    (existingBadgeProgress.data || []).map((p) => [`${p.scout_id}:${p.merit_badge_id}`, p])
  )

  // Step 3: Collect all rank progress records to insert/update
  type RankProgressStatus = 'not_started' | 'in_progress' | 'pending_approval' | 'approved' | 'completed' | 'awarded'
  const rankProgressToInsert: Array<{
    scout_id: string
    rank_id: string
    status: RankProgressStatus
    started_at: string
    awarded_at: string | null
  }> = []
  const rankProgressToUpdate: Array<{
    id: string
    status: RankProgressStatus
    awarded_at: string | null
  }> = []

  for (const scout of selectedScouts) {
    const scoutId = scoutIdByBsaMemberId.get(scout.bsaMemberId)
    if (!scoutId) continue

    for (const stagedRank of scout.ranks) {
      if (stagedRank.status === 'duplicate') {
        result.duplicatesSkipped++
        continue
      }

      const dbRank = rankByCode.get(stagedRank.code)
      if (!dbRank) continue

      const existing = existingRankProgressMap.get(`${scoutId}:${dbRank.id}`)

      if (existing) {
        if (existing.status !== 'awarded') {
          rankProgressToUpdate.push({
            id: existing.id,
            status: 'awarded',
            awarded_at: stagedRank.date || null,
          })
        } else {
          result.duplicatesSkipped++
        }
      } else {
        rankProgressToInsert.push({
          scout_id: scoutId,
          rank_id: dbRank.id,
          status: 'awarded',
          started_at: stagedRank.date || new Date().toISOString(),
          awarded_at: stagedRank.date || null,
        })
      }
    }
  }

  // Step 4: Collect all badge progress records to insert/update
  type BadgeProgressStatus = 'not_started' | 'in_progress' | 'pending_approval' | 'approved' | 'completed' | 'awarded'
  const badgeProgressToInsert: Array<{
    scout_id: string
    merit_badge_id: string
    status: BadgeProgressStatus
    started_at: string
    completed_at: string | null
    awarded_at: string | null
  }> = []
  const badgeProgressToUpdate: Array<{
    id: string
    status: BadgeProgressStatus
    completed_at: string | null
    awarded_at: string | null
  }> = []

  for (const scout of selectedScouts) {
    const scoutId = scoutIdByBsaMemberId.get(scout.bsaMemberId)
    if (!scoutId) continue

    for (const stagedBadge of scout.meritBadges) {
      if (stagedBadge.status === 'duplicate') {
        result.duplicatesSkipped++
        continue
      }

      const dbBadge = findBadge(stagedBadge.code)
      if (!dbBadge) continue

      const existing = existingBadgeProgressMap.get(`${scoutId}:${dbBadge.id}`)

      if (existing) {
        if (existing.status !== 'awarded') {
          badgeProgressToUpdate.push({
            id: existing.id,
            status: 'awarded',
            completed_at: stagedBadge.date || null,
            awarded_at: stagedBadge.date || null,
          })
        } else {
          result.duplicatesSkipped++
        }
      } else {
        badgeProgressToInsert.push({
          scout_id: scoutId,
          merit_badge_id: dbBadge.id,
          status: 'awarded',
          started_at: stagedBadge.date || new Date().toISOString(),
          completed_at: stagedBadge.date || null,
          awarded_at: stagedBadge.date || null,
        })
      }
    }
  }

  // Step 5: Execute batch inserts for rank and badge progress
  // Insert ranks in batches
  for (let i = 0; i < rankProgressToInsert.length; i += BATCH_SIZE) {
    const batch = rankProgressToInsert.slice(i, i + BATCH_SIZE)
    const { data, error } = await adminSupabase
      .from('scout_rank_progress')
      .insert(batch)
      .select('id, scout_id, rank_id')

    if (!error && data) {
      result.ranksImported += data.length
      // Update our map with newly created records
      for (const p of data) {
        existingRankProgressMap.set(`${p.scout_id}:${p.rank_id}`, { ...p, status: 'awarded' })
      }
    }
  }

  // Update ranks in batches
  for (const update of rankProgressToUpdate) {
    await adminSupabase
      .from('scout_rank_progress')
      .update({ status: update.status, awarded_at: update.awarded_at })
      .eq('id', update.id)
    result.ranksImported++
  }

  // Insert badges in batches
  for (let i = 0; i < badgeProgressToInsert.length; i += BATCH_SIZE) {
    const batch = badgeProgressToInsert.slice(i, i + BATCH_SIZE)
    const { data, error } = await adminSupabase
      .from('scout_merit_badge_progress')
      .insert(batch)
      .select('id, scout_id, merit_badge_id')

    if (!error && data) {
      result.badgesImported += data.length
      // Update our map with newly created records
      for (const p of data) {
        existingBadgeProgressMap.set(`${p.scout_id}:${p.merit_badge_id}`, { ...p, status: 'awarded' })
      }
    }
  }

  // Update badges in batches
  for (const update of badgeProgressToUpdate) {
    await adminSupabase
      .from('scout_merit_badge_progress')
      .update({
        status: update.status,
        completed_at: update.completed_at,
        awarded_at: update.awarded_at,
      })
      .eq('id', update.id)
    result.badgesImported++
  }

  // Step 6: Now process requirements (need progress IDs first)
  // Reload progress maps to get all IDs including newly created
  const [updatedRankProgress, updatedBadgeProgress] = await Promise.all([
    adminSupabase
      .from('scout_rank_progress')
      .select('id, scout_id, rank_id')
      .in('scout_id', allScoutIds),
    adminSupabase
      .from('scout_merit_badge_progress')
      .select('id, scout_id, merit_badge_id')
      .in('scout_id', allScoutIds),
  ])

  const rankProgressIdMap = new Map(
    (updatedRankProgress.data || []).map((p) => [`${p.scout_id}:${p.rank_id}`, p.id])
  )
  const badgeProgressIdMap = new Map(
    (updatedBadgeProgress.data || []).map((p) => [`${p.scout_id}:${p.merit_badge_id}`, p.id])
  )

  // Load existing requirement progress
  const rankProgressIds = Array.from(new Set(updatedRankProgress.data?.map((p) => p.id) || []))
  const badgeProgressIds = Array.from(new Set(updatedBadgeProgress.data?.map((p) => p.id) || []))

  const [existingRankReqProgress, existingBadgeReqProgress] = await Promise.all([
    rankProgressIds.length > 0
      ? adminSupabase
          .from('scout_rank_requirement_progress')
          .select('id, scout_rank_progress_id, requirement_id, status')
          .in('scout_rank_progress_id', rankProgressIds)
      : Promise.resolve({ data: [] }),
    badgeProgressIds.length > 0
      ? adminSupabase
          .from('scout_merit_badge_requirement_progress')
          .select('id, scout_merit_badge_progress_id, requirement_id, status')
          .in('scout_merit_badge_progress_id', badgeProgressIds)
      : Promise.resolve({ data: [] }),
  ])

  const existingRankReqMap = new Map(
    (existingRankReqProgress.data || []).map((p) => [
      `${p.scout_rank_progress_id}:${p.requirement_id}`,
      p,
    ])
  )
  const existingBadgeReqMap = new Map(
    (existingBadgeReqProgress.data || []).map((p) => [
      `${p.scout_merit_badge_progress_id}:${p.requirement_id}`,
      p,
    ])
  )

  // Step 7: Collect rank requirement progress to insert
  type ReqProgressStatus = 'not_started' | 'in_progress' | 'pending_approval' | 'approved' | 'completed' | 'awarded'
  const rankReqToInsert: Array<{
    scout_rank_progress_id: string
    requirement_id: string
    status: ReqProgressStatus
    completed_at: string | null
    completed_by: string
  }> = []

  for (const scout of selectedScouts) {
    const scoutId = scoutIdByBsaMemberId.get(scout.bsaMemberId)
    if (!scoutId) continue

    for (const stagedReq of scout.rankRequirements) {
      if (!stagedReq.requirementNumber) continue

      const dbRank = rankByCode.get(stagedReq.code)
      if (!dbRank) continue

      const progressId = rankProgressIdMap.get(`${scoutId}:${dbRank.id}`)
      if (!progressId) {
        // Need to create rank progress first
        const { data: newProgress } = await adminSupabase
          .from('scout_rank_progress')
          .insert({
            scout_id: scoutId,
            rank_id: dbRank.id,
            status: 'in_progress',
            started_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (newProgress) {
          rankProgressIdMap.set(`${scoutId}:${dbRank.id}`, newProgress.id)
        }
        continue
      }

      // Find requirement ID
      const versionYear = dbRank.requirement_version_year || parseInt(stagedReq.version, 10)
      const reqKey = `${dbRank.id}:${stagedReq.requirementNumber}:${versionYear}`
      const requirement = rankReqMap.get(reqKey)

      if (!requirement) {
        // Try without specific version
        let found = false
        for (const [key, req] of rankReqMap) {
          if (key.startsWith(`${dbRank.id}:${stagedReq.requirementNumber}:`)) {
            const existing = existingRankReqMap.get(`${progressId}:${req.id}`)
            if (!existing || !['completed', 'approved', 'awarded'].includes(existing.status)) {
              rankReqToInsert.push({
                scout_rank_progress_id: progressId,
                requirement_id: req.id,
                status: 'completed',
                completed_at: stagedReq.date || null,
                completed_by: auth.profileId,
              })
              found = true
              break
            }
          }
        }
        if (!found) {
          result.warnings.push({
            type: 'requirement_not_found',
            rank: dbRank.name,
            requirement: stagedReq.requirementNumber,
            message: `Rank requirement not found: ${dbRank.name} ${stagedReq.requirementNumber}`,
          })
        }
        continue
      }

      const existing = existingRankReqMap.get(`${progressId}:${requirement.id}`)
      if (existing && ['completed', 'approved', 'awarded'].includes(existing.status)) {
        result.duplicatesSkipped++
        continue
      }

      rankReqToInsert.push({
        scout_rank_progress_id: progressId,
        requirement_id: requirement.id,
        status: 'completed',
        completed_at: stagedReq.date || null,
        completed_by: auth.profileId,
      })
    }
  }

  // Step 8: Collect badge requirement progress to insert
  const badgeReqToInsert: Array<{
    scout_merit_badge_progress_id: string
    requirement_id: string
    status: ReqProgressStatus
    completed_at: string | null
    completed_by: string
  }> = []

  for (const scout of selectedScouts) {
    const scoutId = scoutIdByBsaMemberId.get(scout.bsaMemberId)
    if (!scoutId) continue

    for (const stagedReq of scout.meritBadgeRequirements) {
      if (!stagedReq.requirementNumber) continue

      const dbBadge = findBadge(stagedReq.code)
      if (!dbBadge) continue

      let progressId = badgeProgressIdMap.get(`${scoutId}:${dbBadge.id}`)
      if (!progressId) {
        // Need to create badge progress first
        const { data: newProgress } = await adminSupabase
          .from('scout_merit_badge_progress')
          .insert({
            scout_id: scoutId,
            merit_badge_id: dbBadge.id,
            status: 'in_progress',
            started_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (newProgress) {
          progressId = newProgress.id
          badgeProgressIdMap.set(`${scoutId}:${dbBadge.id}`, progressId)
        } else {
          continue
        }
      }

      // Find requirement ID (try multiple versions)
      const versionYears = [
        parseInt(stagedReq.version, 10),
        dbBadge.requirement_version_year,
      ].filter((v) => v && !isNaN(v))

      let requirement = null
      for (const versionYear of versionYears) {
        const reqKey = `${dbBadge.id}:${stagedReq.requirementNumber}:${versionYear}`
        requirement = badgeReqMap.get(reqKey)
        if (requirement) break
      }

      if (!requirement) {
        // Try to find any matching requirement for this badge
        for (const [key, req] of badgeReqMap) {
          if (key.startsWith(`${dbBadge.id}:${stagedReq.requirementNumber}:`)) {
            requirement = req
            break
          }
        }
      }

      if (!requirement) {
        result.warnings.push({
          type: 'requirement_not_found',
          badge: dbBadge.name,
          requirement: stagedReq.requirementNumber,
          message: `Merit badge requirement not found: ${dbBadge.name} ${stagedReq.requirementNumber}`,
        })
        continue
      }

      const existing = existingBadgeReqMap.get(`${progressId}:${requirement.id}`)
      if (existing && ['completed', 'approved', 'awarded'].includes(existing.status)) {
        result.duplicatesSkipped++
        continue
      }

      badgeReqToInsert.push({
        scout_merit_badge_progress_id: progressId,
        requirement_id: requirement.id,
        status: 'completed',
        completed_at: stagedReq.date || null,
        completed_by: auth.profileId,
      })
    }
  }

  // Step 9: Batch insert requirement progress
  // Use upsert pattern with conflict handling
  for (let i = 0; i < rankReqToInsert.length; i += BATCH_SIZE) {
    const batch = rankReqToInsert.slice(i, i + BATCH_SIZE)
    const { error } = await adminSupabase.from('scout_rank_requirement_progress').upsert(batch, {
      onConflict: 'scout_rank_progress_id,requirement_id',
      ignoreDuplicates: true,
    })

    if (!error) {
      result.rankRequirementsImported += batch.length
    }
  }

  for (let i = 0; i < badgeReqToInsert.length; i += BATCH_SIZE) {
    const batch = badgeReqToInsert.slice(i, i + BATCH_SIZE)
    const { error } = await adminSupabase
      .from('scout_merit_badge_requirement_progress')
      .upsert(batch, {
        onConflict: 'scout_merit_badge_progress_id,requirement_id',
        ignoreDuplicates: true,
      })

    if (!error) {
      result.badgeRequirementsImported += batch.length
    }
  }

  // Revalidate relevant pages
  revalidatePath('/advancement')
  revalidatePath('/roster')

  return { success: true, data: result }
}
