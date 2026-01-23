/**
 * Automated Scoutbook Merit Badge Requirements Scraper
 *
 * Usage:
 *   npx tsx scripts/scrape-all-merit-badges.ts
 *
 * This script will:
 * 1. Launch a browser - you log in to Scoutbook manually
 * 2. Navigate to a scout's Merit Badges list
 * 3. Automatically scrape all badges with up to 3 versions each
 * 4. Save results to data/merit-badge-requirements-scraped.json
 *
 * Press Ctrl+C to stop the script at any time.
 */

import { chromium, Page, ElementHandle } from 'playwright'
import * as fs from 'fs'
import * as readline from 'readline'

// ============================================
// Types
// ============================================

interface ScrapedRequirement {
  number: string
  description: string
  parentNumber: string | null
  depth: number
}

interface ScrapedBadgeVersion {
  badgeName: string
  badgeSlug: string
  versionYear: number
  versionLabel: string
  requirements: ScrapedRequirement[]
  scrapedAt: string
}

interface ScrapeProgress {
  totalBadges: number
  completedBadges: number
  currentBadge: string | null
  badges: ScrapedBadgeVersion[]
  errors: string[]
  startedAt: string
  lastUpdatedAt: string
}

// ============================================
// Utilities
// ============================================

function waitForKeypress(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

function extractYearFromVersion(versionLabel: string): number {
  const match = versionLabel.match(/(\d{4})/)
  return match ? parseInt(match[1], 10) : new Date().getFullYear()
}

function saveProgress(progress: ScrapeProgress, filepath: string) {
  progress.lastUpdatedAt = new Date().toISOString()
  fs.writeFileSync(filepath, JSON.stringify(progress, null, 2))
}

function isDuplicate(progress: ScrapeProgress, badgeName: string, versionLabel: string): boolean {
  return progress.badges.some(b => b.badgeName === badgeName && b.versionLabel === versionLabel)
}

// ============================================
// Popup Handling
// ============================================

async function dismissSessionPopup(page: Page): Promise<boolean> {
  // Look for session timeout modal - clicking "No" keeps session alive
  // Also handle other common modal dismiss buttons
  const dismissSelectors = [
    // Session timeout specific - "No" to stay logged in
    '.ant-modal-confirm-btns button:has-text("No")',
    '.ant-modal button:has-text("No")',
    'button:has-text("No")',
    // Other common dismiss options
    'button:has-text("Stay logged in")',
    'button:has-text("Continue")',
    'button:has-text("OK")',
    'button:has-text("Extend")',
    '.ant-modal-confirm-btns button.ant-btn-primary',
    '.ant-modal-close',
    '[class*="modal"] button[class*="primary"]',
  ]

  for (const selector of dismissSelectors) {
    try {
      const button = await page.$(selector)
      if (button && await button.isVisible()) {
        await button.click({ force: true })
        console.log('  [Dismissed session popup]')
        await page.waitForTimeout(300)
        return true
      }
    } catch {
      // Ignore errors, try next selector
    }
  }
  return false
}

async function dismissToasts(page: Page): Promise<void> {
  // Dismiss any visible toast notifications that might block clicks
  try {
    await page.evaluate(() => {
      // Remove toast containers entirely
      document.querySelectorAll('[class*="toastify"], [class*="Toast__toast"]').forEach(el => {
        (el as HTMLElement).style.display = 'none'
      })
    })
  } catch {
    // Ignore errors
  }
}

async function clearOverlays(page: Page): Promise<void> {
  // Dismiss popups and toasts before clicking
  await dismissSessionPopup(page)
  await dismissToasts(page)
  await page.waitForTimeout(100)
}

function setupPopupHandler(page: Page): void {
  // Periodically check for and dismiss popups
  setInterval(async () => {
    try {
      await dismissSessionPopup(page)
    } catch {
      // Ignore errors in background handler
    }
  }, 2000)
}

// ============================================
// Extraction Logic
// ============================================

async function extractRequirements(page: Page): Promise<ScrapedRequirement[]> {
  return await page.evaluate(() => {
    const requirements: Array<{
      number: string
      description: string
      parentNumber: string | null
      depth: number
    }> = []

    document.querySelectorAll('.ant-collapse-item').forEach((panel) => {
      // Get main requirement number from CircleLabel
      const circleLabel = panel.querySelector('[class*="CircleLabel__circle"], [class*="requirementGroupListNumber"]')
      const mainReqNum = circleLabel?.textContent?.trim() || ''

      // Get the first requirement content
      const firstContent = panel.querySelector('[class*="requirementContent"]')
      const parentDescription = firstContent?.textContent?.trim() || ''

      if (mainReqNum) {
        // Add main requirement
        requirements.push({
          number: mainReqNum,
          description: parentDescription.substring(0, 500),
          parentNumber: null,
          depth: 0
        })

        // Context tracking for Option A/B structure
        let currentOption: string | null = null
        let currentSubReq: string | null = null
        let lastParentNumber = mainReqNum

        // Find all sub-requirements within this panel
        panel.querySelectorAll('[class*="requirementItemContainer"]').forEach((item) => {
          const itemNumber = item.querySelector('[class*="itemListNumber"]')
          const rawSubReqLabel = itemNumber?.textContent?.trim() || ''

          // Get description
          const contentDiv = item.querySelector('[class*="requirementContent"]')
          let description = ''
          contentDiv?.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE || (node as Element).tagName === 'DIV') {
              description += (node.textContent || '') + ' '
            }
          })
          description = description.trim()

          // Skip empty or "Select All"
          if (!rawSubReqLabel || description.includes('Select All') || description === parentDescription) {
            return
          }

          // Detect Option A/B headers
          const isOptionA = description.includes('Option A') || description.match(/^Option A[—\-\s]/i)
          const isOptionB = description.includes('Option B') || description.match(/^Option B[—\-\s]/i)

          if (isOptionA || isOptionB) {
            currentOption = isOptionA ? 'A' : 'B'
            currentSubReq = null

            const fullNumber = mainReqNum + currentOption
            lastParentNumber = fullNumber

            requirements.push({
              number: fullNumber,
              description: description.substring(0, 500),
              parentNumber: mainReqNum,
              depth: 1
            })
            return
          }

          // Determine if this is a letter (a, b, c) or number (1, 2, 3)
          const letterMatch = rawSubReqLabel.match(/^\(([a-z])\)$/i)
          const numberMatch = rawSubReqLabel.match(/^\((\d+)\)$/)

          let fullNumber: string
          let parentNum: string
          let depth: number

          if (letterMatch) {
            const letter = letterMatch[1].toLowerCase()
            currentSubReq = letter

            if (currentOption) {
              fullNumber = mainReqNum + currentOption + '(' + letter + ')'
              parentNum = mainReqNum + currentOption
              depth = 2
            } else {
              fullNumber = mainReqNum + letter
              parentNum = mainReqNum
              depth = 1
            }
            lastParentNumber = fullNumber

          } else if (numberMatch) {
            const num = numberMatch[1]

            if (currentOption && currentSubReq) {
              fullNumber = mainReqNum + currentOption + '(' + currentSubReq + ')(' + num + ')'
              parentNum = mainReqNum + currentOption + '(' + currentSubReq + ')'
              depth = 3
            } else if (currentOption) {
              fullNumber = mainReqNum + currentOption + '(' + num + ')'
              parentNum = mainReqNum + currentOption
              depth = 2
            } else {
              fullNumber = mainReqNum + '(' + num + ')'
              parentNum = mainReqNum
              depth = 1
            }

          } else {
            const cleanLabel = rawSubReqLabel.replace(/[()]/g, '')
            fullNumber = mainReqNum + cleanLabel
            parentNum = lastParentNumber
            depth = 1
          }

          requirements.push({
            number: fullNumber,
            description: description.substring(0, 500),
            parentNumber: parentNum,
            depth
          })
        })
      }
    })

    return requirements
  })
}

