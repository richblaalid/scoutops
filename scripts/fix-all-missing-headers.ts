#!/usr/bin/env npx tsx
/**
 * Fix All Missing Header Markings
 *
 * Finds requirements that contain header phrases (like "do the following")
 * but are not marked as is_header=true, and fixes them.
 *
 * Only fixes requirements that:
 * 1. Have lettered format (e.g., 4a, 5b) - not top-level numbers
 * 2. Contain a header phrase
 * 3. Have child requirements (parenthetical subs)
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
  display_order: number
  merit_badge_id: string
  version_year: number
}

interface Fix {
  badgeName: string
  versionYear: number
  reqId: string
  reqNumber: string
  phrase: string
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const badgeFilter = args.find(a => a.startsWith('--badge='))?.split('=')[1]

  console.log('='.repeat(70))
  console.log('FIX ALL MISSING HEADER MARKINGS')
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
    // Get all requirements for this badge
    const { data: reqs } = await supabase
      .from('bsa_merit_badge_requirements')
      .select('id, requirement_number, description, is_header, display_order, merit_badge_id, version_year')
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
    console.log('No missing header markings found!')
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
      console.log(`  ${fix.reqNumber}: should be header ("${fix.phrase}")`)
    }
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
      .update({ is_header: true })
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

  for (const req of reqs) {
    // Skip if already marked as header
    if (req.is_header) continue

    // Only consider lettered requirements (4a, 5b, etc.) - not top-level
    // This avoids false positives on requirements like "1" or "2"
    const letterMatch = req.requirement_number.match(/^(\d+)([a-z])$/i)
    if (!letterMatch) continue

    const baseNum = letterMatch[1]
    const descLower = (req.description || '').toLowerCase()

    // Check for header phrases
    for (const phrase of HEADER_PHRASES) {
      if (descLower.includes(phrase)) {
        // Verify there are actually sub-requirements that would be children
        // Look for patterns like 4(1), 4(2) or 4a(1), 4a(2)
        const hasChildren = reqs.some(r => {
          return r.requirement_number.match(new RegExp(`^${baseNum}\\(\\d+\\)$`)) ||
                 r.requirement_number.match(new RegExp(`^${req.requirement_number}\\(\\d+\\)$`, 'i'))
        })

        if (hasChildren) {
          fixes.push({
            badgeName,
            versionYear: year,
            reqId: req.id,
            reqNumber: req.requirement_number,
            phrase,
          })
          break
        }
      }
    }
  }

  return fixes
}

main().catch(console.error)
