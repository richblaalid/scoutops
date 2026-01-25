#!/usr/bin/env npx tsx
/**
 * Fix All Wrong Parent Relationships
 *
 * Finds parenthetical sub-requirements (e.g., 4(1), 4(2)) that have wrong parent
 * relationships and fixes them.
 *
 * Pattern: If 4a has "discuss the following" or similar, then 4(1), 4(2) should
 * have 4a as their parent, not 4.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// Phrases that indicate a requirement is a header/intro
const HEADER_PHRASES = [
  'do the following',
  'discuss the following',
  'complete the following',
  'explain the following',
  'describe the following',
  'demonstrate the following',
  'do all of the following',
  'do each of the following',
  'answer the following',
  'identify the following',
  'do one of the following',
  'do two of the following',
  'do three of the following',
  'choose one of the following',
  'choose two of the following',
]

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

interface Badge {
  id: string
  name: string
}

interface Fix {
  badgeName: string
  versionYear: number
  reqId: string
  reqNumber: string
  currentParentNumber: string
  newParentNumber: string
  newParentId: string
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const badgeFilter = args.find(a => a.startsWith('--badge='))?.split('=')[1]
  const limit = args.find(a => a.startsWith('--limit='))?.split('=')[1]

  console.log('='.repeat(70))
  console.log('FIX ALL WRONG PARENT RELATIONSHIPS')
  console.log('='.repeat(70))
  console.log(dryRun ? 'DRY RUN - No changes will be made' : 'LIVE RUN - Changes will be applied')
  if (badgeFilter) console.log(`Badge filter: ${badgeFilter}`)
  if (limit) console.log(`Limit: ${limit}`)
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
    // Get all requirements for this badge
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
      const fixes = findFixes(badge.name, year, yearReqs)
      allFixes.push(...fixes)
    }
  }

  // Print summary
  console.log('='.repeat(70))
  console.log('SUMMARY')
  console.log('='.repeat(70))
  console.log('')

  if (allFixes.length === 0) {
    console.log('No wrong parent issues found!')
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
  console.log(`Badges affected: ${byBadge.size}`)
  console.log('')

  // Print details
  for (const [badgeKey, fixes] of Array.from(byBadge.entries()).sort()) {
    console.log(`${badgeKey}:`)
    for (const fix of fixes) {
      console.log(`  ${fix.reqNumber}: parent "${fix.currentParentNumber}" → "${fix.newParentNumber}"`)
    }
  }

  if (dryRun) {
    console.log('\nDRY RUN - No changes made')
    console.log('Run without --dry-run to apply fixes')
    return
  }

  // Apply fixes
  const fixesToApply = limit ? allFixes.slice(0, parseInt(limit)) : allFixes

  console.log(`\nApplying ${fixesToApply.length} fixes...`)
  let success = 0
  let failed = 0

  for (const fix of fixesToApply) {
    const { error } = await supabase
      .from('bsa_merit_badge_requirements')
      .update({ parent_requirement_id: fix.newParentId })
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

function findFixes(badgeName: string, year: number, reqs: Requirement[]): Fix[] {
  const fixes: Fix[] = []
  const reqMap = new Map(reqs.map(r => [r.id, r]))
  const reqByNumber = new Map(reqs.map(r => [r.requirement_number.toLowerCase(), r]))

  for (const req of reqs) {
    // Pattern: Parenthetical sub-requirement like 4(1), 4(2)
    const parenMatch = req.requirement_number.match(/^(\d+)\((\d+)\)$/)
    if (!parenMatch) continue

    const baseNum = parenMatch[1]

    // Find potential parent candidates (e.g., 4a, 4b for base 4)
    const potentialParents = reqs.filter(r => {
      const letterMatch = r.requirement_number.match(new RegExp(`^${baseNum}([a-z])$`, 'i'))
      if (letterMatch) {
        // Check if this looks like a header (has header phrase or is marked as header)
        const descLower = (r.description || '').toLowerCase()
        return r.is_header || HEADER_PHRASES.some(p => descLower.includes(p))
      }
      return false
    })

    if (potentialParents.length === 0) continue

    // The first potential parent (by display order) is likely the correct one
    const likelyParent = potentialParents.sort((a, b) => a.display_order - b.display_order)[0]

    // Check if current parent is wrong
    if (req.parent_requirement_id === likelyParent.id) continue

    const currentParent = req.parent_requirement_id ? reqMap.get(req.parent_requirement_id) : null
    const currentParentNum = currentParent?.requirement_number || '(none)'

    fixes.push({
      badgeName,
      versionYear: year,
      reqId: req.id,
      reqNumber: req.requirement_number,
      currentParentNumber: currentParentNum,
      newParentNumber: likelyParent.requirement_number,
      newParentId: likelyParent.id,
    })
  }

  return fixes
}

main().catch(console.error)
