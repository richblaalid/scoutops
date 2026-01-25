#!/usr/bin/env npx tsx
/**
 * Fix Multisport 2026 Requirement Numbers and Structure
 *
 * Updates to match canonical Scoutbook format:
 * - Add Option headers (Option A—Triathlon, etc.)
 * - Update requirement numbers: 4Aa → 4 Option A (1)(a)
 * - Mark sport headers as is_header=true
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// Mapping from current requirement_number to canonical format
const requirementMapping: Record<string, { newNumber: string; isHeader: boolean; description?: string }> = {
  // Requirements 1-3 (simple format)
  '1': { newNumber: '1', isHeader: true },
  '1a': { newNumber: '1(a)', isHeader: false },
  '1b': { newNumber: '1(b)', isHeader: false },
  '2': { newNumber: '2', isHeader: true },
  '2a': { newNumber: '2(a)', isHeader: false },
  '2b': { newNumber: '2(b)', isHeader: false },
  '2c': { newNumber: '2(c)', isHeader: false },
  '3': { newNumber: '3', isHeader: true },
  '3a': { newNumber: '3(a)', isHeader: false },
  '3b': { newNumber: '3(b)', isHeader: false },
  '3c': { newNumber: '3(c)', isHeader: false },
  '3d': { newNumber: '3(d)', isHeader: false },

  // Requirement 4 main header
  '4': { newNumber: '4', isHeader: true },

  // Option A—Triathlon: Swimming (1), Biking (2), Running (3)
  '4A(1)': { newNumber: '4 Option A (1)', isHeader: true, description: 'Swimming' },
  '4Aa': { newNumber: '4 Option A (1)(a)', isHeader: false },
  '4Ab': { newNumber: '4 Option A (1)(b)', isHeader: false },
  '4Ac': { newNumber: '4 Option A (1)(c)', isHeader: false },
  '4Ac(2)': { newNumber: '4 Option A (2)', isHeader: true, description: 'Biking' },
  '4Aa_2': { newNumber: '4 Option A (2)(a)', isHeader: false },
  '4Ab_2': { newNumber: '4 Option A (2)(b)', isHeader: false },
  '4Ac_2': { newNumber: '4 Option A (2)(c)', isHeader: false },
  '4Ac(3)': { newNumber: '4 Option A (3)', isHeader: true, description: 'Running' },
  '4Aa_3': { newNumber: '4 Option A (3)(a)', isHeader: false },
  '4Ab_3': { newNumber: '4 Option A (3)(b)', isHeader: false },
  '4Ac_3': { newNumber: '4 Option A (3)(c)', isHeader: false },

  // Option B—Duathlon: Biking (1), Running (2)
  '4B(1)': { newNumber: '4 Option B (1)', isHeader: true, description: 'Biking' },
  '4Ba': { newNumber: '4 Option B (1)(a)', isHeader: false },
  '4Bb': { newNumber: '4 Option B (1)(b)', isHeader: false },
  '4Bc': { newNumber: '4 Option B (1)(c)', isHeader: false },
  '4Bc(2)': { newNumber: '4 Option B (2)', isHeader: true, description: 'Running' },
  '4Ba_2': { newNumber: '4 Option B (2)(a)', isHeader: false },
  '4Bb_2': { newNumber: '4 Option B (2)(b)', isHeader: false },
  '4Bc_2': { newNumber: '4 Option B (2)(c)', isHeader: false },

  // Option C—Aquathlon: Swimming (1), Running (2)
  '4C(1)': { newNumber: '4 Option C (1)', isHeader: true, description: 'Swimming' },
  '4Ca': { newNumber: '4 Option C (1)(a)', isHeader: false },
  '4Cb': { newNumber: '4 Option C (1)(b)', isHeader: false },
  '4Cc': { newNumber: '4 Option C (1)(c)', isHeader: false },
  '4Cc(2)': { newNumber: '4 Option C (2)', isHeader: true, description: 'Running' },
  '4Ca_2': { newNumber: '4 Option C (2)(a)', isHeader: false },
  '4Cb_2': { newNumber: '4 Option C (2)(b)', isHeader: false },
  '4Cc_2': { newNumber: '4 Option C (2)(c)', isHeader: false },

  // Option D—Aquabike: Swimming (1), Biking (2)
  '4D(1)': { newNumber: '4 Option D (1)', isHeader: true, description: 'Swimming' },
  '4Da': { newNumber: '4 Option D (1)(a)', isHeader: false },
  '4Db': { newNumber: '4 Option D (1)(b)', isHeader: false },
  '4Dc': { newNumber: '4 Option D (1)(c)', isHeader: false },
  '4Dc(2)': { newNumber: '4 Option D (2)', isHeader: true, description: 'Biking' },
  '4Da_2': { newNumber: '4 Option D (2)(a)', isHeader: false },
  '4Db_2': { newNumber: '4 Option D (2)(b)', isHeader: false },
  '4Dc_2': { newNumber: '4 Option D (2)(c)', isHeader: false },

  // Requirements 5-8
  '5': { newNumber: '5', isHeader: true },
  '5a': { newNumber: '5(a)', isHeader: false },
  '5b': { newNumber: '5(b)', isHeader: false },
  '5c': { newNumber: '5(c)', isHeader: false },
  '5d': { newNumber: '5(d)', isHeader: false },
  '6': { newNumber: '6', isHeader: false },
  '7': { newNumber: '7', isHeader: true },
  '7a': { newNumber: '7(a)', isHeader: false },
  '7b': { newNumber: '7(b)', isHeader: false },
  '7c': { newNumber: '7(c)', isHeader: false },
  '7d': { newNumber: '7(d)', isHeader: false },
  '8': { newNumber: '8', isHeader: true },
  '8a': { newNumber: '8(a)', isHeader: false },
  '8b': { newNumber: '8(b)', isHeader: false },
  '8c': { newNumber: '8(c)', isHeader: false },
  '8d': { newNumber: '8(d)', isHeader: false },
  '8e': { newNumber: '8(e)', isHeader: false },
}

// Option headers to insert (these don't exist in current data)
const optionHeaders = [
  { number: '4 Option A', description: 'Option A—Triathlon', displayOrder: 14 },
  { number: '4 Option B', description: 'Option B—Duathlon', displayOrder: 26 },
  { number: '4 Option C', description: 'Option C—Aquathlon', displayOrder: 34 },
  { number: '4 Option D', description: 'Option D—Aquabike', displayOrder: 42 },
]

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  console.log('='.repeat(60))
  console.log('FIX MULTISPORT 2026 REQUIREMENTS')
  console.log('='.repeat(60))
  console.log(dryRun ? 'DRY RUN - No changes will be made' : 'LIVE RUN - Changes will be applied')
  console.log('')

  // Get Multisport badge
  const { data: badge } = await supabase
    .from('bsa_merit_badges')
    .select('id')
    .eq('name', 'Multisport')
    .single()

  if (!badge) {
    console.error('Multisport badge not found')
    return
  }

  // Get all 2026 requirements
  const { data: reqs } = await supabase
    .from('bsa_merit_badge_requirements')
    .select('id, requirement_number, description, is_header, display_order')
    .eq('merit_badge_id', badge.id)
    .eq('version_year', 2026)
    .order('display_order')

  if (!reqs) {
    console.error('No requirements found')
    return
  }

  console.log(`Found ${reqs.length} requirements for Multisport 2026\n`)

  // Check which option headers already exist
  const existingNumbers = new Set(reqs.map(r => r.requirement_number))
  const headersToInsert = optionHeaders.filter(h => !existingNumbers.has(h.number))

  console.log(`Option headers to insert: ${headersToInsert.length}`)
  headersToInsert.forEach(h => console.log(`  + ${h.number}: "${h.description}"`))

  // Build update list
  const updates: Array<{
    id: string
    oldNumber: string
    newNumber: string
    isHeader: boolean
    description?: string
  }> = []
  const unmapped: string[] = []

  for (const req of reqs) {
    const mapping = requirementMapping[req.requirement_number]
    if (mapping) {
      const needsUpdate =
        mapping.newNumber !== req.requirement_number ||
        mapping.isHeader !== req.is_header ||
        (mapping.description && mapping.description !== req.description)

      if (needsUpdate) {
        updates.push({
          id: req.id,
          oldNumber: req.requirement_number,
          newNumber: mapping.newNumber,
          isHeader: mapping.isHeader,
          description: mapping.description,
        })
      }
    } else {
      unmapped.push(req.requirement_number)
    }
  }

  console.log(`\nUpdates to apply: ${updates.length}`)
  if (unmapped.length > 0) {
    console.log(`Unmapped: ${unmapped.length}`)
    unmapped.forEach(n => console.log(`  ? ${n}`))
  }

  console.log('\nRequirement number changes:')
  for (const u of updates) {
    const flags: string[] = []
    if (u.isHeader) flags.push('HEADER')
    if (u.description) flags.push(`desc="${u.description}"`)
    const flagStr = flags.length > 0 ? ` [${flags.join(', ')}]` : ''
    console.log(`  ${u.oldNumber.padEnd(12)} → ${u.newNumber}${flagStr}`)
  }

  if (dryRun) {
    console.log('\nDRY RUN - No changes made')
    return
  }

  // Insert option headers
  if (headersToInsert.length > 0) {
    console.log('\nInserting option headers...')
    for (const header of headersToInsert) {
      const { error } = await supabase.from('bsa_merit_badge_requirements').insert({
        merit_badge_id: badge.id,
        version_year: 2026,
        requirement_number: header.number,
        description: header.description,
        display_order: header.displayOrder,
        is_header: true,
        nesting_depth: 2,
      })
      if (error) {
        console.error(`  Failed to insert ${header.number}: ${error.message}`)
      } else {
        console.log(`  + ${header.number}: "${header.description}"`)
      }
    }
  }

  // Apply updates
  console.log('\nApplying updates...')
  let success = 0
  let failed = 0

  for (const u of updates) {
    const updateData: Record<string, unknown> = {
      requirement_number: u.newNumber,
      is_header: u.isHeader,
    }
    if (u.description) {
      updateData.description = u.description
    }

    const { error } = await supabase
      .from('bsa_merit_badge_requirements')
      .update(updateData)
      .eq('id', u.id)

    if (error) {
      console.error(`  Failed ${u.oldNumber}: ${error.message}`)
      failed++
    } else {
      success++
    }
  }

  console.log(`\nComplete: ${success} updated, ${failed} failed`)

  // Show final structure
  console.log('\n--- Final structure (requirement 4) ---')
  const { data: finalReqs } = await supabase
    .from('bsa_merit_badge_requirements')
    .select('requirement_number, description, is_header')
    .eq('merit_badge_id', badge.id)
    .eq('version_year', 2026)
    .like('requirement_number', '4%')
    .order('display_order')

  finalReqs?.forEach(r => {
    const h = r.is_header ? ' [H]' : ''
    console.log(`  ${r.requirement_number.padEnd(22)} ${r.description?.substring(0, 40)}...${h}`)
  })
}

main().catch(console.error)
