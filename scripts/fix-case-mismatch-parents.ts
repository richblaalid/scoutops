#!/usr/bin/env npx tsx
/**
 * Fix Case-Mismatch Parent Links
 *
 * Finds sub-requirements like 3A(1) where parent 3a exists (different case)
 * and links them properly.
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
}

interface Fix {
  badgeName: string
  versionYear: number
  childId: string
  childNumber: string
  parentId: string
  parentNumber: string
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const badgeFilter = args.find(a => a.startsWith('--badge='))?.split('=')[1]

  console.log('='.repeat(70))
  console.log('FIX CASE-MISMATCH PARENT LINKS')
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

  const allFixes: Fix[] = []

  for (const badge of badges) {
    const { data: reqs } = await supabase
      .from('bsa_merit_badge_requirements')
      .select('id, requirement_number, description, is_header, parent_requirement_id, display_order, merit_badge_id, version_year')
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
      const fixes = findCaseMismatches(badge.name, year, yearReqs)
      allFixes.push(...fixes)
    }
  }

  console.log('='.repeat(70))
  console.log('SUMMARY')
  console.log('='.repeat(70))
  console.log('')

  if (allFixes.length === 0) {
    console.log('No case-mismatch parent links found!')
    return
  }

  // Group by badge
  const byBadge = new Map<string, Fix[]>()
  for (const fix of allFixes) {
    const key = `${fix.badgeName} (${fix.versionYear})`
    if (!byBadge.has(key)) byBadge.set(key, [])
    byBadge.get(key)!.push(fix)
  }

  console.log(`Fixes needed: ${allFixes.length}`)
  console.log(`Badges affected: ${byBadge.size}`)
  console.log('')

  for (const [badgeKey, fixes] of Array.from(byBadge.entries()).sort()) {
    console.log(`${badgeKey}:`)
    for (const f of fixes) {
      console.log(`  ${f.childNumber} → parent "${f.parentNumber}"`)
    }
  }

  if (dryRun) {
    console.log('\nDRY RUN - No changes made')
    return
  }

  console.log(`\nApplying ${allFixes.length} fixes...`)
  let success = 0
  let failed = 0

  for (const fix of allFixes) {
    const { error } = await supabase
      .from('bsa_merit_badge_requirements')
      .update({ parent_requirement_id: fix.parentId })
      .eq('id', fix.childId)

    if (error) {
      console.error(`  FAILED: ${fix.childNumber} - ${error.message}`)
      failed++
    } else {
      success++
    }
  }

  console.log(`\nComplete: ${success} updated, ${failed} failed`)
}

function findCaseMismatches(badgeName: string, year: number, reqs: Requirement[]): Fix[] {
  const fixes: Fix[] = []

  // Build lookup maps with case normalization
  const reqByNumberUpper = new Map<string, Requirement>()
  for (const r of reqs) {
    reqByNumberUpper.set(r.requirement_number.toUpperCase(), r)
  }

  for (const req of reqs) {
    // Pattern 1: 3A(1) -> parent should be 3A or 3a
    const optionParenMatch = req.requirement_number.match(/^(\d+[A-Za-z])\((\d+)\)$/)
    if (optionParenMatch) {
      const expectedParentUpper = optionParenMatch[1].toUpperCase()
      const actualParent = reqByNumberUpper.get(expectedParentUpper)

      if (actualParent && actualParent.id !== req.id && req.parent_requirement_id !== actualParent.id) {
        fixes.push({
          badgeName,
          versionYear: year,
          childId: req.id,
          childNumber: req.requirement_number,
          parentId: actualParent.id,
          parentNumber: actualParent.requirement_number,
        })
      }
      continue
    }

    // Pattern 2: 3Aa -> parent should be 3A or 3a
    const optionLetterMatch = req.requirement_number.match(/^(\d+[A-Za-z])([a-z])$/)
    if (optionLetterMatch) {
      const expectedParentUpper = optionLetterMatch[1].toUpperCase()
      const actualParent = reqByNumberUpper.get(expectedParentUpper)

      if (actualParent && actualParent.id !== req.id && req.parent_requirement_id !== actualParent.id) {
        fixes.push({
          badgeName,
          versionYear: year,
          childId: req.id,
          childNumber: req.requirement_number,
          parentId: actualParent.id,
          parentNumber: actualParent.requirement_number,
        })
      }
    }
  }

  return fixes
}

main().catch(console.error)
