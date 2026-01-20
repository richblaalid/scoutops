/**
 * Seed Merit Badges Database
 *
 * Populates the database with merit badge data from the source file:
 * - bsa_requirement_versions (2026 version)
 * - bsa_merit_badges (141 badges)
 * - bsa_merit_badge_requirements (all requirements)
 *
 * Run with: npx tsx scripts/seed-merit-badges.ts
 *
 * Prerequisites:
 * - Supabase migrations must be applied (including pamphlet_url column)
 * - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

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

  // Step 3: Insert requirements
  console.log('\n3. Inserting requirements...')
  let requirementsInserted = 0
  let requirementsSkipped = 0

  for (const badge of sourceData.merit_badges) {
    const badgeId = badgeIdMap.get(badge.code)
    if (!badgeId) {
      console.error(`   No badge ID for ${badge.name}`)
      continue
    }

    // Delete existing requirements for this badge/version
    await supabase
      .from('bsa_merit_badge_requirements')
      .delete()
      .eq('version_id', versionId)
      .eq('merit_badge_id', badgeId)

    let displayOrder = 0

    // Track inserted requirements to skip duplicates
    // Key: "reqNumber|subLetter" (subLetter can be null)
    const insertedReqs = new Set<string>()

    // Map to track parent requirement IDs by requirement number
    const parentIdByReqNumber = new Map<string, string>()

    async function insertRequirements(
      requirements: Requirement[],
      parentId: string | null = null
    ) {
      for (const req of requirements) {
        // Parse requirement ID (e.g., "1", "1a", "1a1", "7b8")
        // Main requirements: just a number (1, 2, 3...)
        // Sub-requirements: number + letter (1a, 1b...)
        // Deep sub-requirements: number + letter + number (1a1, 7b8...)
        const match = req.id.match(/^(\d+)([a-z])?(\d+)?$/)

        let reqNumber: string
        let subLetter: string | null = null

        if (match) {
          reqNumber = match[1]
          if (match[2]) {
            subLetter = match[2]
            if (match[3]) {
              // Deep sub-requirement like 7b8 - combine letter and number
              subLetter = match[2] + match[3]
            }
          }
        } else {
          // Fallback: use the whole ID as requirement number
          reqNumber = req.id
        }

        // Check for duplicates using the unique constraint key
        const uniqueKey = `${reqNumber}|${subLetter || ''}`
        if (insertedReqs.has(uniqueKey)) {
          requirementsSkipped++

          // Still process sub-requirements with existing parent
          if (req.subrequirements && req.subrequirements.length > 0) {
            const existingParentId = subLetter
              ? parentIdByReqNumber.get(reqNumber)
              : parentIdByReqNumber.get(reqNumber)
            if (existingParentId) {
              await insertRequirements(req.subrequirements, existingParentId)
            }
          }
          continue
        }

        insertedReqs.add(uniqueKey)
        displayOrder++

        // For sub-requirements, find the parent by requirement number
        let actualParentId = parentId
        if (subLetter && !parentId) {
          // This is a sub-requirement, look up the parent by requirement number
          actualParentId = parentIdByReqNumber.get(reqNumber) || null
        }

        const reqData = {
          version_id: versionId,
          merit_badge_id: badgeId,
          requirement_number: reqNumber,
          parent_requirement_id: actualParentId,
          sub_requirement_letter: subLetter,
          description: req.text,
          display_order: displayOrder,
        }

        const { data: newReq, error: reqError } = await supabase
          .from('bsa_merit_badge_requirements')
          .insert(reqData)
          .select('id')
          .single()

        if (reqError) {
          console.error(`   Error inserting req ${req.id} for ${badge.name}:`, reqError.message)
          requirementsSkipped++
        } else {
          requirementsInserted++

          // Store the ID for this requirement number (for sub-requirements to find their parent)
          if (!subLetter) {
            // This is a main requirement (no sub-letter)
            parentIdByReqNumber.set(reqNumber, newReq.id)
          }

          // Insert sub-requirements with this as their parent
          if (req.subrequirements && req.subrequirements.length > 0) {
            await insertRequirements(req.subrequirements, newReq.id)
          }
        }
      }
    }

    await insertRequirements(badge.requirements)
  }

  console.log(`   Inserted: ${requirementsInserted}, Skipped: ${requirementsSkipped}`)

  // Summary
  console.log('\n=== Seeding Complete ===')
  console.log(`Version: 2026 (${versionId})`)
  console.log(`Badges: ${badgesInserted} inserted, ${badgesUpdated} updated`)
  console.log(`Requirements: ${requirementsInserted} inserted`)
}

main().catch(console.error)