async function getBadgeName(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const breadcrumb = document.querySelector('[class*="Breadcrumbs__current"]')
    if (breadcrumb) return breadcrumb.textContent?.trim() || ''

    const summaryName = document.querySelector('[class*="AdvSummary__advName"]')
    return summaryName?.textContent?.trim() || 'Unknown'
  })
}

async function getCurrentVersion(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const versionSelector = document.querySelector('[class*="VersionSelector__versionSelect"]')
    if (versionSelector) {
      const selectedValue = versionSelector.querySelector('.ant-select-selection-selected-value')
      return selectedValue?.getAttribute('title') || selectedValue?.textContent?.trim() || ''
    }
    return ''
  })
}

async function getAvailableVersions(page: Page): Promise<string[]> {
  // Click the version dropdown to open it
  const versionSelector = await page.$('[class*="VersionSelector__versionSelect"]')
  if (!versionSelector) {
    console.log('  No version selector found')
    return []
  }

  await versionSelector.click({ force: true })
  await page.waitForTimeout(300)

  // Get all options from the dropdown
  const versions = await page.evaluate(() => {
    const options: string[] = []
    // Ant Design dropdown options appear in a portal
    document.querySelectorAll('.ant-select-dropdown-menu-item, .ant-select-item-option').forEach(opt => {
      const text = opt.textContent?.trim()
      if (text && !options.includes(text)) {
        options.push(text)
      }
    })
    return options
  })

  // Close dropdown by clicking elsewhere or pressing Escape
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)

  return versions
}

