#!/usr/bin/env npx tsx
/**
 * Debug Badge Structure
 *
 * Opens a browser and lets you navigate to a merit badge page in Scoutbook.
 * Then analyzes and displays the DOM structure to help improve the scraper.
 *
 * Usage:
 *   npx tsx scripts/debug-badge-structure.ts
 *
 * After running:
 * 1. Log into Scoutbook
 * 2. Navigate to the badge you want to analyze (e.g., Multisport)
 * 3. Press Enter to capture the structure
 */

import { chromium, Page } from 'playwright'
import * as readline from 'readline'
import * as fs from 'fs'

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

interface DOMNode {
  tag: string
  classes: string[]
  text: string
  children: DOMNode[]
  reqNumber?: string
}

async function analyzeStructure(page: Page): Promise<void> {
  console.log('\nAnalyzing badge structure...\n')

  // Get badge name
  const badgeName = await page.evaluate(() => {
    const breadcrumb = document.querySelector('[class*="Breadcrumbs__current"]')
    return breadcrumb?.textContent?.trim() || 'Unknown'
  })

  console.log(`Badge: ${badgeName}`)
  console.log('='.repeat(60))

  // Get the structure of requirement panels
  const structure = await page.evaluate(() => {
    const results: Array<{
      panelIndex: number
      mainReqNum: string
      mainReqText: string
      items: Array<{
        number: string
        text: string
        classes: string
        depth: number
        parentClasses: string
      }>
    }> = []

    // Find all requirement panels
    const panels = document.querySelectorAll('.ant-collapse-item')

    panels.forEach((panel, panelIndex) => {
      const panelData: typeof results[0] = {
        panelIndex,
        mainReqNum: '',
        mainReqText: '',
        items: []
      }

      // Get main requirement number
      const circleLabel = panel.querySelector('[class*="CircleLabel__circle"], [class*="requirementGroupListNumber"]')
      panelData.mainReqNum = circleLabel?.textContent?.trim() || ''

      // Get main requirement text
      const firstContent = panel.querySelector('[class*="requirementContent"]')
      panelData.mainReqText = (firstContent?.textContent?.trim() || '').substring(0, 80)

      // Find all sub-items within this panel
      panel.querySelectorAll('[class*="requirementItemContainer"]').forEach((item, itemIndex) => {
        const numberEl = item.querySelector('[class*="itemListNumber"]')
        const contentEl = item.querySelector('[class*="requirementContent"]')

        // Get the class hierarchy
        let parentEl = item.parentElement
        const parentClasses: string[] = []
        while (parentEl && parentEl !== panel) {
          if (parentEl.className) {
            parentClasses.push(parentEl.className.split(' ').filter((c: string) => c.includes('requirement') || c.includes('Requirement')).join(' '))
          }
          parentEl = parentEl.parentElement
        }

        // Calculate depth based on nesting
        const depth = (item.closest('[class*="subRequirement"]') ? 2 : 1) +
                     (item.closest('[class*="nestedRequirement"]') ? 1 : 0)

        panelData.items.push({
          number: numberEl?.textContent?.trim() || '',
          text: (contentEl?.textContent?.trim() || '').substring(0, 60),
          classes: item.className || '',
          depth,
          parentClasses: parentClasses.filter(c => c).join(' > ')
        })
      })

      if (panelData.mainReqNum) {
        results.push(panelData)
      }
    })

    return results
  })

  // Display the structure
  for (const panel of structure) {
    console.log(`\n[${panel.mainReqNum}] ${panel.mainReqText}...`)

    for (const item of panel.items) {
      const indent = '  '.repeat(item.depth)
      console.log(`${indent}${item.number}: "${item.text}..."`)

      // Show class info for complex items
      if (item.text.includes('Option') || item.text.includes('Swimming') ||
          item.text.includes('Biking') || item.text.includes('Running')) {
        console.log(`${indent}  ^ classes: ${item.classes.substring(0, 80)}`)
        if (item.parentClasses) {
          console.log(`${indent}  ^ parents: ${item.parentClasses}`)
        }
      }
    }
  }

  // Save raw HTML for deeper analysis
  const rawHtml = await page.evaluate(() => {
    const container = document.querySelector('[class*="AdvRequirements"]')
    return container?.outerHTML || ''
  })

  const outputPath = `data/debug-${badgeName.toLowerCase().replace(/\s+/g, '-')}-structure.html`
  fs.writeFileSync(outputPath, rawHtml)
  console.log(`\nRaw HTML saved to: ${outputPath}`)
}

async function main() {
  console.log('Debug Badge Structure')
  console.log('='.repeat(60))
  console.log('')
  console.log('This tool helps analyze complex merit badge structures.')
  console.log('')

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
  })

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  })

  const page = await context.newPage()

  await page.goto('https://advancements.scouting.org/', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  })

  console.log('Browser launched!')
  console.log('')
  console.log('Please:')
  console.log('1. Log in to Scoutbook')
  console.log('2. Navigate to the merit badge you want to analyze')
  console.log('   (e.g., Multisport)')
  console.log('3. Make sure the requirements are visible')
  console.log('')

  await waitForKeypress('Press Enter when you\'re on the badge requirements page...\n')

  await analyzeStructure(page)

  const continueAnalysis = await waitForKeypress('\nAnalyze another badge? (y/n) ')

  if (continueAnalysis.toLowerCase() === 'y') {
    console.log('Navigate to the next badge and press Enter...')
    await waitForKeypress('')
    await analyzeStructure(page)
  }

  await waitForKeypress('\nPress Enter to close browser...\n')
  await browser.close()
}

main().catch(console.error)
