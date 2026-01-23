#!/usr/bin/env npx tsx

/**
 * BSA Reference Data Management CLI
 *
 * This script manages BSA official requirements data in the database.
 * Reference data is platform-level (not unit-specific) and versioned per-item.
 *
 * Configuration is centralized in seed-config.ts.
 *
 * Usage:
 *   npx tsx scripts/bsa-reference-data.ts import-all       # Import all data
 *   npx tsx scripts/bsa-reference-data.ts import-ranks     # Import rank requirements only
 *   npx tsx scripts/bsa-reference-data.ts import-badges    # Import merit badges only
 *   npx tsx scripts/bsa-reference-data.ts import-positions # Import leadership positions only
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'
import { BSA_SEED_CONFIG } from './seed-config'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  console.error('Make sure .env.local is configured correctly')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const { versionYear, files, batchSize } = BSA_SEED_CONFIG

// Helper to read JSON files
function readJsonFile<T>(filename: string): T {
  const filepath = path.join(process.cwd(), 'data', filename)
  if (!fs.existsSync(filepath)) {
    throw new Error(`File not found: ${filepath}`)
  }
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'))
}

// Helper to chunk arrays for batch operations
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

// Types for JSON files
interface RankRequirement {
  number: string
  description: string
  sub_requirements?: { letter: string; description: string }[]
  note?: string
}

interface RankData {
  code: string
  name: string
  display_order: number
  is_eagle_required: boolean
  requirement_version_year?: number
  description: string
  requirements: RankRequirement[]
}

interface RanksFile {
  version_year: number
  effective_date: string
  ranks: RankData[]
}

// Source-v2 format types (hierarchical structure)
interface MeritBadgeRequirementV2 {
  id: string
  text: string
  subrequirements?: MeritBadgeRequirementV2[]
  isAlternative?: boolean
  alternativesGroup?: string
  requiredCount?: number
}

interface MeritBadgeDataV2 {
  code: string
  name: string
  slug?: string
  category: string
  is_eagle_required: boolean
  eagle_required_note?: string
  image_path?: string
  pamphlet_url?: string
  scouting_org_url?: string
  requirements?: MeritBadgeRequirementV2[]
  scraped_at?: string
}

interface MeritBadgesFileV2 {
  version?: string // e.g., "2026.01"
  version_year?: number // fallback for older format
  generated_at?: string
  source?: string
  total_badges?: number
  eagle_required_count?: number
  categories?: string[]
  merit_badges: MeritBadgeDataV2[]
}

// Flattened requirement for database insertion
interface FlattenedRequirement {
  requirement_number: string
  description: string
  display_order: number
  parent_requirement_id?: string
  is_alternative?: boolean
  alternatives_group?: string
  required_count?: number
  nesting_depth: number
}

interface LeadershipPosition {
  code: string
  name: string
  qualifies_for_star: boolean
  qualifies_for_life: boolean
  qualifies_for_eagle: boolean
  min_tenure_months: number
  is_patrol_level: boolean
  is_troop_level: boolean
  description: string
}

interface LeadershipFile {
  positions: LeadershipPosition[]
}

// Types for scraped merit badge requirements (from Scoutbook scraper)
interface ScrapedRequirement {
  number: string
  description: string
  parentNumber: string | null
  depth: number
}

interface ScrapedBadgeVersion {
  badgeName: string
  badgeSlug: string
  versionYear: number
  versionLabel: string
  requirements: ScrapedRequirement[]
}

interface ScrapedDataFile {
  totalBadges: number
  completedBadges: number
  currentBadge: string
  badges: ScrapedBadgeVersion[]
}

/**
 * Import ranks with bulk inserts
 */
