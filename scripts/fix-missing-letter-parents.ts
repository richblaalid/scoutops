#!/usr/bin/env npx tsx
/**
 * Fix Missing Parent Relationships for Lettered Requirements
 *
 * Links lettered requirements (1a, 2b, 3c, etc.) to their numbered parents (1, 2, 3)
 * when the parent relationship is missing.
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
  parent_requirement_id: string | null
  merit_badge_id: string
  version_year: number
}

interface Fix {
  badgeName: string
  versionYear: number
  reqId: string
  reqNumber: string
  parentNumber: string
  parentId: string
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const badgeFilter = args.find(a => a.startsWith('--badge='))?.split('=')[1]

  console.log('='.repeat(70))
  console.log('FIX MISSING PARENT RELATIONSHIPS FOR LETTERED REQUIREMENTS')
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
      .select('id, requirement_number, parent_requirement_id, merit_badge_id, version_year')
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
      const fixes = findMissingParents(badge.name, year, yearReqs)
      allFixes.push(...fixes)
    }
  }

  console.log('='.repeat(70))
  console.log('SUMMARY')
  console.log('='.repeat(70))
  console.log('')

  if (allFixes.length === 0) {
    console.log('No missing parent relationships found!')
    return
  }

  // Group by badge
  const byBadge = new Map<string, Fix[]>()
  for (const fix of allFixes) {
    const key = `${fix.badgeName} (${fix.versionYear})`
    if (!byBadge.has(key)) byBadge.set(key, [])
    byBadge.get(key)!.push(fix)
  }

  console.log(`Total fixes needed: ${allFixes.length}`)
  console.log(`Badge versions affected: ${byBadge.size}`)
  console.log('')

  // Print summary by badge (condensed)
  for (const [badgeKey, fixes] of Array.from(byBadge.entries()).sort()) {
    const reqNums = fixes.map(f => f.reqNumber).join(', ')
    console.log(`${badgeKey}: ${fixes.length} fixes`)
  }

  if (dryRun) {
    console.log('\nDRY RUN - No changes made')
    console.log('Run without --dry-run to apply fixes')
    return
  }

  // Apply fixes
  console.log(`\nApplying ${allFixes.length} fixes...`)
  let success = 0
  let failed = 0

  for (const fix of allFixes) {
    const { error } = await supabase
      .from('bsa_merit_badge_requirements')
      .update({ parent_requirement_id: fix.parentId })
      .eq('id', fix.reqId)

    if (error) {
      console.error(`  FAILED: ${fix.badgeName} ${fix.versionYear} ${fix.reqNumber} - ${error.message}`)
      failed++
    } else {
      success++
    }
  }

  console.log(`\nComplete: ${success} updated, ${failed} failed`)
}

function findMissingParents(badgeName: string, year: number, reqs: Requirement[]): Fix[] {
  const fixes: Fix[] = []
  const reqByNumber = new Map(reqs.map(r => [r.requirement_number, r]))

  for (const req of reqs) {
    // Skip if already has a parent
    if (req.parent_requirement_id) continue

    // Match simple lettered requirements: 1a, 2b, 3c, etc.
    const match = req.requirement_number.match(/^(\d+)([a-z])$/i)
    if (!match) continue

    const parentNumber = match[1]
    const parent = reqByNumber.get(parentNumber)

    if (parent) {
      fixes.push({
        badgeName,
        versionYear: year,
        reqId: req.id,
        reqNumber: req.requirement_number,
        parentNumber,
        parentId: parent.id,
      })
    }
  }

  return fixes
}

main().catch(console.error)
