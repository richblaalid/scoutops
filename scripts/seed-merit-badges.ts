/**
 * Seed Merit Badges Database (v2 - Complex Requirements Support)
 *
 * Populates the database with merit badge data from the source file:
 * - bsa_requirement_versions (2026 version)
 * - bsa_merit_badges (141 badges)
 * - bsa_merit_badge_requirements (all requirements with alternatives support)
 *
 * Run with: npx tsx scripts/seed-merit-badges.ts
 *
 * Features:
 * - Two-pass insertion for proper parent-child relationships
 * - Detects OR/alternative requirements from text
 * - Handles duplicate IDs by creating unique alternatives_group
 * - Calculates nesting depth
 * - Preserves original Scoutbook IDs for import matching
 *
 * Prerequisites:
 * - Supabase migrations must be applied (including alternatives columns)
 * - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface Requirement {
  id: string
  text: string
  subrequirements?: Requirement[]
}

interface MeritBadge {
  code: string
  name: string
  slug: string
  category: string
  is_eagle_required: boolean
  eagle_required_note: string | null
  image_path: string
  pamphlet_url: string | null
  scouting_org_url: string
  requirements: Requirement[]
  scraped_at: string
}

interface SourceData {
  version: string
  generated_at: string
  source: string
  total_badges: number
  eagle_required_count: number
  categories: string[]
  merit_badges: MeritBadge[]
}

// Intermediate structure for two-pass insertion
interface FlatRequirement {
  tempId: string // Temporary unique ID for linking
  parentTempId: string | null
  badgeId: string
  versionId: string
  requirementNumber: string
  subRequirementLetter: string | null
  description: string
  displayOrder: number
  isAlternative: boolean
  alternativesGroup: string | null
  nestingDepth: number
  originalScoutbookId: string
  requiredCount: number | null
}

/**
 * Detect if a requirement text indicates children are alternatives (OR options)
 */
function detectAlternatives(text: string): { isAlternativeParent: boolean; requiredCount: number | null } {
  const lowerText = text.toLowerCase()

  // "Do ONE of the following"
  if (/do\s+one\s+of\s+the\s+following/i.test(text)) {
    return { isAlternativeParent: true, requiredCount: 1 }
  }

  // "Do TWO of the following"
  if (/do\s+two\s+of\s+the\s+following/i.test(text)) {
    return { isAlternativeParent: true, requiredCount: 2 }
  }

  // "Do THREE of the following"
  if (/do\s+three\s+of\s+the\s+following/i.test(text)) {
    return { isAlternativeParent: true, requiredCount: 3 }
  }

  // "Choose ONE" or "complete ONE"
  if (/choose\s+one/i.test(text) || /complete\s+one\s+of/i.test(text)) {
    return { isAlternativeParent: true, requiredCount: 1 }
  }

  // "Choose TWO" or "complete TWO"
  if (/choose\s+two/i.test(text) || /complete\s+two\s+of/i.test(text)) {
    return { isAlternativeParent: true, requiredCount: 2 }
  }

  // Check for explicit options like "Option A" or "Option B" in text
  if (/option\s+[a-z]/i.test(text) && lowerText.includes(' or ')) {
    return { isAlternativeParent: true, requiredCount: 1 }
  }

  return { isAlternativeParent: false, requiredCount: null }
}

/**
 * Flatten the requirement tree into a list with parent references
 */
