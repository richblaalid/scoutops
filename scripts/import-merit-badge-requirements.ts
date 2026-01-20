#!/usr/bin/env npx tsx

/**
 * Import Merit Badge Requirements from source JSON to database
 *
 * Usage: npx tsx scripts/import-merit-badge-requirements.ts [--dry-run]
 *
 * Options:
 *   --dry-run    Preview what would be imported without making changes
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface SourceSubRequirement {
  id: string
  text: string
}

interface SourceRequirement {
  id: string
  text: string
  subrequirements?: SourceSubRequirement[]
}

interface SourceBadge {
  code: string
  name: string
  slug: string
  category: string
  is_eagle_required: boolean
  requirements: SourceRequirement[]
}

interface SourceData {
  version: string
  total_badges: number
  merit_badges: SourceBadge[]
}

interface DbBadge {
  id: string
  name: string
  code: string | null
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run')

  console.log('===========================================')
  console.log('  Merit Badge Requirements Import Script')
  console.log('===========================================')
  console.log('')

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made')
    console.log('')
  }

  // 1. Load source data
  const sourcePath = path.join(__dirname, '../data/merit-badges-source.json')
  if (!fs.existsSync(sourcePath)) {
    console.error('Source file not found:', sourcePath)
    process.exit(1)
  }

  const sourceData: SourceData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'))
  console.log(`📁 Loaded source file: ${sourceData.total_badges} badges, version ${sourceData.version}`)

  // 2. Get active requirement version
  const { data: version, error: versionError } = await supabase
    .from('bsa_requirement_versions')
    .select('id, version_year, effective_date')
    .eq('is_active', true)
    .order('effective_date', { ascending: false })
    .limit(1)
    .single()

  if (versionError || !version) {
    console.error('Failed to get active requirement version:', versionError?.message)
    process.exit(1)
  }

  console.log(`📋 Active version: ${version.version_year} (${version.id})`)
  console.log('')

  // 3. Get all badges from database
  const { data: dbBadges, error: badgesError } = await supabase
    .from('bsa_merit_badges')
    .select('id, name, code')

  if (badgesError || !dbBadges) {
    console.error('Failed to get badges from database:', badgesError?.message)
    process.exit(1)
  }

  // Create lookup map by name (normalized)
  const badgesByName = new Map<string, DbBadge>()
  dbBadges.forEach(badge => {
    badgesByName.set(badge.name.toLowerCase().trim(), badge)
  })

  console.log(`📊 Found ${dbBadges.length} badges in database`)

  // 4. Get existing requirements to check what's already imported
  const { data: existingReqs, error: existingError } = await supabase
    .from('bsa_merit_badge_requirements')
    .select('merit_badge_id')
    .eq('version_id', version.id)

  if (existingError) {
    console.error('Failed to get existing requirements:', existingError?.message)
    process.exit(1)
  }

  const badgesWithReqs = new Set(existingReqs?.map(r => r.merit_badge_id) || [])
  console.log(`✅ ${badgesWithReqs.size} badges already have requirements`)
  console.log('')

  // 5. Process each badge
  let imported = 0
  let skipped = 0
  let notFound = 0
  let errors = 0
  const toImport: Array<{
    badge: SourceBadge
    dbBadge: DbBadge
    reqCount: number
  }> = []

  for (const sourceBadge of sourceData.merit_badges) {
    const dbBadge = badgesByName.get(sourceBadge.name.toLowerCase().trim())

    if (!dbBadge) {
      console.log(`⚠️  Badge not found in database: ${sourceBadge.name}`)
      notFound++
      continue
    }

    if (badgesWithReqs.has(dbBadge.id)) {
      skipped++
      continue
    }

    // Count requirements
    let reqCount = sourceBadge.requirements.length
    sourceBadge.requirements.forEach(req => {
      if (req.subrequirements) {
        reqCount += req.subrequirements.length
      }
    })

    toImport.push({ badge: sourceBadge, dbBadge, reqCount })
  }

  console.log('=== IMPORT SUMMARY ===')
  console.log(`Badges to import: ${toImport.length}`)
  console.log(`Badges skipped (already have requirements): ${skipped}`)
  console.log(`Badges not found in database: ${notFound}`)
  console.log('')

  if (toImport.length === 0) {
    console.log('✅ Nothing to import - all badges already have requirements!')
    return
  }

  // Show what will be imported
  console.log('Badges to import:')
  toImport.forEach(({ badge, reqCount }) => {
    const eagle = badge.is_eagle_required ? '⭐' : '  '
    console.log(`  ${eagle} ${badge.name} (${reqCount} requirements)`)
  })
  console.log('')

  if (isDryRun) {
    console.log('🔍 DRY RUN - No changes made')
    console.log(`   Would import ${toImport.length} badges with ${toImport.reduce((sum, b) => sum + b.reqCount, 0)} total requirements`)
    return
  }

  // 6. Import requirements
  console.log('Importing requirements...')
  console.log('')

  for (const { badge, dbBadge, reqCount } of toImport) {
    const requirements: Array<{
      version_id: string
      merit_badge_id: string
      requirement_number: string
      parent_requirement_id: string | null
      sub_requirement_letter: string | null
      description: string
      display_order: number
    }> = []

    let displayOrder = 1

    // Process each top-level requirement
    for (const req of badge.requirements) {
      // Add top-level requirement
      requirements.push({
        version_id: version.id,
        merit_badge_id: dbBadge.id,
        requirement_number: req.id,
        parent_requirement_id: null,
        sub_requirement_letter: null,
        description: req.text,
        display_order: displayOrder++,
      })

      // Add sub-requirements
      if (req.subrequirements) {
        for (const subReq of req.subrequirements) {
          // Extract the letter from the id (e.g., "1a" -> "a")
          const letter = subReq.id.replace(/^\d+/, '')

          requirements.push({
            version_id: version.id,
            merit_badge_id: dbBadge.id,
            requirement_number: subReq.id,
            parent_requirement_id: null, // We'll need to update this after insert
            sub_requirement_letter: letter || null,
            description: subReq.text,
            display_order: displayOrder++,
          })
        }
      }
    }

    // Insert requirements
    const { error: insertError } = await supabase
      .from('bsa_merit_badge_requirements')
      .insert(requirements)

    if (insertError) {
      console.log(`❌ Failed to import ${badge.name}: ${insertError.message}`)
      errors++
    } else {
      console.log(`✅ ${badge.name} - ${requirements.length} requirements`)
      imported++
    }
  }

  console.log('')
  console.log('=== IMPORT COMPLETE ===')
  console.log(`✅ Imported: ${imported} badges`)
  console.log(`⏭️  Skipped: ${skipped} badges (already had requirements)`)
  console.log(`⚠️  Not found: ${notFound} badges`)
  console.log(`❌ Errors: ${errors} badges`)
}

main().catch(console.error)
