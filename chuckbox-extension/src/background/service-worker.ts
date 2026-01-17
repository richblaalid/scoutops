/**
 * Chuckbox Extension Background Service Worker
 *
 * Handles API communication and state management
 */

import { ChuckboxAPI } from '@/lib/api'

const api = new ChuckboxAPI()

// Storage keys
const STORAGE_KEYS = {
  TOKEN: 'chuckbox_token',
  API_URL: 'chuckbox_api_url',
  LAST_SYNC: 'chuckbox_last_sync',
}

// Message types
interface SyncMessage {
  action: 'sync'
  html: string
}

interface CheckAuthMessage {
  action: 'checkAuth'
}

interface SetTokenMessage {
  action: 'setToken'
  token: string
}

interface SetApiUrlMessage {
  action: 'setApiUrl'
  url: string
}

interface GetStatusMessage {
  action: 'getStatus'
}

type BackgroundMessage =
  | SyncMessage
  | CheckAuthMessage
  | SetTokenMessage
  | SetApiUrlMessage
  | GetStatusMessage

// Initialize from storage
async function initialize() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.TOKEN, STORAGE_KEYS.API_URL])

  if (result[STORAGE_KEYS.TOKEN]) {
    api.setToken(result[STORAGE_KEYS.TOKEN])
  }

  if (result[STORAGE_KEYS.API_URL]) {
    api.setBaseUrl(result[STORAGE_KEYS.API_URL])
  }
}

initialize()

// Listen for messages
chrome.runtime.onMessage.addListener(
  (
    message: BackgroundMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => {
    handleMessage(message)
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      })

    return true // Keep channel open for async response
  }
)

async function handleMessage(message: BackgroundMessage): Promise<unknown> {
  switch (message.action) {
    case 'sync':
      return handleSync(message.html)

    case 'checkAuth':
      return handleCheckAuth()

    case 'setToken':
      return handleSetToken(message.token)

    case 'setApiUrl':
      return handleSetApiUrl(message.url)

    case 'getStatus':
      return handleGetStatus()

    default:
      throw new Error('Unknown action')
  }
}

async function handleSync(html: string) {
  try {
    const result = await api.syncRoster(html)

    // Store last sync info
    await chrome.storage.local.set({
      [STORAGE_KEYS.LAST_SYNC]: {
        timestamp: new Date().toISOString(),
        sessionId: result.sessionId,
        staging: result.staging,
      },
    })

    return {
      success: true,
      ...result,
    }
  } catch (error) {
    throw error
  }
}

async function handleCheckAuth() {
  try {
    const result = await api.checkSession()
    return {
      success: true,
      authenticated: result.authenticated,
      unitName: result.unitName,
    }
  } catch {
    return {
      success: false,
      authenticated: false,
    }
  }
}

async function handleSetToken(token: string) {
  api.setToken(token)
  await chrome.storage.local.set({ [STORAGE_KEYS.TOKEN]: token })
  return { success: true }
}

async function handleSetApiUrl(url: string) {
  api.setBaseUrl(url)
  await chrome.storage.local.set({ [STORAGE_KEYS.API_URL]: url })
  return { success: true }
}

async function handleGetStatus() {
  const storage = await chrome.storage.local.get([
    STORAGE_KEYS.TOKEN,
    STORAGE_KEYS.API_URL,
    STORAGE_KEYS.LAST_SYNC,
  ])

  return {
    hasToken: !!storage[STORAGE_KEYS.TOKEN],
    apiUrl: storage[STORAGE_KEYS.API_URL] || 'https://chuckbox.app/api',
    lastSync: storage[STORAGE_KEYS.LAST_SYNC],
  }
}

// Listen for page ready messages from content script
chrome.runtime.onMessage.addListener(
  (
    message: { action: string; isRosterPage?: boolean; url?: string },
    sender: chrome.runtime.MessageSender
  ) => {
    if (message.action === 'pageReady' && message.isRosterPage) {
      // Update badge to show roster page detected
      if (sender.tab?.id) {
        chrome.action.setBadgeText({ text: '!', tabId: sender.tab.id })
        chrome.action.setBadgeBackgroundColor({ color: '#059669', tabId: sender.tab.id })
      }
    }
  }
)

// Clear badge when tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId)
    if (tab.url && !tab.url.includes('advancements.scouting.org')) {
      chrome.action.setBadgeText({ text: '', tabId: activeInfo.tabId })
    }
  } catch {
    // Tab might not exist
  }
})

console.log('[Chuckbox] Background service worker loaded')