async function importRanks(filename?: string) {
  const file = filename || files.ranks
  console.log('\n=== Importing Ranks ===')
  console.log(`  File: ${file}`)
  console.log(`  Version year: ${versionYear}`)

  const data = readJsonFile<RanksFile>(file)

  // Step 1: Bulk upsert all ranks
  const rankRecords = data.ranks.map(rank => ({
    code: rank.code,
    name: rank.name,
    display_order: rank.display_order,
    is_eagle_required: rank.is_eagle_required,
    description: rank.description,
    requirement_version_year: rank.requirement_version_year ?? versionYear,
  }))

  const { error: rankError } = await supabase
    .from('bsa_ranks')
    .upsert(rankRecords, { onConflict: 'code' })

  if (rankError) {
    console.error('Error upserting ranks:', rankError)
    return
  }
  console.log(`  Upserted ${rankRecords.length} ranks`)

  // Step 2: Get rank IDs by code
  const { data: ranks, error: fetchError } = await supabase
    .from('bsa_ranks')
    .select('id, code')
    .in('code', data.ranks.map(r => r.code))

  if (fetchError || !ranks) {
    console.error('Error fetching rank IDs:', fetchError)
    return
  }

  const rankIdMap = new Map(ranks.map(r => [r.code, r.id]))

  // Step 3: Delete existing requirements for these ranks
  // Delete by rank_id and each rank's specific version_year
  const rankIds = ranks.map(r => r.id)
  for (const rank of data.ranks) {
    const rankId = rankIdMap.get(rank.code)
    if (!rankId) continue
    const reqVersionYear = rank.requirement_version_year ?? versionYear
    await supabase
      .from('bsa_rank_requirements')
      .delete()
      .eq('rank_id', rankId)
      .eq('version_year', reqVersionYear)
  }

  // Step 4: Build parent requirements array (no sub_requirement_letter)
  // Requirements use the same version_year as their parent rank's requirement_version_year
  const parentRequirements: {
    version_year: number
    rank_id: string
    requirement_number: string
    description: string
    display_order: number
    rank_code: string // for tracking
  }[] = []

  let globalDisplayOrder = 1
  for (const rank of data.ranks) {
    const rankId = rankIdMap.get(rank.code)
    if (!rankId) continue

    // Use the rank's requirement_version_year for its requirements
    const reqVersionYear = rank.requirement_version_year ?? versionYear

    for (const req of rank.requirements) {
      parentRequirements.push({
        version_year: reqVersionYear,
        rank_id: rankId,
        requirement_number: req.number,
        description: req.description,
        display_order: globalDisplayOrder++,
        rank_code: rank.code,
      })
    }
  }

  // Step 5: Bulk insert parent requirements
  const parentInsertData = parentRequirements.map(({ rank_code, ...rest }) => rest)

  for (const batch of chunk(parentInsertData, batchSize)) {
    const { error } = await supabase.from('bsa_rank_requirements').insert(batch)
    if (error) {
      console.error('Error inserting rank requirements batch:', error)
    }
  }
  console.log(`  Inserted ${parentInsertData.length} parent requirements`)

  // Step 6: Get parent requirement IDs for sub-requirements
  // Query without version_year filter since we just inserted these with varying years
  const { data: insertedReqs } = await supabase
    .from('bsa_rank_requirements')
    .select('id, rank_id, requirement_number')
    .in('rank_id', rankIds)
    .is('parent_requirement_id', null)

  if (!insertedReqs) return

  // Create lookup: rankId + reqNumber -> parentId
  const parentIdMap = new Map(
    insertedReqs.map(r => [`${r.rank_id}:${r.requirement_number}`, r.id])
  )

  // Step 7: Build and insert sub-requirements
  // Sub-requirements use the same version_year as their parent rank
  const subRequirements: {
    version_year: number
    rank_id: string
    requirement_number: string
    parent_requirement_id: string
    sub_requirement_letter: string
    description: string
    display_order: number
  }[] = []

  globalDisplayOrder = parentInsertData.length + 1
  for (const rank of data.ranks) {
    const rankId = rankIdMap.get(rank.code)
    if (!rankId) continue

    const reqVersionYear = rank.requirement_version_year ?? versionYear

    for (const req of rank.requirements) {
      if (!req.sub_requirements) continue

      const parentId = parentIdMap.get(`${rankId}:${req.number}`)
      if (!parentId) continue

      for (const subReq of req.sub_requirements) {
        subRequirements.push({
          version_year: reqVersionYear,
          rank_id: rankId,
          requirement_number: req.number,
          parent_requirement_id: parentId,
          sub_requirement_letter: subReq.letter,
          description: subReq.description,
          display_order: globalDisplayOrder++,
        })
      }
    }
  }

  if (subRequirements.length > 0) {
    for (const batch of chunk(subRequirements, batchSize)) {
      const { error } = await supabase.from('bsa_rank_requirements').insert(batch)
      if (error) {
        console.error('Error inserting sub-requirements batch:', error)
      }
    }
    console.log(`  Inserted ${subRequirements.length} sub-requirements`)
  }

  console.log('\n=== Ranks Import Complete ===')
}

/**
 * Flatten hierarchical requirements into a flat list for database insertion.
 * Handles nested subrequirements and Option A/B structures.
 */
