/**
 * Merge CSV Requirement IDs with Scraped UI Data
 *
 * This script merges:
 * - Authoritative requirement IDs from Scoutbook Achievement CSV
 * - Visual hierarchy, descriptions, and links from scraped UI
 *
 * The merge logic:
 * - Items in CSV = completable requirements (use CSV ID as scoutbook_id)
 * - Items in UI without CSV match = headers (non-completable)
 * - Parent-child relationships built from visual depth
 *
 * Usage:
 *   npx tsx scripts/merge-csv-with-ui.ts
 *
 * Inputs:
 *   - data/csv-requirement-ids.json (from parse-achievement-csv.ts)
 *   - data/merit-badge-requirements-scraped.json (from scrape-all-merit-badges.ts)
 *
 * Outputs:
 *   - data/bsa-data-canonical-new.json (merged canonical file)
 *   - data/discrepancy-report.json (flagged items for review)
 */

import * as fs from 'fs'

// ============================================
// Types
// ============================================

// Input: CSV data
interface CsvBadgeVersion {
  badgeName: string
  versionYear: number
  requirementIds: string[]
  totalOccurrences: number
}

interface CsvData {
  generatedAt: string
  csvPath: string
  totalRows: number
  meritBadgeRequirementRows: number
  uniqueBadgeVersions: number
  uniqueBadges: number
  badges: CsvBadgeVersion[]
}

// Input: Scraped UI data
interface ScrapedLink {
  url: string
  text: string
  context: string
  type: 'pamphlet' | 'worksheet' | 'video' | 'external'
}

interface ScrapedRequirement {
  id: string
  displayLabel: string
  description: string
  parentNumber: string | null
  depth: number
  visualDepth: number
  isHeader?: boolean
  hasCheckbox: boolean
  links: ScrapedLink[]
  rawHtml?: string
}

interface ScrapedBadgeVersion {
  badgeName: string
  badgeSlug: string
  versionYear: number
  versionLabel: string
  requirements: ScrapedRequirement[]
  scrapedAt: string
  totalLinks: number
  totalCheckboxes: number
  maxDepth: number
}

interface ScrapedData {
  totalBadges: number
  completedBadges: number
  badges: ScrapedBadgeVersion[]
  errors: string[]
  startedAt: string
  lastUpdatedAt: string
}

// Output: Canonical format
interface RequirementLink {
  url: string
  text: string
  type: 'pamphlet' | 'worksheet' | 'video' | 'external'
}

interface CanonicalRequirement {
  scoutbook_id: string
  requirement_number: string
  description: string
  is_header: boolean
  display_order: number
  parent_scoutbook_id: string | null
  links: RequirementLink[]
  children: CanonicalRequirement[]
}

interface CanonicalVersion {
  version_year: number
  requirements: CanonicalRequirement[]
}

interface CanonicalBadge {
  code: string
  name: string
  category: string | null
  is_eagle_required: boolean
  is_active: boolean
  versions: CanonicalVersion[]
}

interface CanonicalOutput {
  generated_at: string
  source: string
  merit_badges: CanonicalBadge[]
}

// Discrepancy types
interface Discrepancy {
  type: 'csv_not_in_ui' | 'ui_not_matched' | 'badge_not_accessible' | 'ambiguous_match' | 'version_mismatch'
  badgeName: string
  versionYear: number
  scoutbookId?: string
  uiLabel?: string
  description: string
  suggestedAction: string
}

interface DiscrepancyReport {
  generated_at: string
  total_discrepancies: number
  by_type: Record<string, number>
  discrepancies: Discrepancy[]
}

// ============================================
// Utilities
// ============================================

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

// Normalize requirement ID for comparison
// Handles variations like "1a" vs "1(a)" vs "1a."
function normalizeId(id: string): string {
  return id
    .replace(/[()[\]]/g, '') // Remove parentheses and brackets
    .replace(/\.$/, '')       // Remove trailing dot
    .replace(/\s+/g, ' ')     // Normalize whitespace
    .trim()
    .toLowerCase()
}