function flattenRequirements(
  requirements: Requirement[],
  badgeId: string,
  versionId: string,
  parentTempId: string | null,
  depth: number,
  idCounter: { value: number },
  seenIds: Map<string, number>, // Track occurrences of each ID
  parentAlternativesGroup: string | null,
  isChildOfAlternativeParent: boolean
): FlatRequirement[] {
  const result: FlatRequirement[] = []

  for (const req of requirements) {
    // Parse requirement ID (e.g., "1", "1a", "1a1", "7b8")
    const match = req.id.match(/^(\d+)([a-z])?(\d+)?$/i)

    let reqNumber: string
    let subLetter: string | null = null

    if (match) {
      reqNumber = match[1]
      if (match[2]) {
        subLetter = match[2].toLowerCase()
        if (match[3]) {
          // Deep sub-requirement like 7b8 - combine letter and number
          subLetter = match[2].toLowerCase() + match[3]
        }
      }
    } else {
      // Fallback: use the whole ID as requirement number
      reqNumber = req.id
    }

    // Track duplicate IDs
    const baseId = subLetter ? `${reqNumber}${subLetter}` : reqNumber
    const occurrenceCount = (seenIds.get(baseId) || 0) + 1
    seenIds.set(baseId, occurrenceCount)

    // Generate unique tempId
    const tempId = `${badgeId}_${baseId}_${occurrenceCount}`

    // Determine alternatives_group for duplicates
    let alternativesGroup: string | null = parentAlternativesGroup
    if (occurrenceCount > 1 || isChildOfAlternativeParent) {
      // This is a duplicate ID or child of alternative parent
      // Create a group name based on the parent and option letter
      alternativesGroup = parentAlternativesGroup || `${reqNumber}_opt${String.fromCharCode(64 + occurrenceCount)}`
    }

    // Detect if this requirement's children are alternatives
    const { isAlternativeParent, requiredCount } = detectAlternatives(req.text)

    // Create flat requirement
    const flatReq: FlatRequirement = {
      tempId,
      parentTempId,
      badgeId,
      versionId,
      requirementNumber: reqNumber,
      subRequirementLetter: subLetter,
      description: req.text,
      displayOrder: ++idCounter.value,
      isAlternative: isChildOfAlternativeParent,
      alternativesGroup,
      nestingDepth: depth,
      originalScoutbookId: req.id,
      requiredCount,
    }

    result.push(flatReq)

    // Process children recursively
    if (req.subrequirements && req.subrequirements.length > 0) {
      const childrenGroup = isAlternativeParent ? `${reqNumber}_alternatives` : alternativesGroup
      const children = flattenRequirements(
        req.subrequirements,
        badgeId,
        versionId,
        tempId,
        depth + 1,
        idCounter,
        seenIds,
        childrenGroup,
        isAlternativeParent
      )
      result.push(...children)
    }
  }

  return result
}