function flattenRequirements(
  requirements: MeritBadgeRequirementV2[],
  parentId?: string,
  depth: number = 0
): FlattenedRequirement[] {
  const flattened: FlattenedRequirement[] = []
  let displayOrder = 1

  function processRequirement(
    req: MeritBadgeRequirementV2,
    parentReqNumber?: string,
    currentDepth: number = 0
  ) {
    flattened.push({
      requirement_number: req.id,
      description: req.text,
      display_order: displayOrder++,
      parent_requirement_id: parentReqNumber,
      is_alternative: req.isAlternative,
      alternatives_group: req.alternativesGroup,
      required_count: req.requiredCount,
      nesting_depth: currentDepth,
    })

    // Process subrequirements recursively
    if (req.subrequirements) {
      for (const subReq of req.subrequirements) {
        processRequirement(subReq, req.id, currentDepth + 1)
      }
    }
  }

  for (const req of requirements) {
    processRequirement(req, parentId, depth)
  }

  return flattened
}

/**
 * Import merit badges with bulk inserts (supports source-v2 format)
 * Handles multi-level nesting by processing level by level.
 */
async function importMeritBadges(filename?: string) {
  const file = filename || files.meritBadges
  console.log('\n=== Importing Merit Badges ===')
  console.log(`  File: ${file}`)

  const data = readJsonFile<MeritBadgesFileV2>(file)

  // Parse version year from file (handles "2026.01" or version_year: 2026)
  let badgeVersionYear: number
  if (data.version) {
    badgeVersionYear = parseInt(data.version.split('.')[0], 10)
  } else if (data.version_year) {
    badgeVersionYear = data.version_year
  } else {
    badgeVersionYear = versionYear
  }
  console.log(`  Version year: ${badgeVersionYear}`)
  console.log(`  Total badges in file: ${data.merit_badges.length}`)

  // Step 1: Bulk upsert all merit badges
  const badgeRecords = data.merit_badges.map(badge => ({
    code: badge.code,
    name: badge.name,
    is_eagle_required: badge.is_eagle_required,
    category: badge.category,
    description: badge.eagle_required_note
      ? `Eagle Required (${badge.eagle_required_note})`
      : (badge.is_eagle_required ? 'Eagle Required' : null),
    image_url: badge.image_path || null,
    pamphlet_url: badge.pamphlet_url || null,
    requirement_version_year: badgeVersionYear,
    is_active: true,
  }))

  for (const batch of chunk(badgeRecords, batchSize)) {
    const { error } = await supabase
      .from('bsa_merit_badges')
      .upsert(batch, { onConflict: 'code' })

    if (error) {
      console.error('Error upserting merit badges batch:', error)
    }
  }
  console.log(`  Upserted ${badgeRecords.length} merit badges`)

  // Step 2: Get badge IDs by code
  const { data: badges, error: fetchError } = await supabase
    .from('bsa_merit_badges')
    .select('id, code')
    .in('code', data.merit_badges.map(b => b.code))

  if (fetchError || !badges) {
    console.error('Error fetching badge IDs:', fetchError)
    return
  }

  const badgeIdMap = new Map(badges.map(b => [b.code, b.id]))

  // Step 3: Delete existing requirements for this version year
  const badgeIds = badges.map(b => b.id)
  await supabase
    .from('bsa_merit_badge_requirements')
    .delete()
    .in('merit_badge_id', badgeIds)
    .eq('version_year', badgeVersionYear)

  // Step 4: Flatten all requirements and group by nesting level
  // We need to process level by level so parent IDs are available for children
  type RequirementWithBadge = FlattenedRequirement & { badge_id: string }
  const requirementsByLevel = new Map<number, RequirementWithBadge[]>()
  let maxLevel = 0

  for (const badge of data.merit_badges) {
    const badgeId = badgeIdMap.get(badge.code)
    if (!badgeId || !badge.requirements) continue

    const flattened = flattenRequirements(badge.requirements)
    for (const req of flattened) {
      const level = req.nesting_depth
      maxLevel = Math.max(maxLevel, level)

      if (!requirementsByLevel.has(level)) {
        requirementsByLevel.set(level, [])
      }
      requirementsByLevel.get(level)!.push({ ...req, badge_id: badgeId })
    }
  }

  console.log(`  Max nesting depth: ${maxLevel}`)

  // Step 5: Process level by level, building parent lookup as we go
  // Map: badgeId + requirementNumber -> database ID
  const reqDbIdMap = new Map<string, string>()
  let totalInserted = 0
  let globalDisplayOrder = 1

  for (let level = 0; level <= maxLevel; level++) {
    const levelReqs = requirementsByLevel.get(level) || []
    if (levelReqs.length === 0) continue

    const insertRecords: {
      version_year: number
      merit_badge_id: string
      requirement_number: string
      description: string
      display_order: number
      parent_requirement_id: string | null
      is_alternative: boolean | null
      alternatives_group: string | null
      required_count: number | null
      nesting_depth: number
    }[] = []

    for (const req of levelReqs) {
      // Look up parent's database ID if this has a parent
      let parentDbId: string | null = null
      if (req.parent_requirement_id) {
        parentDbId = reqDbIdMap.get(`${req.badge_id}:${req.parent_requirement_id}`) || null
        if (!parentDbId) {
          // This shouldn't happen if we process level by level, but log if it does
          console.warn(`  Warning: Parent ${req.parent_requirement_id} not found for ${req.requirement_number}`)
          continue
        }
      }

      insertRecords.push({
        version_year: badgeVersionYear,
        merit_badge_id: req.badge_id,
        requirement_number: req.requirement_number,
        description: req.description,
        display_order: globalDisplayOrder++,
        parent_requirement_id: parentDbId,
        is_alternative: req.is_alternative ?? null,
        alternatives_group: req.alternatives_group ?? null,
        required_count: req.required_count ?? null,
        nesting_depth: req.nesting_depth,
      })
    }

    // Insert this level
    for (const batch of chunk(insertRecords, batchSize)) {
      const { error } = await supabase.from('bsa_merit_badge_requirements').insert(batch)
      if (error) {
        console.error(`Error inserting level ${level} requirements:`, error)
      }
    }

    // Fetch inserted records to get their database IDs
    // Use pagination to handle more than 1000 rows (Supabase default limit)
    let offset = 0
    const pageSize = 1000
    while (true) {
      const { data: inserted } = await supabase
        .from('bsa_merit_badge_requirements')
        .select('id, merit_badge_id, requirement_number')
        .in('merit_badge_id', badgeIds)
        .eq('version_year', badgeVersionYear)
        .eq('nesting_depth', level)
        .range(offset, offset + pageSize - 1)

      if (!inserted || inserted.length === 0) break

      for (const row of inserted) {
        reqDbIdMap.set(`${row.merit_badge_id}:${row.requirement_number}`, row.id)
      }

      if (inserted.length < pageSize) break
      offset += pageSize
    }

    console.log(`  Level ${level}: ${insertRecords.length} requirements`)
    totalInserted += insertRecords.length
  }

  console.log(`  Total requirements: ${totalInserted}`)
  console.log('\n=== Merit Badges Import Complete ===')
}