// Check if two IDs match (accounting for format variations)
function idsMatch(csvId: string, uiLabel: string): boolean {
  const normCsv = normalizeId(csvId)
  const normUi = normalizeId(uiLabel)

  // Direct match
  if (normCsv === normUi) return true

  // Check if CSV ID contains the UI label (for complex IDs like "4a1 Triathlon Option")
  if (normCsv.includes(normUi) && normUi.length > 0) return true

  return false
}

// Build parent-child hierarchy from flat list using visual depth
function buildHierarchy(
  requirements: Array<{
    scoutbook_id: string
    requirement_number: string
    description: string
    is_header: boolean
    display_order: number
    visualDepth: number
    links: RequirementLink[]
  }>
): CanonicalRequirement[] {
  const result: CanonicalRequirement[] = []
  const stack: { req: CanonicalRequirement; depth: number }[] = []

  for (const req of requirements) {
    const canonReq: CanonicalRequirement = {
      scoutbook_id: req.scoutbook_id,
      requirement_number: req.requirement_number,
      description: req.description,
      is_header: req.is_header,
      display_order: req.display_order,
      parent_scoutbook_id: null,
      links: req.links,
      children: [],
    }

    // Pop items from stack that are at same or deeper level
    while (stack.length > 0 && stack[stack.length - 1].depth >= req.visualDepth) {
      stack.pop()
    }

    if (stack.length === 0) {
      // This is a root-level item
      result.push(canonReq)
    } else {
      // This is a child of the last item on the stack
      const parent = stack[stack.length - 1].req
      canonReq.parent_scoutbook_id = parent.scoutbook_id
      parent.children.push(canonReq)
    }

    // Push this item onto the stack
    stack.push({ req: canonReq, depth: req.visualDepth })
  }

  return result
}

// ============================================
// Main Merge Logic
// ============================================

function mergeBadgeVersion(
  csvVersion: CsvBadgeVersion,
  scrapedVersion: ScrapedBadgeVersion | undefined,
  discrepancies: Discrepancy[]
): CanonicalVersion {
  const { badgeName, versionYear, requirementIds } = csvVersion

  // If no scraped data, create minimal version from CSV
  if (!scrapedVersion) {
    discrepancies.push({
      type: 'badge_not_accessible',
      badgeName,
      versionYear,
      description: `No scraped UI data found for ${badgeName} version ${versionYear}`,
      suggestedAction: 'Run scraper on this badge version',
    })

    // Create requirements from CSV IDs only (no hierarchy)
    const requirements: CanonicalRequirement[] = requirementIds.map((id, idx) => ({
      scoutbook_id: id,
      requirement_number: id,
      description: '', // No description without UI data
      is_header: false,
      display_order: idx,
      parent_scoutbook_id: null,
      links: [],
      children: [],
    }))

    return { version_year: versionYear, requirements }
  }

  // Create a set of CSV IDs for quick lookup
  const csvIdSet = new Set(requirementIds.map(normalizeId))
  const matchedCsvIds = new Set<string>()

  // Process scraped requirements
  const processedReqs: Array<{
    scoutbook_id: string
    requirement_number: string
    description: string
    is_header: boolean
    display_order: number
    visualDepth: number
    links: RequirementLink[]
  }> = []

  for (let i = 0; i < scrapedVersion.requirements.length; i++) {
    const scraped = scrapedVersion.requirements[i]

    // Try to match to CSV ID
    let matchedCsvId: string | null = null

    if (scraped.displayLabel) {
      // Look for exact or fuzzy match in CSV IDs
      for (const csvId of requirementIds) {
        if (idsMatch(csvId, scraped.displayLabel)) {
          matchedCsvId = csvId
          matchedCsvIds.add(normalizeId(csvId))
          break
        }
      }
    }

    // Determine if this is a header
    // A header is: no checkbox, OR no CSV match, OR explicitly marked
    const isHeader = !scraped.hasCheckbox || !matchedCsvId || scraped.isHeader === true

    // Generate scoutbook_id
    let scoutbookId: string
    if (matchedCsvId) {
      scoutbookId = matchedCsvId
    } else if (scraped.displayLabel) {
      // Use display label for unmatched items (likely headers)
      scoutbookId = `header_${scraped.parentNumber || '0'}_${scraped.displayLabel || i}`
    } else {
      // Pure header with no label
      scoutbookId = `header_${scraped.parentNumber || '0'}_${i}`
    }

    processedReqs.push({
      scoutbook_id: scoutbookId,
      requirement_number: scraped.displayLabel || '',
      description: scraped.description,
      is_header: isHeader,
      display_order: i,
      visualDepth: scraped.visualDepth,
      links: scraped.links.map(l => ({
        url: l.url,
        text: l.text,
        type: l.type,
      })),
    })
  }

  // Check for CSV IDs not found in UI
  for (const csvId of requirementIds) {
    if (!matchedCsvIds.has(normalizeId(csvId))) {
      discrepancies.push({
        type: 'csv_not_in_ui',
        badgeName,
        versionYear,
        scoutbookId: csvId,
        description: `CSV requirement ID "${csvId}" not found in scraped UI`,
        suggestedAction: 'Verify badge was fully expanded during scrape, or ID format mismatch',
      })
    }
  }

  // Build hierarchy from processed requirements
  const requirements = buildHierarchy(processedReqs)

  return { version_year: versionYear, requirements }
}

