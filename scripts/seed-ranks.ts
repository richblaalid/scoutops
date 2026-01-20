/**
 * Seed BSA Ranks Database
 *
 * Populates the database with rank data from the source file:
 * - bsa_requirement_versions (2025 version for ranks)
 * - bsa_ranks (7 ranks)
 * - bsa_rank_requirements (all requirements)
 *
 * Run with: npx tsx scripts/seed-ranks.ts
 *
 * Prerequisites:
 * - Supabase migrations must be applied
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

interface SubRequirement {
  letter: string
  description: string
}

interface Requirement {
  number: string
  description: string
  note?: string
  sub_requirements?: SubRequirement[]
}

interface Rank {
  code: string
  name: string
  display_order: number
  is_eagle_required: boolean
  description: string
  requirements: Requirement[]
}

interface SourceData {
  version_year: number
  effective_date: string
  ranks: Rank[]
}

async function main() {
  console.log('Loading rank source data...')
  const sourcePath = path.join(__dirname, '../data/ranks-2025.json')
  const sourceData: SourceData = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'))
  console.log(`Loaded ${sourceData.ranks.length} ranks`)

  // Step 1: Create or get 2025 requirement version (ranks use 2025 version)
  console.log('\n1. Creating 2025 requirement version for ranks...')
  const { data: existingVersion } = await supabase
    .from('bsa_requirement_versions')
    .select('id')
    .eq('version_year', 2025)
    .single()

  let versionId: string
  if (existingVersion) {
    versionId = existingVersion.id
    console.log('   Using existing 2025 version:', versionId)
  } else {
    const { data: newVersion, error: versionError } = await supabase
      .from('bsa_requirement_versions')
      .insert({
        version_year: 2025,
        effective_date: '2025-01-01',
        is_active: true,
        notes: 'BSA 2025 Rank Requirements',
      })
      .select('id')
      .single()

    if (versionError) {
      console.error('Error creating version:', versionError)
      process.exit(1)
    }
    versionId = newVersion.id
    console.log('   Created new 2025 version:', versionId)
  }

  // Step 2: Insert ranks
  console.log('\n2. Inserting ranks...')
  let ranksInserted = 0
  let ranksUpdated = 0

  const rankIdMap = new Map<string, string>()

  for (const rank of sourceData.ranks) {
    const rankData = {
      code: rank.code,
      name: rank.name,
      display_order: rank.display_order,
      is_eagle_required: rank.is_eagle_required,
      description: rank.description,
    }

    // Try to upsert
    const { data: existingRank } = await supabase
      .from('bsa_ranks')
      .select('id')
      .eq('code', rank.code)
      .single()

    if (existingRank) {
      const { error: updateError } = await supabase
        .from('bsa_ranks')
        .update(rankData)
        .eq('id', existingRank.id)

      if (updateError) {
        console.error(`   Error updating ${rank.name}:`, updateError)
      } else {
        rankIdMap.set(rank.code, existingRank.id)
        ranksUpdated++
      }
    } else {
      const { data: newRank, error: insertError } = await supabase
        .from('bsa_ranks')
        .insert(rankData)
        .select('id')
        .single()

      if (insertError) {
        console.error(`   Error inserting ${rank.name}:`, insertError)
      } else {
        rankIdMap.set(rank.code, newRank.id)
        ranksInserted++
      }
    }
  }

  console.log(`   Inserted: ${ranksInserted}, Updated: ${ranksUpdated}`)

  // Step 3: Insert requirements
  console.log('\n3. Inserting requirements...')
  let requirementsInserted = 0
  let requirementsSkipped = 0

  for (const rank of sourceData.ranks) {
    const rankId = rankIdMap.get(rank.code)
    if (!rankId) {
      console.error(`   No rank ID for ${rank.name}`)
      continue
    }

    // Delete existing requirements for this rank/version
    await supabase
      .from('bsa_rank_requirements')
      .delete()
      .eq('version_id', versionId)
      .eq('rank_id', rankId)

    let displayOrder = 0

    // Track inserted requirements to skip duplicates
    const insertedReqs = new Set<string>()

    // Map to track parent requirement IDs by requirement number
    const parentIdByReqNumber = new Map<string, string>()

    for (const req of rank.requirements) {
      // Parse requirement number (e.g., "1a", "2", "3a")
      const match = req.number.match(/^(\d+)([a-z])?$/)

      let reqNumber: string
      let subLetter: string | null = null

      if (match) {
        reqNumber = match[1]
        subLetter = match[2] || null
      } else {
        // Fallback: use the whole number as requirement number
        reqNumber = req.number
      }

      // Check for duplicates
      const uniqueKey = `${reqNumber}|${subLetter || ''}`
      if (insertedReqs.has(uniqueKey)) {
        requirementsSkipped++
        continue
      }

      insertedReqs.add(uniqueKey)
      displayOrder++

      // For sub-requirements (like "1a"), find the parent by requirement number
      let parentId: string | null = null
      if (subLetter) {
        parentId = parentIdByReqNumber.get(reqNumber) || null
      }

      const reqData = {
        version_id: versionId,
        rank_id: rankId,
        requirement_number: reqNumber,
        parent_requirement_id: parentId,
        sub_requirement_letter: subLetter,
        description: req.description + (req.note ? `\n\nNote: ${req.note}` : ''),
        display_order: displayOrder,
      }

      const { data: newReq, error: reqError } = await supabase
        .from('bsa_rank_requirements')
        .insert(reqData)
        .select('id')
        .single()

      if (reqError) {
        console.error(`   Error inserting req ${req.number} for ${rank.name}:`, reqError.message)
        requirementsSkipped++
      } else {
        requirementsInserted++

        // Store the ID for this requirement number (for sub-requirements to find their parent)
        if (!subLetter) {
          // This is a main requirement (no sub-letter)
          parentIdByReqNumber.set(reqNumber, newReq.id)
        }

        // Insert nested sub-requirements if any
        if (req.sub_requirements && req.sub_requirements.length > 0) {
          for (const subReq of req.sub_requirements) {
            displayOrder++

            const subKey = `${reqNumber}|${subReq.letter}`
            if (insertedReqs.has(subKey)) {
              requirementsSkipped++
              continue
            }
            insertedReqs.add(subKey)

            const subReqData = {
              version_id: versionId,
              rank_id: rankId,
              requirement_number: reqNumber,
              parent_requirement_id: newReq.id,
              sub_requirement_letter: subReq.letter,
              description: subReq.description,
              display_order: displayOrder,
            }

            const { error: subReqError } = await supabase
              .from('bsa_rank_requirements')
              .insert(subReqData)

            if (subReqError) {
              console.error(
                `   Error inserting sub-req ${reqNumber}${subReq.letter} for ${rank.name}:`,
                subReqError.message
              )
              requirementsSkipped++
            } else {
              requirementsInserted++
            }
          }
        }
      }
    }
  }

  console.log(`   Inserted: ${requirementsInserted}, Skipped: ${requirementsSkipped}`)

  // Summary
  console.log('\n=== Seeding Complete ===')
  console.log(`Version: 2025 (${versionId})`)
  console.log(`Ranks: ${ranksInserted} inserted, ${ranksUpdated} updated`)
  console.log(`Requirements: ${requirementsInserted} inserted`)
}

main().catch(console.error)
