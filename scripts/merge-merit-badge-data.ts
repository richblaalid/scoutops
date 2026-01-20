/**
 * Merge Merit Badge Data
 *
 * Combines the existing 2025 requirements data with the 2026 scraped data
 * (images, pamphlet URLs) to create a comprehensive data file.
 *
 * Run with: npx tsx scripts/merge-merit-badge-data.ts
 */

import * as fs from 'fs'
import * as path from 'path'

const DATA_DIR = path.join(__dirname, '../data')
const MB_DIR = path.join(DATA_DIR, 'merit-badges')

interface ScrapedBadge {
  name: string
  slug: string
  url: string
  imageUrl: string | null
  imageFilename: string | null
  pamphletUrl: string | null
  isEagleRequired: boolean
  requirements?: string
  scrapedAt?: string
}

interface OldRequirement {
  number: string
  description: string
}

interface OldBadge {
  code: string
  name: string
  is_eagle_required: boolean
  category: string
  description: string
  requirements: OldRequirement[]
}

interface OldData {
  version_year: number
  effective_date: string
  merit_badges: OldBadge[]
}

interface MergedRequirement {
  number: string
  description: string
}

interface MergedBadge {
  code: string
  name: string
  is_eagle_required: boolean
  category: string
  description: string
  image_url: string
  pamphlet_url: string
  scouting_org_url: string
  requirements: MergedRequirement[]
}

interface MergedData {
  version_year: number
  effective_date: string
  source: string
  total_badges: number
  merit_badges: MergedBadge[]
}