/**
 * Import leadership positions with bulk upsert
 */
async function importLeadershipPositions(filename?: string) {
  const file = filename || files.leadershipPositions
  console.log('\n=== Importing Leadership Positions ===')
  console.log(`  File: ${file}`)

  const data = readJsonFile<LeadershipFile>(file)

  const positionRecords = data.positions.map(position => ({
    code: position.code,
    name: position.name,
    qualifies_for_star: position.qualifies_for_star,
    qualifies_for_life: position.qualifies_for_life,
    qualifies_for_eagle: position.qualifies_for_eagle,
    min_tenure_months: position.min_tenure_months,
    is_patrol_level: position.is_patrol_level,
    is_troop_level: position.is_troop_level,
    description: position.description,
  }))

  const { error } = await supabase
    .from('bsa_leadership_positions')
    .upsert(positionRecords, { onConflict: 'code' })

  if (error) {
    console.error('Error upserting leadership positions:', error)
    return
  }

  console.log(`  Upserted ${positionRecords.length} leadership positions`)
  console.log('\n=== Leadership Positions Import Complete ===')
}

/**
 * Import scraped merit badge requirements (from Scoutbook scraper)
 *
 * Reads from merit-badge-requirements-scraped.json (source of truth)
 * - 141 badges, 358 versions, 11,289 requirements
 * - Uses bulk inserts for performance (~20s vs ~30min)
 * - Processes level-by-level to resolve parent relationships
 */
