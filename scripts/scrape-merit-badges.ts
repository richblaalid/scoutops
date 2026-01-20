/**
 * Merit Badge Scraper
 *
 * This script scrapes merit badge data from scouting.org using Playwright.
 * Run with: npx tsx scripts/scrape-merit-badges.ts
 *
 * It extracts:
 * - Badge name and slug
 * - Badge image URL
 * - Pamphlet PDF URL
 * - Whether it's Eagle required
 * - Full requirements text
 */

import { chromium, Browser, Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const DATA_DIR = path.join(__dirname, '../data/merit-badges')
const BADGE_LIST_FILE = path.join(DATA_DIR, 'badge-list.json')
const OUTPUT_FILE = path.join(DATA_DIR, 'merit-badges-full.json')
const IMAGES_DIR = path.join(DATA_DIR, 'images')

// List of Eagle Required badges
const EAGLE_REQUIRED_BADGES = [
  'camping',
  'citizenship-in-the-community',
  'citizenship-in-the-nation',
  'citizenship-in-society',
  'citizenship-in-the-world',
  'communication',
  'cooking',
  'cycling', // OR
  'emergency-preparedness', // OR environmental-science
  'environmental-science', // OR emergency-preparedness
  'family-life',
  'first-aid',
  'hiking', // OR cycling/swimming
  'lifesaving', // OR emergency-preparedness
  'personal-fitness',
  'personal-management',
  'swimming', // OR hiking/cycling
  'sustainability', // OR environmental-science
]

interface BadgeBasic {
  name: string
  href: string
  slug: string
}

interface BadgeFull {
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

async function extractBadgeData(page: Page, badge: BadgeBasic): Promise<BadgeFull> {
  console.log(`Scraping: ${badge.name}...`)

  await page.goto(badge.href, { waitUntil: 'networkidle', timeout: 30000 })

  // Extract data using page.evaluate
  const data = await page.evaluate((badgeName) => {
    const result: {
      imageUrl: string | null
      pamphletUrl: string | null
      isEagleRequired: boolean
      requirements: string
    } = {
      imageUrl: null,
      pamphletUrl: null,
      isEagleRequired: false,
      requirements: ''
    }

    // Find the badge image
    const imgs = Array.from(document.querySelectorAll('img'))
    const badgeImg = imgs.find(img => {
      const src = img.src || ''
      const alt = (img.alt || '').toLowerCase()
      return src.includes('elementor/thumbs') &&
             (alt.includes(badgeName.toLowerCase()) || src.toLowerCase().includes(badgeName.toLowerCase().replace(/\s+/g, '-')))
    })
    if (badgeImg) {
      result.imageUrl = badgeImg.src
    }

    // Find pamphlet download link
    const links = Array.from(document.querySelectorAll('a'))
    const pamphletLink = links.find(a => {
      const text = (a.textContent || '').toLowerCase()
      const href = a.href || ''
      return (text.includes('pamphlet') && text.includes('download')) ||
             (href.includes('filestore.scouting.org') && href.includes('.pdf'))
    })
    if (pamphletLink) {
      result.pamphletUrl = pamphletLink.href
    }

    // Check if Eagle Required
    const pageText = document.body.innerText
    result.isEagleRequired = pageText.includes('Eagle Required')

    // Extract requirements - get the visible text between "Requirements" and "Show More" or "Get the"
    const reqMatch = pageText.match(/Requirements\n([\s\S]*?)(?=Show More|Get the .* Merit Badge Pamphlet|Shop )/i)
    if (reqMatch) {
      // Clean up the requirements text
      result.requirements = reqMatch[1]
        .replace(/Resources:\n[^\n]+(\n[^\n]+)*?(?=\d+\.|$)/g, '') // Remove Resources sections
        .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
        .trim()
    }

    return result
  }, badge.name)

  // Construct pamphlet URL if not found
  let pamphletUrl = data.pamphletUrl
  if (!pamphletUrl) {
    // Try common pattern
    const pamphletName = badge.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '%20')
    pamphletUrl = `https://filestore.scouting.org/filestore/Merit_Badge_ReqandRes/Pamphlets/${pamphletName}.pdf`
  }

  return {
    name: badge.name,
    slug: badge.slug,
    url: badge.href,
    imageUrl: data.imageUrl,
    imageFilename: data.imageUrl ? `${badge.slug}.png` : null,
    pamphletUrl: pamphletUrl,
    isEagleRequired: data.isEagleRequired || EAGLE_REQUIRED_BADGES.includes(badge.slug),
    requirements: data.requirements,
    scrapedAt: new Date().toISOString()
  }
}

async function downloadImage(url: string, filename: string): Promise<boolean> {
  try {
    const response = await fetch(url)
    if (!response.ok) return false

    const buffer = await response.arrayBuffer()
    fs.writeFileSync(path.join(IMAGES_DIR, filename), Buffer.from(buffer))
    return true
  } catch (error) {
    console.error(`Failed to download ${url}:`, error)
    return false
  }
}

async function main() {
  // Ensure directories exist
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true })
  }

  // Load badge list
  if (!fs.existsSync(BADGE_LIST_FILE)) {
    console.error('Badge list not found. Run the initial scrape first.')
    process.exit(1)
  }

  const badges: BadgeBasic[] = JSON.parse(fs.readFileSync(BADGE_LIST_FILE, 'utf-8'))
  console.log(`Found ${badges.length} badges to scrape`)

  // Load existing data if any (for resuming)
  let existingData: BadgeFull[] = []
  if (fs.existsSync(OUTPUT_FILE)) {
    existingData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'))
    console.log(`Resuming from ${existingData.length} already scraped badges`)
  }
  const scrapedSlugs = new Set(existingData.map(b => b.slug))

  // Launch browser
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  const results: BadgeFull[] = [...existingData]
  let errorCount = 0

  for (const badge of badges) {
    if (scrapedSlugs.has(badge.slug)) {
      console.log(`Skipping ${badge.name} (already scraped)`)
      continue
    }

    try {
      const data = await extractBadgeData(page, badge)
      results.push(data)

      // Download image
      if (data.imageUrl && data.imageFilename) {
        const downloaded = await downloadImage(data.imageUrl, data.imageFilename)
        if (downloaded) {
          console.log(`  Downloaded image: ${data.imageFilename}`)
        }
      }

      // Save progress after each badge
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2))

      // Small delay to be nice to the server
      await new Promise(r => setTimeout(r, 500))

    } catch (error) {
      console.error(`Error scraping ${badge.name}:`, error)
      errorCount++
      if (errorCount > 10) {
        console.error('Too many errors, stopping')
        break
      }
    }
  }

  await browser.close()

  console.log(`\nDone! Scraped ${results.length} badges`)
  console.log(`Data saved to: ${OUTPUT_FILE}`)
  console.log(`Images saved to: ${IMAGES_DIR}`)
}

main().catch(console.error)