function merge(csvData: CsvData, scrapedData: ScrapedData | null): {
  canonical: CanonicalOutput
  discrepancies: DiscrepancyReport
} {
  const discrepancies: Discrepancy[] = []

  // Group scraped versions by badge name and year for quick lookup
  const scrapedMap = new Map<string, ScrapedBadgeVersion>()
  if (scrapedData) {
    for (const badge of scrapedData.badges) {
      const key = `${badge.badgeName.toLowerCase()}:${badge.versionYear}`
      scrapedMap.set(key, badge)
    }
  }

  // Group CSV versions by badge name
  const badgeMap = new Map<string, CsvBadgeVersion[]>()
  for (const version of csvData.badges) {
    const key = version.badgeName.toLowerCase()
    if (!badgeMap.has(key)) {
      badgeMap.set(key, [])
    }
    badgeMap.get(key)!.push(version)
  }

  // Process each badge
  const meritBadges: CanonicalBadge[] = []

  for (const [badgeKey, versions] of Array.from(badgeMap.entries())) {
    const badgeName = versions[0].badgeName

    // Process each version
    const canonicalVersions: CanonicalVersion[] = []

    for (const csvVersion of versions) {
      const scrapedKey = `${badgeName.toLowerCase()}:${csvVersion.versionYear}`
      const scrapedVersion = scrapedMap.get(scrapedKey)

      const canonicalVersion = mergeBadgeVersion(csvVersion, scrapedVersion, discrepancies)
      canonicalVersions.push(canonicalVersion)
    }

    // Sort versions by year (newest first)
    canonicalVersions.sort((a, b) => b.version_year - a.version_year)

    meritBadges.push({
      code: slugify(badgeName),
      name: badgeName,
      category: null, // Would need additional data source
      is_eagle_required: isEagleRequired(badgeName),
      is_active: true,
      versions: canonicalVersions,
    })
  }

  // Sort badges alphabetically
  meritBadges.sort((a, b) => a.name.localeCompare(b.name))

  // Build discrepancy report
  const byType: Record<string, number> = {}
  for (const d of discrepancies) {
    byType[d.type] = (byType[d.type] || 0) + 1
  }

  return {
    canonical: {
      generated_at: new Date().toISOString(),
      source: 'merge-csv-with-ui.ts',
      merit_badges: meritBadges,
    },
    discrepancies: {
      generated_at: new Date().toISOString(),
      total_discrepancies: discrepancies.length,
      by_type: byType,
      discrepancies,
    },
  }
}

