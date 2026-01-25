#!/usr/bin/env npx tsx
/**
 * Fix Crime Prevention 2025 Requirement 4 Structure
 *
 * Issues identified:
 * 1. 4a ("Discuss the following...") should be is_header=true
 * 2. 4(1) and 4(2) have wrong parent (pointing to "4" instead of "4a")
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  console.log('='.repeat(60))
  console.log('FIX CRIME PREVENTION 2025 REQUIREMENTS')
  console.log('='.repeat(60))
  console.log(dryRun ? 'DRY RUN - No changes will be made' : 'LIVE RUN - Changes will be applied')
  console.log('')

  // Get Crime Prevention badge
  const { data: badge } = await supabase
    .from('bsa_merit_badges')
    .select('id')
    .eq('name', 'Crime Prevention')
    .single()

  if (!badge) {
    console.error('Crime Prevention badge not found')
    return
  }

  // Get requirement 4 family
  const { data: reqs } = await supabase
    .from('bsa_merit_badge_requirements')
    .select('id, requirement_number, description, is_header, parent_requirement_id')
    .eq('merit_badge_id', badge.id)
    .eq('version_year', 2025)
    .like('requirement_number', '4%')
    .order('display_order')

  if (!reqs || reqs.length === 0) {
    console.error('No requirement 4 family found')
    return
  }

  // Find the specific requirements
  const req4 = reqs.find(r => r.requirement_number === '4')
  const req4a = reqs.find(r => r.requirement_number === '4a')
  const req4_1 = reqs.find(r => r.requirement_number === '4(1)')
  const req4_2 = reqs.find(r => r.requirement_number === '4(2)')

  console.log('Current state:')
  console.log(`  4:    is_header=${req4?.is_header}`)
  console.log(`  4a:   is_header=${req4a?.is_header}`)
  console.log(`  4(1): parent=${reqs.find(r => r.id === req4_1?.parent_requirement_id)?.requirement_number || 'none'}`)
  console.log(`  4(2): parent=${reqs.find(r => r.id === req4_2?.parent_requirement_id)?.requirement_number || 'none'}`)
  console.log('')

  const updates: Array<{ id: string; change: string; data: Record<string, unknown> }> = []

  // Fix 1: Mark 4a as header
  if (req4a && !req4a.is_header) {
    updates.push({
      id: req4a.id,
      change: '4a: is_header=false → true',
      data: { is_header: true }
    })
  }

  // Fix 2: Update 4(1) parent to 4a
  if (req4_1 && req4a && req4_1.parent_requirement_id !== req4a.id) {
    updates.push({
      id: req4_1.id,
      change: `4(1): parent "4" → "4a"`,
      data: { parent_requirement_id: req4a.id }
    })
  }

  // Fix 3: Update 4(2) parent to 4a
  if (req4_2 && req4a && req4_2.parent_requirement_id !== req4a.id) {
    updates.push({
      id: req4_2.id,
      change: `4(2): parent "4" → "4a"`,
      data: { parent_requirement_id: req4a.id }
    })
  }

  console.log(`Updates to apply: ${updates.length}`)
  for (const u of updates) {
    console.log(`  - ${u.change}`)
  }

  if (updates.length === 0) {
    console.log('\nNo updates needed - structure is already correct!')
    return
  }

  if (dryRun) {
    console.log('\nDRY RUN - No changes made')
    return
  }

  // Apply updates
  console.log('\nApplying updates...')
  let success = 0
  let failed = 0

  for (const u of updates) {
    const { error } = await supabase
      .from('bsa_merit_badge_requirements')
      .update(u.data)
      .eq('id', u.id)

    if (error) {
      console.error(`  FAILED: ${u.change} - ${error.message}`)
      failed++
    } else {
      console.log(`  OK: ${u.change}`)
      success++
    }
  }

  console.log(`\nComplete: ${success} updated, ${failed} failed`)

  // Show final state
  console.log('\n--- Final state ---')
  const { data: finalReqs } = await supabase
    .from('bsa_merit_badge_requirements')
    .select('id, requirement_number, is_header, parent_requirement_id')
    .eq('merit_badge_id', badge.id)
    .eq('version_year', 2025)
    .like('requirement_number', '4%')
    .order('display_order')

  const reqMap = new Map(finalReqs?.map(r => [r.id, r]) || [])

  for (const r of finalReqs || []) {
    const parent = r.parent_requirement_id ? reqMap.get(r.parent_requirement_id) : null
    const h = r.is_header ? ' [HEADER]' : ''
    const p = parent ? ` (parent: ${parent.requirement_number})` : ''
    console.log(`  ${r.requirement_number}${h}${p}`)
  }
}

main().catch(console.error)
