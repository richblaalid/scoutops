/**
 * Scrape missing merit badge images
 *
 * The original scraper missed images because it was matching slugs (e.g., "first-aid")
 * but the actual image filenames use PascalCase (e.g., "FirstAid").
 *
 * This script finds the first PNG image in elementor/thumbs for each badge page.
 *
 * Run with: npx tsx scripts/scrape-missing-images.ts
 */

import { chromium } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const DATA_DIR = path.join(__dirname, '../data/merit-badges')
const FULL_DATA_FILE = path.join(DATA_DIR, 'merit-badges-full.json')
const IMAGES_DIR = path.join(DATA_DIR, 'images')

interface Badge {
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
  // Load existing data
  const badges: Badge[] = JSON.parse(fs.readFileSync(FULL_DATA_FILE, 'utf-8'))

  // Find badges missing images
  const missingImages = badges.filter(b => !b.imageUrl)
  console.log(`Found ${missingImages.length} badges missing images`)

  if (missingImages.length === 0) {
    console.log('All badges have images!')
    return
  }

  // Launch browser
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  let updated = 0
  let errors = 0

  for (const badge of missingImages) {
    try {
      console.log(`Checking: ${badge.name}...`)

      await page.goto(badge.url, { waitUntil: 'domcontentloaded', timeout: 20000 })

      // Find the badge image - look for first PNG in elementor/thumbs
      const imageUrl = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'))
        const badgeImg = imgs.find(img => {
          const src = img.src || ''
          // Look for PNG images in elementor/thumbs (the badge images)
          // Exclude overview images (which are JPGs or have "overview" in name)
          return src.includes('elementor/thumbs') &&
                 src.endsWith('.png') &&
                 !src.toLowerCase().includes('overview')
        })
        return badgeImg ? badgeImg.src : null
      })

      if (imageUrl) {
        // Update the badge data
        const badgeIndex = badges.findIndex(b => b.slug === badge.slug)
        badges[badgeIndex].imageUrl = imageUrl
        badges[badgeIndex].imageFilename = `${badge.slug}.png`

        // Download the image
        const downloaded = await downloadImage(imageUrl, `${badge.slug}.png`)
        if (downloaded) {
          console.log(`  ✓ Downloaded: ${badge.slug}.png`)
          updated++
        } else {
          console.log(`  ✗ Failed to download image`)
        }
      } else {
        console.log(`  - No badge image found`)
      }

      // Small delay
      await new Promise(r => setTimeout(r, 300))

    } catch (error) {
      console.error(`Error processing ${badge.name}:`, error)
      errors++
      if (errors > 10) {
        console.error('Too many errors, stopping')
        break
      }
    }
  }

  await browser.close()

  // Save updated data
  fs.writeFileSync(FULL_DATA_FILE, JSON.stringify(badges, null, 2))

  console.log(`\nDone! Updated ${updated} badges with images`)
  console.log(`Data saved to: ${FULL_DATA_FILE}`)
}

main().catch(console.error)
