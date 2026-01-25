#!/usr/bin/env npx tsx
/**
 * Fix Top-Level Header Markings
 *
 * Finds top-level requirements (1, 2, 3, etc.) that contain header phrases
 * like "do the following" but aren't marked as is_header=true, and fixes them.
 *
 * Only fixes requirements that:
 * 1. Are top-level (just a number, no letters)
 * 2. Contain a header phrase
 * 3. Have child requirements (lettered subs like 1a, 1b)
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
  console.log('FIX TOP-LEVEL HEADER MARKINGS')
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
    console.log('No missing top-level header markings found!')
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

  // Print details (grouped)
  const sortedBadges = Array.from(byBadge.entries()).sort()
  for (const [badgeKey, fixes] of sortedBadges) {
    const reqNums = fixes.map(f => f.reqNumber).join(', ')
    console.log(`${badgeKey}: ${reqNums}`)
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

    // Only consider top-level requirements (just numbers like 1, 2, 3)
    if (!/^\d+$/.test(req.requirement_number)) continue

    const baseNum = req.requirement_number
    const descLower = (req.description || '').toLowerCase()

    // Check for header phrases
    for (const phrase of HEADER_PHRASES) {
      if (descLower.includes(phrase)) {
        // Verify there are actually sub-requirements (lettered like 1a, 1b)
        const hasChildren = reqs.some(r => {
          return r.requirement_number.match(new RegExp(`^${baseNum}[a-z]`, 'i'))
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
