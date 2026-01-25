#!/usr/bin/env npx tsx
/**
 * Fix Orphaned Sub-Requirements
 *
 * Finds sub-requirements like 4A(1), 4B(1) where the parent 4A, 4B doesn't exist,
 * creates the missing parent headers, and links the children.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

interface Requirement {
  id: string
  requirement_number: string
  description: string
  is_header: boolean | null
  parent_requirement_id: string | null
  display_order: number
  merit_badge_id: string
  version_year: number
  nesting_depth: number | null
}

interface MissingParent {
  badgeId: string
  badgeName: string
  versionYear: number
  parentNumber: string
  children: Requirement[]
  displayOrder: number
  description: string
}

// Map Option letters to names when we can infer them
const OPTION_NAMES: Record<string, string> = {
  'A': 'Option A',
  'B': 'Option B',
  'C': 'Option C',
  'D': 'Option D',
  'E': 'Option E',
  'F': 'Option F',
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const badgeFilter = args.find(a => a.startsWith('--badge='))?.split('=')[1]

  console.log('='.repeat(70))
  console.log('FIX ORPHANED SUB-REQUIREMENTS')
  console.log('='.repeat(70))
  console.log(dryRun ? 'DRY RUN - No changes will be made' : 'LIVE RUN - Changes will be applied')
  if (badgeFilter) console.log(`Badge filter: ${badgeFilter}`)
  console.log('')

  // Get all badges
  let badgeQuery = supabase.from('bsa_merit_badges').select('id, name')
  if (badgeFilter) {
    badgeQuery = badgeQuery.ilike('name', `%${badgeFilter}%`)
  }
  const { data: badges } = await badgeQuery.order('name')

  if (!badges || badges.length === 0) {
    console.log('No badges found')
    return
  }

  console.log(`Scanning ${badges.length} badges...\n`)

  const allMissingParents: MissingParent[] = []

  for (const badge of badges) {
    // Get all requirements for this badge
    const { data: reqs } = await supabase
      .from('bsa_merit_badge_requirements')
      .select('id, requirement_number, description, is_header, parent_requirement_id, display_order, merit_badge_id, version_year, nesting_depth')
      .eq('merit_badge_id', badge.id)
      .order('version_year')
      .order('display_order')

    if (!reqs || reqs.length === 0) continue

    // Group by version year
    const byYear = new Map<number, Requirement[]>()
    for (const req of reqs) {
      const year = req.version_year || 0
      if (!byYear.has(year)) byYear.set(year, [])
      byYear.get(year)!.push(req as Requirement)
    }

    for (const [year, yearReqs] of byYear) {
      const missing = findMissingParents(badge.id, badge.name, year, yearReqs)
      allMissingParents.push(...missing)
    }
  }

  // Print summary
  console.log('='.repeat(70))
  console.log('SUMMARY')
  console.log('='.repeat(70))
  console.log('')

  if (allMissingParents.length === 0) {
    console.log('No missing parents found!')
    return
  }

  // Group by badge
  const byBadge = new Map<string, MissingParent[]>()
  for (const mp of allMissingParents) {
    const key = `${mp.badgeName} (${mp.versionYear})`
    if (!byBadge.has(key)) byBadge.set(key, [])
    byBadge.get(key)!.push(mp)
  }

  console.log(`Missing parents to create: ${allMissingParents.length}`)
  console.log(`Badges affected: ${byBadge.size}`)
  console.log('')

  // Print details
  for (const [badgeKey, parents] of Array.from(byBadge.entries()).sort()) {
    console.log(`${badgeKey}:`)
    for (const p of parents) {
      console.log(`  + ${p.parentNumber}: "${p.description}" (${p.children.length} children)`)
    }
  }

  if (dryRun) {
    console.log('\nDRY RUN - No changes made')
    console.log('Run without --dry-run to apply fixes')
    return
  }

  // Apply fixes - create missing parents and link children
  console.log(`\nCreating ${allMissingParents.length} missing parent requirements...`)
  let created = 0
  let linked = 0
  let failed = 0

  for (const mp of allMissingParents) {
    // Find the parent of the Option (e.g., for "4A", find "4")
    const baseMatch = mp.parentNumber.match(/^(\d+)/)
    let grandparentId: string | null = null

    if (baseMatch) {
      const { data: grandparent } = await supabase
        .from('bsa_merit_badge_requirements')
        .select('id')
        .eq('merit_badge_id', mp.badgeId)
        .eq('version_year', mp.versionYear)
        .eq('requirement_number', baseMatch[1])
        .single()

      grandparentId = grandparent?.id || null
    }

    // Insert the missing parent
    const { data: newParent, error: insertError } = await supabase
      .from('bsa_merit_badge_requirements')
      .insert({
        merit_badge_id: mp.badgeId,
        version_year: mp.versionYear,
        requirement_number: mp.parentNumber,
        description: mp.description,
        display_order: mp.displayOrder,
        is_header: true,
        parent_requirement_id: grandparentId,
        nesting_depth: grandparentId ? 2 : 1,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error(`  FAILED to create ${mp.badgeName} ${mp.versionYear} ${mp.parentNumber}: ${insertError.message}`)
      failed++
      continue
    }

    created++

    // Link children to the new parent
    for (const child of mp.children) {
      const { error: updateError } = await supabase
        .from('bsa_merit_badge_requirements')
        .update({ parent_requirement_id: newParent.id })
        .eq('id', child.id)

      if (updateError) {
        console.error(`  FAILED to link ${child.requirement_number}: ${updateError.message}`)
        failed++
      } else {
        linked++
      }
    }
  }

  console.log(`\nComplete: ${created} parents created, ${linked} children linked, ${failed} failures`)
}

function findMissingParents(badgeId: string, badgeName: string, year: number, reqs: Requirement[]): MissingParent[] {
  const missing: MissingParent[] = []
  // Track both exact and uppercase versions for case-insensitive matching
  const existingNumbersUpper = new Set(reqs.map(r => r.requirement_number.toUpperCase()))
  const reqByNumberUpper = new Map(reqs.map(r => [r.requirement_number.toUpperCase(), r]))

  // Group potential orphans by their expected parent
  const orphansByParent = new Map<string, Requirement[]>()

  for (const req of reqs) {
    // Pattern 1: 4A(1), 4A(2) -> parent should be 4A
    const optionParenMatch = req.requirement_number.match(/^(\d+[A-Z])\((\d+)\)$/i)
    if (optionParenMatch) {
      const expectedParent = optionParenMatch[1].toUpperCase()
      if (!existingNumbers.has(expectedParent)) {
        if (!orphansByParent.has(expectedParent)) orphansByParent.set(expectedParent, [])
        orphansByParent.get(expectedParent)!.push(req)
      }
      continue
    }

    // Pattern 2: 4Aa, 4Ab -> parent should be 4A (if 4A doesn't exist)
    const optionLetterMatch = req.requirement_number.match(/^(\d+[A-Z])([a-z])$/i)
    if (optionLetterMatch) {
      const expectedParent = optionLetterMatch[1].toUpperCase()
      if (!existingNumbers.has(expectedParent)) {
        if (!orphansByParent.has(expectedParent)) orphansByParent.set(expectedParent, [])
        orphansByParent.get(expectedParent)!.push(req)
      }
      continue
    }

    // Pattern 3: 4Aa(1) -> parent should be 4Aa, but if 4Aa doesn't exist, need 4A first
    const deepMatch = req.requirement_number.match(/^(\d+[A-Z][a-z])\((\d+)\)$/i)
    if (deepMatch) {
      const expectedParent = deepMatch[1]
      const normalizedParent = expectedParent.charAt(0) + expectedParent.slice(1, -1).toUpperCase() + expectedParent.slice(-1).toLowerCase()
      if (!existingNumbers.has(normalizedParent.toUpperCase()) && !existingNumbers.has(normalizedParent)) {
        // The immediate parent doesn't exist - but we might need the Option parent first
        const optionParent = expectedParent.slice(0, -1).toUpperCase()
        if (!existingNumbers.has(optionParent)) {
          if (!orphansByParent.has(optionParent)) orphansByParent.set(optionParent, [])
          // Don't add this child directly - it needs the intermediate parent
        }
      }
    }
  }

  // Create missing parent entries
  for (const [parentNumber, children] of orphansByParent) {
    if (children.length === 0) continue

    // Calculate display_order (same as first child - will sort by requirement_number)
    const firstChild = children.sort((a, b) => a.display_order - b.display_order)[0]
    const displayOrder = firstChild.display_order

    // Generate description
    const optionMatch = parentNumber.match(/^(\d+)([A-Z])$/i)
    let description = parentNumber
    if (optionMatch) {
      const optionLetter = optionMatch[2].toUpperCase()
      description = OPTION_NAMES[optionLetter] || `Option ${optionLetter}`
    }

    missing.push({
      badgeId,
      badgeName,
      versionYear: year,
      parentNumber,
      children,
      displayOrder,
      description,
    })
  }

  return missing
}

main().catch(console.error)