async function importVersionedMeritBadgeRequirements(filename?: string) {
  const file = filename || 'merit-badge-requirements-scraped.json'
  console.log('\n=== Importing Scraped Merit Badge Requirements ===')
  console.log(`  File: ${file}`)

  const data = readJsonFile<ScrapedDataFile>(file)
  const totalReqs = data.badges.reduce((sum, b) => sum + b.requirements.length, 0)
  console.log(`  Badges: ${data.totalBadges}`)
  console.log(`  Badge versions: ${data.badges.length}`)
  console.log(`  Requirements: ${totalReqs}`)

  const startTime = Date.now()

  // Step 1: Get badge ID map (by code/slug)
  const { data: badges, error: badgesError } = await supabase
    .from('bsa_merit_badges')
    .select('id, code')

  if (badgesError || !badges) {
    console.error('Error fetching badges:', badgesError)
    return
  }

  const badgeCodeToId = new Map(badges.map((b) => [b.code, b.id]))
  console.log(`  Found ${badges.length} existing badges in DB`)

  // Normalize scraped slugs to DB codes (handle naming mismatches)
  const SLUG_TO_CODE: Record<string, string> = {
    artificial_intelligence_ai: 'artificial_intelligence',
    fish_and_wildlife_management: 'fish_wildlife_management',
  }
  const normalizeSlug = (slug: string) => SLUG_TO_CODE[slug] || slug

  // Step 2: Build version records and upsert
  const versionRecords: {
    merit_badge_id: string
    version_year: number
    is_current: boolean
    source: string
    scraped_at: string
  }[] = []

  const seenVersions = new Set<string>()
  for (const badge of data.badges) {
    const badgeId = badgeCodeToId.get(normalizeSlug(badge.badgeSlug))
    if (!badgeId) continue

    const versionKey = `${badgeId}:${badge.versionYear}`
    if (seenVersions.has(versionKey)) continue
    seenVersions.add(versionKey)

    versionRecords.push({
      merit_badge_id: badgeId,
      version_year: badge.versionYear,
      is_current: badge.versionLabel.includes('(Active)'),
      source: 'scoutbook',
      scraped_at: new Date().toISOString(),
    })
  }

  for (const batch of chunk(versionRecords, batchSize)) {
    const { error } = await supabase
      .from('bsa_merit_badge_versions')
      .upsert(batch, { onConflict: 'merit_badge_id,version_year' })
    if (error) {
      console.error('Error upserting versions:', error)
    }
  }
  console.log(`  Upserted ${versionRecords.length} versions`)

  // Step 3: Delete existing requirements for version years in the import
  const versionYears = [...new Set(data.badges.map((b) => b.versionYear))]
  const badgeIds = badges.map((b) => b.id)

  for (const year of versionYears) {
    const { error } = await supabase
      .from('bsa_merit_badge_requirements')
      .delete()
      .in('merit_badge_id', badgeIds)
      .eq('version_year', year)

    if (error) {
      // FK constraint errors are expected if there's scout progress - continue
      if (!error.message.includes('foreign key constraint')) {
        console.error(`Error deleting requirements for year ${year}:`, error.message)
      }
    }
  }
  console.log(`  Cleared requirements for ${versionYears.length} version years`)

  // Step 4: Flatten all requirements with badge context and group by depth
  type FlatReq = {
    badgeId: string
    versionYear: number
    number: string
    description: string
    parentNumber: string | null
    depth: number
    displayOrder: number
  }

  const requirementsByLevel = new Map<number, FlatReq[]>()
  let maxLevel = 0

  for (const badge of data.badges) {
    const badgeId = badgeCodeToId.get(normalizeSlug(badge.badgeSlug))
    if (!badgeId) continue

    let displayOrder = 1
    for (const req of badge.requirements) {
      const level = req.depth
      maxLevel = Math.max(maxLevel, level)

      if (!requirementsByLevel.has(level)) {
        requirementsByLevel.set(level, [])
      }
      requirementsByLevel.get(level)!.push({
        badgeId,
        versionYear: badge.versionYear,
        number: req.number,
        description: req.description,
        parentNumber: req.parentNumber,
        depth: req.depth,
        displayOrder: displayOrder++,
      })
    }
  }

  console.log(`  Max nesting depth: ${maxLevel}`)

  // Step 5: Process level by level
  // Map: badgeId:versionYear:requirementNumber -> database ID
  const reqDbIdMap = new Map<string, string>()
  let totalInserted = 0

  for (let level = 0; level <= maxLevel; level++) {
    const levelReqs = requirementsByLevel.get(level) || []
    if (levelReqs.length === 0) continue

    const insertRecords: {
      merit_badge_id: string
      version_year: number
      requirement_number: string
      scoutbook_requirement_number: string
      description: string
      display_order: number
      parent_requirement_id: string | null
      nesting_depth: number
    }[] = []

    for (const req of levelReqs) {
      // Look up parent's database ID
      let parentDbId: string | null = null
      if (req.parentNumber) {
        const parentKey = `${req.badgeId}:${req.versionYear}:${req.parentNumber}`
        parentDbId = reqDbIdMap.get(parentKey) || null
      }

      insertRecords.push({
        merit_badge_id: req.badgeId,
        version_year: req.versionYear,
        requirement_number: req.number,
        scoutbook_requirement_number: req.number, // Scraped format IS scoutbook format
        description: req.description,
        display_order: req.displayOrder,
        parent_requirement_id: parentDbId,
        nesting_depth: req.depth,
      })
    }

    // Insert this level in batches
    for (const batch of chunk(insertRecords, batchSize)) {
      const { error } = await supabase.from('bsa_merit_badge_requirements').insert(batch)
      if (error) {
        console.error(`Error inserting level ${level} requirements:`, error.message)
      }
    }

    // Fetch inserted records to get their database IDs (paginated)
    let offset = 0
    const pageSize = 1000
    while (true) {
      const { data: inserted } = await supabase
        .from('bsa_merit_badge_requirements')
        .select('id, merit_badge_id, version_year, requirement_number')
        .in('merit_badge_id', badgeIds)
        .in('version_year', versionYears)
        .eq('nesting_depth', level)
        .range(offset, offset + pageSize - 1)

      if (!inserted || inserted.length === 0) break

      for (const row of inserted) {
        const key = `${row.merit_badge_id}:${row.version_year}:${row.requirement_number}`
        reqDbIdMap.set(key, row.id)
      }

      if (inserted.length < pageSize) break
      offset += pageSize
    }

    console.log(`  Level ${level}: ${insertRecords.length} requirements`)
    totalInserted += insertRecords.length
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`  Total: ${totalInserted} requirements in ${elapsed}s`)
  console.log('\n=== Scraped Requirements Import Complete ===')
}