// Eagle required badges
function isEagleRequired(badgeName: string): boolean {
  const eagleRequired = [
    'Camping',
    'Citizenship in the Community',
    'Citizenship in the Nation',
    'Citizenship in the World',
    'Communication',
    'Cooking',
    'Cycling', // or Hiking or Swimming
    'Emergency Preparedness', // or Lifesaving
    'Environmental Science', // or Sustainability
    'Family Life',
    'First Aid',
    'Hiking', // or Cycling or Swimming
    'Lifesaving', // or Emergency Preparedness
    'Personal Fitness',
    'Personal Management',
    'Swimming', // or Cycling or Hiking
    'Sustainability', // or Environmental Science
  ]
  return eagleRequired.some(name => badgeName.toLowerCase() === name.toLowerCase())
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('='.repeat(60))
  console.log('Merit Badge Data Merge')
  console.log('='.repeat(60))
  console.log('')

  // Load CSV data
  const csvPath = 'data/csv-requirement-ids.json'
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV data not found: ${csvPath}`)
    console.error('Run: npx tsx scripts/parse-achievement-csv.ts')
    process.exit(1)
  }

  console.log(`Loading CSV data from ${csvPath}...`)
  const csvData: CsvData = JSON.parse(fs.readFileSync(csvPath, 'utf-8'))
  console.log(`  ${csvData.uniqueBadges} badges, ${csvData.uniqueBadgeVersions} versions`)

  // Load scraped UI data (optional)
  const scrapedPath = 'data/merit-badge-requirements-scraped.json'
  let scrapedData: ScrapedData | null = null

  if (fs.existsSync(scrapedPath)) {
    console.log(`Loading scraped UI data from ${scrapedPath}...`)
    scrapedData = JSON.parse(fs.readFileSync(scrapedPath, 'utf-8'))
    console.log(`  ${scrapedData!.badges.length} badge versions scraped`)
  } else {
    console.log('')
    console.log('WARNING: No scraped UI data found!')
    console.log(`Expected: ${scrapedPath}`)
    console.log('Run: npx tsx scripts/scrape-all-merit-badges.ts')
    console.log('')
    console.log('Proceeding with CSV-only merge (no descriptions or hierarchy)...')
    console.log('')
  }

  // Perform merge
  console.log('')
  console.log('Merging data...')
  const { canonical, discrepancies } = merge(csvData, scrapedData)

  // Summary
  console.log('')
  console.log('='.repeat(60))
  console.log('MERGE COMPLETE')
  console.log('='.repeat(60))
  console.log(`Total badges: ${canonical.merit_badges.length}`)
  console.log(`Total versions: ${canonical.merit_badges.reduce((sum, b) => sum + b.versions.length, 0)}`)
  console.log(`Total requirements: ${canonical.merit_badges.reduce((sum, b) =>
    sum + b.versions.reduce((vsum, v) => vsum + countRequirements(v.requirements), 0), 0)}`)

  console.log('')
  console.log('Discrepancies:')
  console.log(`  Total: ${discrepancies.total_discrepancies}`)
  for (const [type, count] of Object.entries(discrepancies.by_type)) {
    console.log(`  ${type}: ${count}`)
  }

  // Save outputs
  const canonicalPath = 'data/bsa-data-canonical-new.json'
  fs.writeFileSync(canonicalPath, JSON.stringify(canonical, null, 2))
  console.log(``)
  console.log(`Canonical output: ${canonicalPath}`)

  const discrepancyPath = 'data/discrepancy-report.json'
  fs.writeFileSync(discrepancyPath, JSON.stringify(discrepancies, null, 2))
  console.log(`Discrepancy report: ${discrepancyPath}`)

  // Show sample discrepancies
  if (discrepancies.discrepancies.length > 0) {
    console.log('')
    console.log('Sample discrepancies:')
    discrepancies.discrepancies.slice(0, 5).forEach((d, i) => {
      console.log(`  ${i + 1}. [${d.type}] ${d.badgeName} v${d.versionYear}: ${d.description}`)
    })
    if (discrepancies.discrepancies.length > 5) {
      console.log(`  ... and ${discrepancies.discrepancies.length - 5} more`)
    }
  }
}

function countRequirements(reqs: CanonicalRequirement[]): number {
  let count = reqs.length
  for (const req of reqs) {
    count += countRequirements(req.children)
  }
  return count
}

main().catch(console.error)
