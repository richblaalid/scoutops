/**
 * DOM Extraction Utilities
 *
 * Extracts roster data from Scoutbook pages
 */

/**
 * Check if the current page is a Scoutbook roster page
 */
export function isRosterPage(): boolean {
  const url = window.location.href.toLowerCase()
  return (
    url.includes('advancements.scouting.org') &&
    (url.includes('/roster') || url.includes('/unit'))
  )
}

/**
 * Extract the roster table HTML from the current page
 * Also captures tooltip/hover data that might contain additional info (like multiple positions)
 */
export function extractRosterHtml(): string {
  // First, expand any hover/tooltip data into visible attributes
  // Scoutbook may hide multiple positions in title attributes or data-* attributes
  expandHoverData()

  // Get the main content area
  const mainContent = document.querySelector('main, .main-content, #content, [role="main"]')
  if (mainContent) {
    return mainContent.innerHTML
  }

  // Fall back to body content, but try to exclude navigation
  const body = document.body.cloneNode(true) as HTMLElement

  // Remove navigation elements
  body.querySelectorAll('nav, header, footer, .navigation, .sidebar').forEach((el) => {
    el.remove()
  })

  return body.innerHTML
}

/**
 * Expand hover/tooltip data into the DOM so it gets captured in innerHTML
 * This finds any elements with title attributes or data attributes that might
 * contain hidden info (like multiple positions) and adds them as visible text
 */
function expandHoverData(): void {
  // Find table cells with title attributes (often used for hover text)
  const cellsWithTitles = document.querySelectorAll('td[title], th[title]')
  cellsWithTitles.forEach((cell) => {
    const title = cell.getAttribute('title')
    if (title && title.trim()) {
      // Add a data attribute so the parser can see it
      cell.setAttribute('data-hover-text', title)
    }
  })

  // Find any elements with tooltip-related attributes
  const tooltipElements = document.querySelectorAll('[data-tooltip], [data-tip], [aria-label]')
  tooltipElements.forEach((el) => {
    const tooltip = el.getAttribute('data-tooltip') || el.getAttribute('data-tip') || el.getAttribute('aria-label')
    if (tooltip && tooltip.trim()) {
      el.setAttribute('data-hover-text', tooltip)
    }
  })

  // Ant Design specific: check for tooltip content
  const antTooltipTriggers = document.querySelectorAll('.ant-tooltip-open, [class*="ant-tooltip"]')
  antTooltipTriggers.forEach((trigger) => {
    const tooltipContent = trigger.querySelector('.ant-tooltip-inner')
    if (tooltipContent) {
      trigger.setAttribute('data-hover-text', tooltipContent.textContent || '')
    }
  })
}

/**
 * Check if the roster page has pagination
 */
export function hasPagination(): boolean {
  const paginationSelectors = [
    '.ant-pagination',
    '.ant-pagination-next',
    '[aria-label="pagination"]',
    '.pagination',
    '[class*="pagination"]',
  ]

  return paginationSelectors.some((selector) => document.querySelector(selector) !== null)
}

/**
 * Get the next page button if pagination exists
 */
export function getNextPageButton(): HTMLElement | null {
  // Ant Design pagination (Scoutbook uses this)
  const antNext = document.querySelector<HTMLElement>('.ant-pagination-next:not(.ant-pagination-disabled)')
  if (antNext && antNext.getAttribute('aria-disabled') !== 'true') {
    return antNext
  }

  // Generic fallbacks
  const fallbackSelectors = [
    'button[aria-label*="Next"]',
    'a[aria-label*="Next"]',
    'li[title="Next Page"]:not([aria-disabled="true"])',
    '.pagination-next:not(.disabled)',
  ]

  for (const selector of fallbackSelectors) {
    const button = document.querySelector<HTMLElement>(selector)
    if (button) {
      return button
    }
  }

  return null
}

/**
 * Simple delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Check if we're currently on page 1 of the pagination
 */
export function isOnFirstPage(): boolean {
  // Check if previous button is disabled (means we're on page 1)
  const antPrev = document.querySelector<HTMLElement>('.ant-pagination-prev')
  if (antPrev) {
    const isDisabled = antPrev.classList.contains('ant-pagination-disabled') ||
      antPrev.getAttribute('aria-disabled') === 'true'
    return isDisabled
  }

  // Check for active page 1 item
  const activePage = document.querySelector('.ant-pagination-item-active')
  if (activePage) {
    const pageNum = activePage.getAttribute('title')
    return pageNum === '1'
  }

  // No pagination means we're effectively on page 1
  return true
}

