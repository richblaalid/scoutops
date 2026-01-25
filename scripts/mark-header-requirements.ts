#!/usr/bin/env npx tsx
/**
 * Mark Header Requirements
 *
 * Updates bsa_merit_badge_requirements to set is_header=true for all
 * requirements that have children (are parents of sub-requirements).
 *
 * These parent requirements are description-only headers like "Do the following:"
 * and don't have checkboxes in Scoutbook for sign-off.
 *
 * Usage:
 *   npx tsx scripts/mark-header-requirements.ts --dry-run    # Preview changes
 *   npx tsx scripts/mark-header-requirements.ts              # Apply changes
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Check for --prod flag
const isProd = process.argv.includes('--prod')
const envFile = isProd ? '.env.prod' : '.env.local'

dotenv.config({ path: envFile })

console.log(`Using environment: ${envFile}`)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  console.log('='.repeat(60))
  console.log('MARK HEADER REQUIREMENTS')
  console.log('='.repeat(60))
  console.log(dryRun ? 'DRY RUN - No changes will be made' : 'LIVE RUN - Changes will be applied')
  console.log('')

  // Fetch all requirements with pagination
  console.log('Fetching all requirements...')
  const allReqs: Array<{ id: string; parent_requirement_id: string | null }> = []
  let offset = 0
  const batchSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from('bsa_merit_badge_requirements')
      .select('id, parent_requirement_id')
      .range(offset, offset + batchSize - 1)
      .order('id')

    if (error) {
      console.error('Error fetching requirements:', error)
      return
    }

    if (!data || data.length === 0) break
    allReqs.push(...data)
    offset += batchSize
    process.stdout.write(`  Loaded ${allReqs.length} requirements...\r`)
  }
  console.log(`  Loaded ${allReqs.length} requirements   `)

  // Find all parent IDs (requirements that have children pointing to them)
  const parentIds = new Set<string>()
  for (const req of allReqs) {
    if (req.parent_requirement_id) {
      parentIds.add(req.parent_requirement_id)
    }
  }

  console.log(`\nFound ${parentIds.size} parent requirements (have children)`)

  // Check current state - how many already marked as headers
  const { count: alreadyMarked } = await supabase
    .from('bsa_merit_badge_requirements')
    .select('*', { count: 'exact', head: true })
    .eq('is_header', true)

  console.log(`Already marked as is_header=true: ${alreadyMarked || 0}`)

  // Get sample of what we'll update
  const parentIdList = [...parentIds]
  console.log(`\nSample parent requirements to mark as headers:`)

  const { data: sampleParents } = await supabase
    .from('bsa_merit_badge_requirements')
    .select('id, requirement_number, description, is_header, bsa_merit_badges(name), version_year')
    .in('id', parentIdList.slice(0, 10))

  for (const p of sampleParents || []) {
    const badge = p.bsa_merit_badges as unknown as { name: string } | null
    console.log(`  ${badge?.name} ${p.version_year} req ${p.requirement_number}: "${(p.description || '').substring(0, 50)}..."`)
    console.log(`    Current is_header: ${p.is_header}`)
  }

  if (dryRun) {
    console.log(`\nDRY RUN: Would update ${parentIds.size} requirements to is_header=true`)
    return
  }

  // Apply updates in batches
  console.log(`\nUpdating ${parentIds.size} requirements to is_header=true...`)

  let updated = 0
  let failed = 0
  const batchUpdateSize = 100

  for (let i = 0; i < parentIdList.length; i += batchUpdateSize) {
    const batch = parentIdList.slice(i, i + batchUpdateSize)

    const { error } = await supabase
      .from('bsa_merit_badge_requirements')
      .update({ is_header: true })
      .in('id', batch)

    if (error) {
      console.error(`  Batch error:`, error.message)
      failed += batch.length
    } else {
      updated += batch.length
    }

    process.stdout.write(`  Updated ${updated}/${parentIds.size}...\r`)
  }

  console.log(`\nUpdated ${updated} requirements, ${failed} failed   `)

  // Verify
  const { count: nowMarked } = await supabase
    .from('bsa_merit_badge_requirements')
    .select('*', { count: 'exact', head: true })
    .eq('is_header', true)

  console.log(`\nVerification:`)
  console.log(`  Requirements now marked as is_header=true: ${nowMarked}`)

  // Check progress records that reference header requirements
  const { data: progressOnHeaders } = await supabase
    .from('scout_merit_badge_requirement_progress')
    .select('id, requirement_id')
    .in('requirement_id', parentIdList.slice(0, 1000)) // Check first 1000

  console.log(`\nProgress records on header requirements: ${progressOnHeaders?.length || 0}`)
  if (progressOnHeaders && progressOnHeaders.length > 0) {
    console.log('  (These may need to be reviewed/cleaned up)')
  }
}

main().catch(console.error)