async function selectVersion(page: Page, versionLabel: string): Promise<boolean> {
  // Click the version dropdown to open it
  const versionSelector = await page.$('[class*="VersionSelector__versionSelect"]')
  if (!versionSelector) return false

  await versionSelector.click({ force: true })
  await page.waitForTimeout(300)

  // Find and click the option with matching text
  const clicked = await page.evaluate((targetVersion) => {
    const options = Array.from(document.querySelectorAll('.ant-select-dropdown-menu-item, .ant-select-item-option'))
    for (const opt of options) {
      if (opt.textContent?.trim() === targetVersion) {
        (opt as HTMLElement).click()
        return true
      }
    }
    return false
  }, versionLabel)

  if (clicked) {
    // Wait for content to update
    await page.waitForTimeout(800)
  } else {
    // Close dropdown
    await page.keyboard.press('Escape')
  }

  return clicked
}

// ============================================
// Main Scraping Logic
// ============================================

async function scrapeBadge(page: Page, progress: ScrapeProgress, outputPath: string): Promise<void> {
  const badgeName = await getBadgeName(page)
  const badgeSlug = slugify(badgeName)

  console.log(`\n  Badge: ${badgeName}`)
  progress.currentBadge = badgeName

  // Clear any overlays before interacting
  await clearOverlays(page)

  // Get available versions
  const versions = await getAvailableVersions(page)
  console.log(`  Versions available: ${versions.length > 0 ? versions.join(', ') : 'default only'}`)

  // If no version dropdown, just scrape current
  if (versions.length === 0) {
    const currentVersion = await getCurrentVersion(page) || 'Current'

    // Check for duplicate
    if (isDuplicate(progress, badgeName, currentVersion)) {
      console.log(`    ${currentVersion}: SKIPPED (duplicate)`)
      return
    }

    let requirements = await extractRequirements(page)

    // Retry once if 0 requirements found
    if (requirements.length === 0) {
      console.log(`    ${currentVersion}: 0 requirements, retrying...`)
      await page.waitForTimeout(1000)
      await clearOverlays(page)
      requirements = await extractRequirements(page)
    }

    progress.badges.push({
      badgeName,
      badgeSlug,
      versionYear: extractYearFromVersion(currentVersion),
      versionLabel: currentVersion,
      requirements,
      scrapedAt: new Date().toISOString()
    })

    console.log(`    ${currentVersion}: ${requirements.length} requirements`)
    return
  }

  // Scrape ALL available versions
  console.log(`  Scraping ${versions.length} version(s)...`)

  for (let i = 0; i < versions.length; i++) {
    const versionLabel = versions[i]

    // Check for duplicate before scraping
    if (isDuplicate(progress, badgeName, versionLabel)) {
      console.log(`    ${versionLabel}: SKIPPED (duplicate)`)
      continue
    }

    // Clear overlays before selecting version
    await clearOverlays(page)

    // Select this version
    const selected = await selectVersion(page, versionLabel)
    if (!selected) {
      console.log(`    Failed to select version: ${versionLabel}`)
      continue
    }

    // Wait for content to load
    await page.waitForTimeout(500)

    // Extract requirements
    let requirements = await extractRequirements(page)

    // Retry once if 0 requirements found
    if (requirements.length === 0) {
      console.log(`    ${versionLabel}: 0 requirements, retrying...`)
      await page.waitForTimeout(1000)
      await clearOverlays(page)
      requirements = await extractRequirements(page)
    }

    progress.badges.push({
      badgeName,
      badgeSlug,
      versionYear: extractYearFromVersion(versionLabel),
      versionLabel,
      requirements,
      scrapedAt: new Date().toISOString()
    })

    console.log(`    ${versionLabel}: ${requirements.length} requirements${requirements.length === 0 ? ' (FAILED)' : ''}`)
  }
}

