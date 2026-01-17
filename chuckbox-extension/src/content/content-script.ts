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

type ContentMessage = ExtractRequest | PingRequest | GetInfoRequest

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

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener(
  (
    message: ContentMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtractResponse | PingResponse | InfoResponse) => void
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