/**
 * Import all BSA reference data
 */
async function importAll() {
  console.log('\n╔════════════════════════════════════════╗')
  console.log('║   BSA Reference Data Import            ║')
  console.log('╚════════════════════════════════════════╝')
  console.log(`\nConfiguration:`)
  console.log(`  Version Year: ${versionYear}`)
  console.log(`  Batch Size: ${batchSize}`)
  console.log(`  Files:`)
  console.log(`    Ranks: ${files.ranks}`)
  console.log(`    Merit Badges: ${files.meritBadges}`)
  console.log(`    Positions: ${files.leadershipPositions}`)

  const startTime = Date.now()

  await importRanks()
  await importMeritBadges()
  await importLeadershipPositions()

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`\n✅ All BSA Reference Data Imported in ${elapsed}s`)
}

// Export functions for use by other scripts (like db.ts)
export {
  importRanks,
  importMeritBadges,
  importLeadershipPositions,
  importVersionedMeritBadgeRequirements,
  importAll,
}

// CLI - only run when executed directly
const isMainModule = process.argv[1]?.includes('bsa-reference-data')

if (isMainModule) {
  const command = process.argv[2]
  const arg1 = process.argv[3]

  switch (command) {
    case 'import-all':
      importAll()
      break

    case 'import-ranks':
      importRanks(arg1)
      break

    case 'import-badges':
      importMeritBadges(arg1)
      break

    case 'import-positions':
      importLeadershipPositions(arg1)
      break

    case 'import-versioned-reqs':
      importVersionedMeritBadgeRequirements(arg1)
      break

    default:
      console.log(`
BSA Reference Data Management CLI

Usage:
  npx tsx scripts/bsa-reference-data.ts <command> [options]

Commands:
  import-all                    Import all data using config from seed-config.ts
  import-ranks [filename]       Import rank requirements (override config file)
  import-badges [filename]      Import merit badges (override config file)
  import-positions [filename]   Import leadership positions (override config file)
  import-versioned-reqs [file]  Import multi-version merit badge requirements

Configuration (seed-config.ts):
  Version Year: ${versionYear}
  Ranks File: ${files.ranks}
  Merit Badges File: ${files.meritBadges}
  Positions File: ${files.leadershipPositions}

Examples:
  npx tsx scripts/bsa-reference-data.ts import-all
  npx tsx scripts/bsa-reference-data.ts import-badges merit-badges-2026.json
`)
  }
}