async function scrapeAllBadges(page: Page, outputPath: string): Promise<ScrapeProgress> {
  const progress: ScrapeProgress = {
    totalBadges: 0,
    completedBadges: 0,
    currentBadge: null,
    badges: [],
    errors: [],
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString()
  }

  // Get all badge cards/links from the merit badge list
  // Note: Use AdvancementCardItem (not AdvancementCard) to match actual badge cards
  const badgeElements = await page.$$('[class*="MeritBadgeCard"], [class*="AdvancementCardItem"], .ant-card')

  // Filter to actual badge cards (they should have badge names)
  const badgeNames: string[] = []
  for (const el of badgeElements) {
    const name = await el.evaluate(node => {
      const nameEl = node.querySelector('[class*="name"], [class*="Name"], .ant-card-meta-title')
      return nameEl?.textContent?.trim() || ''
    })
    if (name && !badgeNames.includes(name)) {
      badgeNames.push(name)
    }
  }

  progress.totalBadges = badgeNames.length
  console.log(`\nFound ${badgeNames.length} merit badges to scrape`)

  // Debug: Check if specific badges are in the list
  const debugBadges = ['Art', 'Safety', 'Sports']
  debugBadges.forEach(name => {
    const found = badgeNames.includes(name)
    console.log(`  Debug: "${name}" in badgeNames: ${found}`)
  })

  if (badgeNames.length === 0) {
    // Try alternative: look for any clickable badge links
    const links = await page.$$('a[href*="meritBadges/"]')
    console.log(`Found ${links.length} badge links as alternative`)

    for (let i = 0; i < links.length; i++) {
      try {
        // Clear overlays before proceeding
        await clearOverlays(page)

        // Re-query links each time since page changes
        const currentLinks = await page.$$('a[href*="meritBadges/"]')
        if (i >= currentLinks.length) break

        // Get the badge URL to navigate back
        const href = await currentLinks[i].getAttribute('href')
        if (!href) continue

        // Click to open badge (force to bypass any overlays)
        await currentLinks[i].click({ force: true })
        await page.waitForSelector('[class*="VersionSelector"], [class*="AdvRequirements"]', { timeout: 20000 })
        await page.waitForTimeout(500)

        // Scrape this badge
        await scrapeBadge(page, progress, outputPath)
        progress.completedBadges++

        // Save progress every 5 badges
        if (progress.completedBadges % 5 === 0) {
          saveProgress(progress, outputPath)
          console.log(`\n  Progress saved: ${progress.completedBadges} badges complete`)
        }

        // Go back to list
        await page.goBack()
        await page.waitForTimeout(500)

      } catch (err) {
        const errorMsg = `Error on badge ${i}: ${err instanceof Error ? err.message : String(err)}`
        console.error(`  ${errorMsg}`)
        progress.errors.push(errorMsg)

        // Try to recover by going back
        try {
          await page.goBack()
          await page.waitForTimeout(500)
        } catch {
          // Ignore recovery errors
        }
      }
    }
  } else {
    // Click each badge by name
    for (let i = 0; i < badgeNames.length; i++) {
      const badgeName = badgeNames[i]

      try {
        // Clear overlays before proceeding
        await clearOverlays(page)

        // Find the badge card by exact name match
        // Use :text-is() for exact matching to avoid "Art" matching "Graphic Arts"
        const nameEl = await page.$(`[class*="AdvancementCardItem__name"]:text-is("${badgeName}")`)
        if (!nameEl) {
          console.log(`  Could not find card for: "${badgeName}"`)
          continue
        }

        // Click the parent card container
        const card = await nameEl.evaluateHandle(el => el.closest('[class*="AdvancementCardItem"]'))
        if (!card) {
          console.log(`  Could not find parent card for: "${badgeName}"`)
          continue
        }

        await (card as any).click({ force: true })
        await page.waitForSelector('[class*="VersionSelector"], [class*="AdvRequirements"]', { timeout: 20000 })
        await page.waitForTimeout(500)

        // Scrape this badge
        await scrapeBadge(page, progress, outputPath)
        progress.completedBadges++

        // Save progress every 5 badges
        if (progress.completedBadges % 5 === 0) {
          saveProgress(progress, outputPath)
          console.log(`\n  Progress saved: ${progress.completedBadges} badges complete`)
        }

        // Go back to list
        await page.goBack()
        await page.waitForTimeout(500)

      } catch (err) {
        const errorMsg = `Error on ${badgeName}: ${err instanceof Error ? err.message : String(err)}`
        console.error(`  ${errorMsg}`)
        progress.errors.push(errorMsg)

        // Try to recover
        try {
          await page.goBack()
          await page.waitForTimeout(500)
        } catch {
          // Ignore recovery errors
        }
      }
    }
  }

  // Final save
  saveProgress(progress, outputPath)

  return progress
}

