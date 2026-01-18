/**
 * Chuckbox Extension Content Script
 *
 * Runs on Scoutbook pages to detect roster pages and extract data.
 */

import { isRosterPage, extractAllPages, getRosterInfo } from '@/lib/extractor'

// Message types
interface ExtractRequest {
  action: 'extract'
}

interface PingRequest {
  action: 'ping'
}

interface GetInfoRequest {
  action: 'getInfo'
}

interface NavigateToRosterRequest {
  action: 'navigateToRoster'
}

type ContentMessage = ExtractRequest | PingRequest | GetInfoRequest | NavigateToRosterRequest

interface ExtractResponse {
  success: boolean
  html?: string
  error?: string
}

interface PingResponse {
  isRosterPage: boolean
  url: string
}

interface InfoResponse {
  memberCount: number | null
  unitName: string | null
  pageNumber: number | null
  totalPages: number | null
}

interface NavigateResponse {
  success: boolean
  error?: string
}

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener(
  (
    message: ContentMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtractResponse | PingResponse | InfoResponse | NavigateResponse) => void
  ) => {
    if (message.action === 'ping') {
      // Check if we're on a roster page
      sendResponse({
        isRosterPage: isRosterPage(),
        url: window.location.href,
      })
      return true
    }

    if (message.action === 'getInfo') {
      // Get roster page info
      const info = getRosterInfo()
      sendResponse(info)
      return true
    }

    if (message.action === 'navigateToRoster') {
      // Find and click the roster navigation link
      handleNavigateToRoster()
        .then((response) => sendResponse(response))
        .catch((error) => {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        })
      return true // Keep message channel open for async response
    }

    if (message.action === 'extract') {
      // Extract roster HTML
      handleExtract()
        .then((response) => sendResponse(response))
        .catch((error) => {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        })
      return true // Keep message channel open for async response
    }

    return false
  }
)

async function handleExtract(): Promise<ExtractResponse> {
  if (!isRosterPage()) {
    return {
      success: false,
      error: 'Not a roster page. Please navigate to the Scoutbook roster.',
    }
  }

  try {
    // Extract all pages (handles pagination)
    const html = await extractAllPages()

    if (!html || html.length < 100) {
      return {
        success: false,
        error: 'Could not extract roster data. Is the page fully loaded?',
      }
    }

    return {
      success: true,
      html,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Extraction failed',
    }
  }
}

async function handleNavigateToRoster(): Promise<NavigateResponse> {
  // If already on roster page, nothing to do
  if (isRosterPage()) {
    return { success: true }
  }

  console.log('[Chuckbox] Looking for Roster navigation link...')

  // Try various selectors for the Roster menu item
  const rosterSelectors = [
    // Menu items with "Roster" text
    'a[href*="/roster"]',
    'a[href*="roster"]',
    '[class*="menu"] a:has-text("Roster")',
    '[class*="nav"] a:has-text("Roster")',
    // Ant Design menu items
    '.ant-menu-item a[href*="roster"]',
    '.ant-menu a[href*="roster"]',
    // Generic links containing roster
    'a:contains("Roster")',
    // Sidebar/navigation links
    '[role="navigation"] a[href*="roster"]',
    '[role="menu"] a[href*="roster"]',
  ]

  let rosterLink: HTMLAnchorElement | null = null

  // Try each selector
  for (const selector of rosterSelectors) {
    try {
      const element = document.querySelector<HTMLAnchorElement>(selector)
      if (element) {
        rosterLink = element
        console.log(`[Chuckbox] Found roster link with selector: ${selector}`)
        break
      }
    } catch {
      // Some selectors like :has-text may not be supported, skip
    }
  }

  // Fallback: search all links for "Roster" text
  if (!rosterLink) {
    const allLinks = document.querySelectorAll('a')
    for (const link of allLinks) {
      const text = link.textContent?.trim().toLowerCase() || ''
      const href = link.getAttribute('href')?.toLowerCase() || ''
      if (text === 'roster' || text.includes('roster') || href.includes('roster')) {
        rosterLink = link as HTMLAnchorElement
        console.log('[Chuckbox] Found roster link by text/href search')
        break
      }
    }
  }

  if (!rosterLink) {
    return {
      success: false,
      error: 'Could not find Roster link. Please navigate to the roster page manually.',
    }
  }

  // Click the roster link
  console.log('[Chuckbox] Clicking roster link:', rosterLink.href)
  rosterLink.click()

  // Wait for navigation to complete
  await waitForNavigation()

  // Check if we're now on the roster page
  if (isRosterPage()) {
    console.log('[Chuckbox] Successfully navigated to roster page')
    return { success: true }
  }

  return {
    success: false,
    error: 'Navigation did not reach roster page. Please try again.',
  }
}

function waitForNavigation(timeout = 10000): Promise<void> {
  return new Promise((resolve) => {
    const startUrl = window.location.href
    let resolved = false

    // Check for URL change
    const checkUrl = setInterval(() => {
      if (window.location.href !== startUrl && !resolved) {
        resolved = true
        clearInterval(checkUrl)
        // Wait a bit for the new page to render
        setTimeout(resolve, 1000)
      }
    }, 100)

    // Also watch for DOM changes indicating page load
    const observer = new MutationObserver(() => {
      if (isRosterPage() && !resolved) {
        resolved = true
        clearInterval(checkUrl)
        observer.disconnect()
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
        clearInterval(checkUrl)
        observer.disconnect()
        resolve()
      }
    }, timeout)
  })
}

// Notify background script when page loads
document.addEventListener('DOMContentLoaded', () => {
  if (isRosterPage()) {
    chrome.runtime.sendMessage({
      action: 'pageReady',
      isRosterPage: true,
      url: window.location.href,
    })
  }
})

// Also check when the URL changes (SPA navigation)
let lastUrl = window.location.href
const urlObserver = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href
    if (isRosterPage()) {
      chrome.runtime.sendMessage({
        action: 'pageReady',
        isRosterPage: true,
        url: window.location.href,
      })
    }
  }
})

urlObserver.observe(document, { subtree: true, childList: true })

console.log('[Chuckbox] Content script loaded')