// Normalize badge code from slug or name
function normalizeCode(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/-/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

// Map from scraped slug to old code format
const slugToCodeMap: Record<string, string> = {
  'american-indian-culture': 'indian_lore',
  'citizenship-in-the-community': 'citizenship_community',
  'citizenship-in-the-nation': 'citizenship_nation',
  'citizenship-in-the-world': 'citizenship_world',
  'citizenship-in-society': 'citizenship_society',
  'fish-wildlife-management': 'fish_wildlife',
  'signs-signals-and-codes': 'signs_signals_codes',
  'small-boat-sailing': 'small_boat_sailing',
  'soil-and-water-conservation': 'soil_water_conservation',
  'reptile-and-amphibian-study': 'reptile_amphibian',
  'model-design-and-building': 'model_design',
  'pulp-and-paper': 'pulp_paper',
  'health-care-professions': 'health_care',
  'mining-in-society': 'mining',
}

// Category mapping from scraped data to existing categories
const categoryMap: Record<string, string> = {
  'Aquatics': 'Aquatics',
  'Arts & Hobbies': 'Arts & Hobbies',
  'Building & Construction': 'Trades & Skills',
  'Business & Finance': 'Life Skills',
  'Citizenship & Society': 'Citizenship',
  'Communication': 'Life Skills',
  'Health & Safety': 'Health & Safety',
  'Nature & Environment': 'Nature',
  'Outdoor Skills': 'Outdoor Skills',
  'Safety': 'Health & Safety',
  'Science & Technology': 'Science & Technology',
  'Sports & Fitness': 'Sports',
  'Trades & Skills': 'Trades & Skills',
}

function main() {
  // Load scraped data
  const scrapedDataPath = path.join(MB_DIR, 'merit-badges-full.json')
  const scrapedBadges: ScrapedBadge[] = JSON.parse(fs.readFileSync(scrapedDataPath, 'utf-8'))
  console.log(`Loaded ${scrapedBadges.length} scraped badges`)

  // Load reference data (2026)
  const refDataPath = path.join(MB_DIR, 'merit-badges-2026.json')
  const refData = JSON.parse(fs.readFileSync(refDataPath, 'utf-8'))
  console.log(`Loaded ${refData.badges.length} reference badges`)

  // Load old requirements data
  const oldDataPath = path.join(DATA_DIR, 'merit-badges-2025.json')
  const oldData: OldData = JSON.parse(fs.readFileSync(oldDataPath, 'utf-8'))
  console.log(`Loaded ${oldData.merit_badges.length} old badges with requirements`)

  // Create lookup maps
  const scrapedBySlug = new Map<string, ScrapedBadge>()
  for (const badge of scrapedBadges) {
    scrapedBySlug.set(badge.slug, badge)
  }

  const refBySlug = new Map<string, any>()
  for (const badge of refData.badges) {
    refBySlug.set(badge.slug, badge)
  }

  const oldByCode = new Map<string, OldBadge>()
  for (const badge of oldData.merit_badges) {
    oldByCode.set(badge.code, badge)
  }

  // Merge data
  const mergedBadges: MergedBadge[] = []
  const missingRequirements: string[] = []

  for (const refBadge of refData.badges) {
    const slug = refBadge.slug
    const scraped = scrapedBySlug.get(slug)

    // Find matching old badge by trying various code formats
    const possibleCodes = [
      normalizeCode(slug),
      slugToCodeMap[slug],
      normalizeCode(refBadge.name),
    ].filter(Boolean)

    let oldBadge: OldBadge | undefined
    for (const code of possibleCodes) {
      oldBadge = oldByCode.get(code!)
      if (oldBadge) break
    }

    // Build merged badge
    const merged: MergedBadge = {
      code: normalizeCode(slug),
      name: refBadge.name,
      is_eagle_required: refBadge.isEagleRequired,
      category: categoryMap[refBadge.category] || refBadge.category,
      description: oldBadge?.description || `Learn about ${refBadge.name.toLowerCase()} through hands-on activities and skill development.`,
      image_url: `/data/merit-badges/images/${slug}.png`,
      pamphlet_url: refBadge.pamphletUrl || scraped?.pamphletUrl || `https://filestore.scouting.org/filestore/Merit_Badge_ReqandRes/Pamphlets/${encodeURIComponent(refBadge.name)}.pdf`,
      scouting_org_url: refBadge.url,
      requirements: [],
    }

    // Use old requirements if available, otherwise parse from scraped
    if (oldBadge?.requirements) {
      merged.requirements = oldBadge.requirements
    } else if (scraped?.requirements) {
      // Parse requirements from scraped text (basic parsing)
      const reqText = scraped.requirements
      const reqLines = reqText.split(/\n(?=\d+\.)/)
      merged.requirements = reqLines
        .filter(line => /^\d+\./.test(line.trim()))
        .map(line => {
          const match = line.match(/^(\d+[a-z]?)\.?\s*([\s\S]+)/)
          if (match) {
            return {
              number: match[1],
              description: match[2].trim().replace(/\n+/g, ' ').substring(0, 2000)
            }
          }
          return null
        })
        .filter((r): r is MergedRequirement => r !== null)

      if (merged.requirements.length === 0) {
        missingRequirements.push(refBadge.name)
      }
    } else {
      missingRequirements.push(refBadge.name)
    }

    mergedBadges.push(merged)
  }

  // Sort by name
  mergedBadges.sort((a, b) => a.name.localeCompare(b.name))

  // Create output
  const output: MergedData = {
    version_year: 2026,
    effective_date: '2026-01-01',
    source: 'https://www.scouting.org/skills/merit-badges/all/',
    total_badges: mergedBadges.length,
    merit_badges: mergedBadges,
  }

  // Write output
  const outputPath = path.join(DATA_DIR, 'merit-badges-2026-merged.json')
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))
  console.log(`\nWrote ${mergedBadges.length} merged badges to ${outputPath}`)

  if (missingRequirements.length > 0) {
    console.log(`\nBadges missing requirements (${missingRequirements.length}):`)
    for (const name of missingRequirements.slice(0, 20)) {
      console.log(`  - ${name}`)
    }
    if (missingRequirements.length > 20) {
      console.log(`  ... and ${missingRequirements.length - 20} more`)
    }
  }

  // Also output stats
  const withReqs = mergedBadges.filter(b => b.requirements.length > 0).length
  const eagleRequired = mergedBadges.filter(b => b.is_eagle_required).length
  console.log(`\nStats:`)
  console.log(`  Total badges: ${mergedBadges.length}`)
  console.log(`  With requirements: ${withReqs}`)
  console.log(`  Eagle required: ${eagleRequired}`)
}

main()
