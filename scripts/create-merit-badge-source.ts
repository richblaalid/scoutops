/**
 * Create Merit Badge Source of Truth
 *
 * Creates a single comprehensive data file from the scraped scouting.org data.
 * This is the authoritative source for all merit badge information.
 *
 * Run with: npx tsx scripts/create-merit-badge-source.ts
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
  requirements: string
  scrapedAt: string
}

interface RefBadge {
  name: string
  slug: string
  url: string
  pamphletUrl: string
  isEagleRequired: boolean
  eagleRequiredNote?: string
  category: string
}

interface RefData {
  badges: RefBadge[]
}

interface Requirement {
  id: string
  text: string
  subrequirements?: Requirement[]
}

interface MeritBadge {
  code: string
  name: string
  slug: string
  category: string
  is_eagle_required: boolean
  eagle_required_note: string | null
  image_path: string
  pamphlet_url: string | null
  scouting_org_url: string
  requirements: Requirement[]
  scraped_at: string
}

interface SourceData {
  version: string
  generated_at: string
  source: string
  total_badges: number
  eagle_required_count: number
  categories: string[]
  merit_badges: MeritBadge[]
}

// Category mapping from scraped categories
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

// Parse requirements text into structured format
function parseRequirements(text: string): Requirement[] {
  if (!text) return []

  // Check if this is just a URL reference (no actual requirements)
  if (text.match(/^Requirements available at/i)) {
    return []
  }

  // Clean up the text - remove header noise
  let cleanText = text
    .replace(/^The previous version of the Merit Badge requirements can be found in Scoutbook\n?/i, '')
    .replace(/NOTE[^:]*:.*?\n/gm, '')
    .replace(/Resource:.*?(?=\n|$)/gm, '')
    .replace(/Resources:[\s\S]*?(?=\n\d+\.|\n\([a-z]\)|\n$)/gm, '')
    .trim()

  const requirements: Requirement[] = []

  // Find all main requirements using match instead of split
  const mainReqMatches = [...cleanText.matchAll(/(?:^|\n)(\d+)\.\s+/g)]

  for (let i = 0; i < mainReqMatches.length; i++) {
    const match = mainReqMatches[i]
    const num = match[1]
    const startPos = match.index! + match[0].length

    // Find end position (start of next main requirement or end of text)
    const endPos = i < mainReqMatches.length - 1
      ? mainReqMatches[i + 1].index!
      : cleanText.length

    const content = cleanText.slice(startPos, endPos).trim()
    if (!content) continue

    // Check for sub-requirements (a), (b), etc.
    const subMatches = [...content.matchAll(/(?:^|\n)\(([a-z])\)\s+/g)]

    let mainText = content
    const subrequirements: Requirement[] = []

    if (subMatches.length > 0) {
      mainText = content.slice(0, subMatches[0].index!).trim()

      for (let j = 0; j < subMatches.length; j++) {
        const subMatch = subMatches[j]
        const subLetter = subMatch[1]
        const subStartPos = subMatch.index! + subMatch[0].length

        const subEndPos = j < subMatches.length - 1
          ? subMatches[j + 1].index!
          : content.length

        const subContent = content.slice(subStartPos, subEndPos).trim()

        // Check for nested sub-requirements (1), (2), etc.
        const nestedMatches = [...subContent.matchAll(/(?:^|\n)\((\d+)\)\s+/g)]

        let subText = subContent
        const nestedReqs: Requirement[] = []

        if (nestedMatches.length > 0) {
          subText = subContent.slice(0, nestedMatches[0].index!).trim()

          for (let k = 0; k < nestedMatches.length; k++) {
            const nestedMatch = nestedMatches[k]
            const nestedNum = nestedMatch[1]
            const nestedStartPos = nestedMatch.index! + nestedMatch[0].length

            const nestedEndPos = k < nestedMatches.length - 1
              ? nestedMatches[k + 1].index!
              : subContent.length

            const nestedContent = subContent.slice(nestedStartPos, nestedEndPos).trim()

            nestedReqs.push({
              id: `${num}${subLetter}${nestedNum}`,
              text: nestedContent.replace(/\n+/g, ' ').substring(0, 2000)
            })
          }
        }

        const subReq: Requirement = {
          id: `${num}${subLetter}`,
          text: subText.replace(/\n+/g, ' ').substring(0, 2000)
        }

        if (nestedReqs.length > 0) {
          subReq.subrequirements = nestedReqs
        }

        subrequirements.push(subReq)
      }
    }

    const req: Requirement = {
      id: num,
      text: mainText.replace(/\n+/g, ' ').substring(0, 2000)
    }

    if (subrequirements.length > 0) {
      req.subrequirements = subrequirements
    }

    requirements.push(req)
  }

  return requirements
}

// Create slug from name
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Create code from slug
function createCode(slug: string): string {
  return slug.replace(/-/g, '_')
}

function main() {
  // Load scraped data (source of truth for requirements)
  const scrapedPath = path.join(MB_DIR, 'merit-badges-full.json')
  const scrapedBadges: ScrapedBadge[] = JSON.parse(fs.readFileSync(scrapedPath, 'utf-8'))
  console.log(`Loaded ${scrapedBadges.length} scraped badges`)

  // Load reference data (for categories and eagle notes)
  const refPath = path.join(MB_DIR, 'merit-badges-2026.json')
  const refData: RefData = JSON.parse(fs.readFileSync(refPath, 'utf-8'))
  console.log(`Loaded ${refData.badges.length} reference badges`)

  // Create lookup by slug
  const refBySlug = new Map<string, RefBadge>()
  for (const badge of refData.badges) {
    refBySlug.set(badge.slug, badge)
  }

  // Create lookup for scraped badges, preferring reference data slugs
  // This handles cases like indian-lore vs american-indian-culture
  const scrapedBySlug = new Map<string, ScrapedBadge>()
  for (const badge of scrapedBadges) {
    // Skip duplicates - keep the one that matches reference data or first one
    if (scrapedBySlug.has(badge.slug)) continue
    scrapedBySlug.set(badge.slug, badge)
  }

  // Use reference data's badge list as the canonical list
  // This ensures we get exactly 141 badges with correct names/slugs
  const meritBadges: MeritBadge[] = []
  const categories = new Set<string>()
  let missingRequirements = 0
  let missingScraped = 0

  for (const ref of refData.badges) {
    const scraped = scrapedBySlug.get(ref.slug)

    if (!scraped) {
      missingScraped++
      console.log(`  Warning: No scraped data for ${ref.name} (${ref.slug})`)
    }

    // Determine category
    const category = categoryMap[ref.category] || ref.category
    categories.add(category)

    // Parse requirements from scraped data
    const requirements = scraped?.requirements
      ? parseRequirements(scraped.requirements)
      : []

    if (requirements.length === 0) {
      missingRequirements++
      console.log(`  Warning: No requirements parsed for ${ref.name}`)
    }

    const badge: MeritBadge = {
      code: createCode(ref.slug),
      name: ref.name,
      slug: ref.slug,
      category,
      is_eagle_required: ref.isEagleRequired,
      eagle_required_note: ref.eagleRequiredNote || null,
      image_path: `/merit-badges/${ref.slug}.png`,
      pamphlet_url: scraped?.pamphletUrl || ref.pamphletUrl || null,
      scouting_org_url: ref.url,
      requirements,
      scraped_at: scraped?.scrapedAt || new Date().toISOString()
    }

    meritBadges.push(badge)
  }

  // Sort alphabetically
  meritBadges.sort((a, b) => a.name.localeCompare(b.name))

  // Count eagle required
  const eagleRequired = meritBadges.filter(b => b.is_eagle_required).length

  // Create output
  const output: SourceData = {
    version: '2026.01',
    generated_at: new Date().toISOString(),
    source: 'https://www.scouting.org/skills/merit-badges/all/',
    total_badges: meritBadges.length,
    eagle_required_count: eagleRequired,
    categories: Array.from(categories).sort(),
    merit_badges: meritBadges
  }

  // Write output
  const outputPath = path.join(DATA_DIR, 'merit-badges-source.json')
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))
  console.log(`\nWrote ${meritBadges.length} badges to ${outputPath}`)

  // Print stats
  console.log(`\nStatistics:`)
  console.log(`  Total badges: ${meritBadges.length}`)
  console.log(`  Eagle required: ${eagleRequired}`)
  console.log(`  Categories: ${categories.size}`)
  console.log(`  Badges missing requirements: ${missingRequirements}`)

  console.log(`\nCategories:`)
  for (const cat of Array.from(categories).sort()) {
    const count = meritBadges.filter(b => b.category === cat).length
    console.log(`  ${cat}: ${count}`)
  }
}

main()