async function main() {
  console.log('Loading merit badge source data...')
  const sourcePath = path.join(__dirname, '../data/merit-badges-source.json')
  const sourceData: SourceData = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'))
  console.log(`Loaded ${sourceData.total_badges} badges`)

  // Step 1: Create or get 2026 requirement version
  console.log('\n1. Creating 2026 requirement version...')
  const { data: existingVersion } = await supabase
    .from('bsa_requirement_versions')
    .select('id')
    .eq('version_year', 2026)
    .single()

  let versionId: string
  if (existingVersion) {
    versionId = existingVersion.id
    console.log('   Using existing 2026 version:', versionId)
  } else {
    const { data: newVersion, error: versionError } = await supabase
      .from('bsa_requirement_versions')
      .insert({
        version_year: 2026,
        effective_date: '2026-01-01',
        is_active: true,
        notes: 'BSA 2026 Requirements - scraped from scouting.org',
      })
      .select('id')
      .single()

    if (versionError) {
      console.error('Error creating version:', versionError)
      process.exit(1)
    }
    versionId = newVersion.id
    console.log('   Created new 2026 version:', versionId)
  }

  // Step 2: Insert merit badges
  console.log('\n2. Inserting merit badges...')
  let badgesInserted = 0
  let badgesUpdated = 0

  const badgeIdMap = new Map<string, string>()

  for (const badge of sourceData.merit_badges) {
    const badgeData = {
      code: badge.code,
      name: badge.name,
      is_eagle_required: badge.is_eagle_required,
      category: badge.category,
      description: `Learn about ${badge.name.toLowerCase()} through hands-on activities and skill development.`,
      image_url: badge.image_path,
      pamphlet_url: badge.pamphlet_url,
      is_active: true,
    }

    // Try to upsert
    const { data: existingBadge } = await supabase
      .from('bsa_merit_badges')
      .select('id')
      .eq('code', badge.code)
      .single()

    if (existingBadge) {
      const { error: updateError } = await supabase
        .from('bsa_merit_badges')
        .update(badgeData)
        .eq('id', existingBadge.id)

      if (updateError) {
        console.error(`   Error updating ${badge.name}:`, updateError)
      } else {
        badgeIdMap.set(badge.code, existingBadge.id)
        badgesUpdated++
      }
    } else {
      const { data: newBadge, error: insertError } = await supabase
        .from('bsa_merit_badges')
        .insert(badgeData)
        .select('id')
        .single()

      if (insertError) {
        console.error(`   Error inserting ${badge.name}:`, insertError)
      } else {
        badgeIdMap.set(badge.code, newBadge.id)
        badgesInserted++
      }
    }
  }

  console.log(`   Inserted: ${badgesInserted}, Updated: ${badgesUpdated}`)

  // Step 3: Insert requirements (two-pass approach)
  console.log('\n3. Inserting requirements (two-pass approach)...')
  let requirementsInserted = 0
  let requirementsFailed = 0
  let parentLinksUpdated = 0

  for (const badge of sourceData.merit_badges) {
    const badgeId = badgeIdMap.get(badge.code)
    if (!badgeId) {
      console.error(`   No badge ID for ${badge.name}`)
      continue
    }

    // First, get all requirement IDs for this badge/version
    const { data: existingReqs } = await supabase
      .from('bsa_merit_badge_requirements')
      .select('id')
      .eq('version_id', versionId)
      .eq('merit_badge_id', badgeId)

    if (existingReqs && existingReqs.length > 0) {
      // Delete any progress data that references these requirements
      const reqIds = existingReqs.map(r => r.id)
      const { error: progressDeleteError } = await supabase
        .from('scout_merit_badge_requirement_progress')
        .delete()
        .in('requirement_id', reqIds)

      if (progressDeleteError) {
        console.error(`   Error deleting progress for ${badge.name}:`, progressDeleteError.message)
      }

      // Now delete existing requirements for this badge/version
      const { error: deleteError } = await supabase
        .from('bsa_merit_badge_requirements')
        .delete()
        .eq('version_id', versionId)
        .eq('merit_badge_id', badgeId)

      if (deleteError) {
        console.error(`   Error deleting old requirements for ${badge.name}:`, deleteError.message)
      }
    }

    // Flatten requirements tree
    const idCounter = { value: 0 }
    const seenIds = new Map<string, number>()
    const flatReqs = flattenRequirements(
      badge.requirements,
      badgeId,
      versionId,
      null,
      1,
      idCounter,
      seenIds,
      null,
      false
    )

    // Pass 1: Insert all requirements without parent IDs using raw SQL
    // This bypasses PostgREST schema cache issues
    const tempIdToDbId = new Map<string, string>()

    for (const req of flatReqs) {
      // Use raw SQL to insert, bypassing schema cache
      const { data: newReq, error: insertError } = await supabase.rpc('insert_merit_badge_requirement', {
        p_version_id: req.versionId,
        p_merit_badge_id: req.badgeId,
        p_requirement_number: req.requirementNumber,
        p_sub_requirement_letter: req.subRequirementLetter,
        p_description: req.description,
        p_display_order: req.displayOrder,
        p_is_alternative: req.isAlternative,
        p_alternatives_group: req.alternativesGroup,
        p_nesting_depth: req.nestingDepth,
        p_original_scoutbook_id: req.originalScoutbookId,
        p_required_count: req.requiredCount,
      })

      if (insertError) {
        console.error(`   Error inserting req ${req.originalScoutbookId} for ${badge.name}:`, insertError.message)
        requirementsFailed++
      } else {
        tempIdToDbId.set(req.tempId, newReq)
        requirementsInserted++
      }
    }

    // Pass 2: Update parent IDs using raw SQL
    for (const req of flatReqs) {
      if (req.parentTempId) {
        const dbId = tempIdToDbId.get(req.tempId)
        const parentDbId = tempIdToDbId.get(req.parentTempId)

        if (dbId && parentDbId) {
          const { error: updateError } = await supabase.rpc('update_requirement_parent', {
            p_id: dbId,
            p_parent_id: parentDbId,
          })

          if (updateError) {
            console.error(`   Error updating parent for ${req.originalScoutbookId}:`, updateError.message)
          } else {
            parentLinksUpdated++
          }
        }
      }
    }
  }

  console.log(`   Inserted: ${requirementsInserted}, Failed: ${requirementsFailed}`)
  console.log(`   Parent links updated: ${parentLinksUpdated}`)

  // Summary
  console.log('\n=== Seeding Complete ===')
  console.log(`Version: 2026 (${versionId})`)
  console.log(`Badges: ${badgesInserted} inserted, ${badgesUpdated} updated`)
  console.log(`Requirements: ${requirementsInserted} inserted (${requirementsFailed} failed)`)
  console.log(`Parent links: ${parentLinksUpdated} updated`)
}

main().catch(console.error)