// ============================================
// Main
// ============================================

async function main() {
  const outputPath = 'data/merit-badge-requirements-scraped.json'

  console.log('='.repeat(60))
  console.log('Scoutbook Merit Badge Requirements Scraper')
  console.log('='.repeat(60))
  console.log('')
  console.log('This script will scrape all merit badge requirements')
  console.log('with ALL available versions for each badge.')
  console.log('')
  console.log(`Output will be saved to: ${outputPath}`)
  console.log('')

  // Ensure data directory exists
  if (!fs.existsSync('data')) {
    fs.mkdirSync('data', { recursive: true })
  }

  console.log('Starting browser...')

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
  })

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  })

  const page = await context.newPage()

  // Set up automatic popup dismissal
  setupPopupHandler(page)

  // Navigate to Scoutbook
  await page.goto('https://advancements.scouting.org/', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  })

  console.log('')
  console.log('Browser launched! Please:')
  console.log('1. Log in to Scoutbook')
  console.log('2. Navigate to the full Merit Badges list')
  console.log('   (Or any scout\'s Merit Badges page)')
  console.log('')
  console.log('The page should show a list/grid of all merit badges.')
  console.log('')

  await waitForKeypress('Press Enter when you\'re on the Merit Badges list page...\n')

  const currentUrl = page.url()
  console.log(`\nStarting scrape from: ${currentUrl}`)

  try {
    const progress = await scrapeAllBadges(page, outputPath)

    console.log('')
    console.log('='.repeat(60))
    console.log('SCRAPING COMPLETE')
    console.log('='.repeat(60))
    console.log(`Total badges scraped: ${progress.completedBadges}`)
    console.log(`Total versions captured: ${progress.badges.length}`)
    console.log(`Errors: ${progress.errors.length}`)
    console.log(`Output saved to: ${outputPath}`)

    if (progress.errors.length > 0) {
      console.log('')
      console.log('Errors encountered:')
      progress.errors.slice(0, 10).forEach(e => console.log(`  - ${e}`))
      if (progress.errors.length > 10) {
        console.log(`  ... and ${progress.errors.length - 10} more`)
      }
    }

  } catch (err) {
    console.error('Fatal error during scraping:', err)
  }

  console.log('')
  await waitForKeypress('Press Enter to close the browser...\n')

  await browser.close()
  console.log('Done!')
}

main().catch(console.error)