/**
 * Navigate to the first page of pagination
 */
export async function goToFirstPage(): Promise<void> {
  if (isOnFirstPage()) {
    console.log('[Chuckbox] Already on first page')
    return
  }

  console.log('[Chuckbox] Navigating to first page...')

  // Try clicking page 1 directly
  const page1Item = document.querySelector<HTMLElement>('.ant-pagination-item-1')
  if (page1Item) {
    page1Item.click()
    await waitForContentUpdate()
    await delay(500)
    console.log('[Chuckbox] Clicked page 1 button')
    return
  }

  // Fallback: keep clicking previous until disabled
  let maxClicks = 20
  while (maxClicks > 0 && !isOnFirstPage()) {
    const prevButton = document.querySelector<HTMLElement>('.ant-pagination-prev:not(.ant-pagination-disabled)')
    if (!prevButton || prevButton.getAttribute('aria-disabled') === 'true') {
      break
    }

    prevButton.click()
    await waitForContentUpdate()
    await delay(300)
    maxClicks--
  }

  console.log('[Chuckbox] Navigated to first page')
}

/**
 * Wait for the page content to update after navigation
 */
export function waitForContentUpdate(timeout = 5000): Promise<void> {
  return new Promise((resolve) => {
    let resolved = false

    const observer = new MutationObserver((mutations, obs) => {
      // Look for significant DOM changes (table or Ant Design updates)
      const hasTableChange = mutations.some((m) => {
        const target = m.target as Element
        const tagName = target.tagName?.toLowerCase()
        const className = target.className || ''

        return (
          m.type === 'childList' &&
          (tagName === 'tbody' ||
            tagName === 'table' ||
            className.includes('ant-table') ||
            className.includes('ant-spin'))
        )
      })

      if (hasTableChange && !resolved) {
        resolved = true
        obs.disconnect()
        // Small delay to let rendering complete
        setTimeout(resolve, 500)
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    // Timeout fallback
    setTimeout(() => {
      if (!resolved) {
        resolved = true
        observer.disconnect()
        resolve()
      }
    }, timeout)
  })
}

/**
 * Extract all pages of the roster (handles pagination)
 */
export async function extractAllPages(): Promise<string> {
  const pages: string[] = []

  // First, ensure we're on page 1
  if (hasPagination()) {
    await goToFirstPage()
  }

  // Extract current page (now guaranteed to be page 1)
  pages.push(extractRosterHtml())
  console.log('[Chuckbox] Extracted page 1')

  // Handle pagination if present
  let pageNum = 1
  const maxPages = 20 // Safety limit

  while (pageNum < maxPages) {
    // Check if there's a next button
    const nextButton = getNextPageButton()
    if (!nextButton) {
      console.log('[Chuckbox] No more pages (next button not found or disabled)')
      break
    }

    // Small delay before clicking
    await delay(300)

    // Click next
    console.log('[Chuckbox] Clicking next page...')
    nextButton.click()

    // Wait for content to update
    await waitForContentUpdate()

    // Additional delay to ensure content is rendered
    await delay(500)

    // Extract new page content
    const pageHtml = extractRosterHtml()

    // Check if content is substantially different (not just minor changes)
    const lastPage = pages[pages.length - 1]
    if (pageHtml.length === lastPage.length && pageHtml === lastPage) {
      console.log('[Chuckbox] Page content unchanged, stopping')
      break
    }

    pageNum++
    pages.push(pageHtml)
    console.log(`[Chuckbox] Extracted page ${pageNum}`)
  }

  console.log(`[Chuckbox] Total pages extracted: ${pages.length}`)

  // Combine all pages
  return pages.join('\n<!-- PAGE BREAK -->\n')
}

/**
 * Get information about the current roster page
 */
export function getRosterInfo(): {
  memberCount: number | null
  unitName: string | null
  pageNumber: number | null
  totalPages: number | null
} {
  // Try to find member count
  const countText = document.body.innerText.match(/(\d+)\s*(?:member|scout|roster)/i)
  const memberCount = countText ? parseInt(countText[1], 10) : null

  // Try to find unit name
  const unitElement = document.querySelector('h1, h2, [class*="unit-name"], [class*="title"]')
  const unitName = unitElement?.textContent?.trim() || null

  // Try to find pagination info
  const pageInfo = document.body.innerText.match(/page\s*(\d+)\s*of\s*(\d+)/i)
  const pageNumber = pageInfo ? parseInt(pageInfo[1], 10) : null
  const totalPages = pageInfo ? parseInt(pageInfo[2], 10) : null

  return { memberCount, unitName, pageNumber, totalPages }
}
