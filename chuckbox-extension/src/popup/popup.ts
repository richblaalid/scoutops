/**
 * Chuckbox Extension Popup
 *
 * Handles the popup UI and user interactions
 */

// DOM Elements
const connectionDot = document.getElementById('connectionDot') as HTMLElement
const connectionStatus = document.getElementById('connectionStatus') as HTMLElement
const pageDot = document.getElementById('pageDot') as HTMLElement
const pageStatus = document.getElementById('pageStatus') as HTMLElement
const errorMessage = document.getElementById('errorMessage') as HTMLElement
const successMessage = document.getElementById('successMessage') as HTMLElement
const resultSummary = document.getElementById('resultSummary') as HTMLElement
const progressSection = document.getElementById('progressSection') as HTMLElement
const progressFill = document.getElementById('progressFill') as HTMLElement
const progressText = document.getElementById('progressText') as HTMLElement
const syncBtn = document.getElementById('syncBtn') as HTMLButtonElement
const syncBtnText = document.getElementById('syncBtnText') as HTMLElement
const syncSpinner = document.getElementById('syncSpinner') as HTMLElement
const viewInChuckbox = document.getElementById('viewInChuckbox') as HTMLAnchorElement
const infoText = document.getElementById('infoText') as HTMLElement
const tokenInput = document.getElementById('tokenInput') as HTMLInputElement
const clearTokenBtn = document.getElementById('clearTokenBtn') as HTMLButtonElement

// State
let isOnRosterPage = false
let isConnected = false
let currentTabId: number | null = null

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await checkStatus()
  await checkCurrentPage()

  // Load saved token
  const status = await chrome.runtime.sendMessage({ action: 'getStatus' })
  if (status.hasToken) {
    tokenInput.value = '••••••••••••••••'
    tokenInput.disabled = true
    clearTokenBtn.classList.remove('hidden')
  }

  // Token input handler
  tokenInput.addEventListener('change', handleTokenChange)

  // Clear token button handler
  clearTokenBtn.addEventListener('click', handleClearToken)

  // Sync button handler
  syncBtn.addEventListener('click', handleSync)
})

async function checkStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'checkAuth' })

    if (response.authenticated) {
      connectionDot.className = 'status-dot green'
      connectionStatus.textContent = 'Connected'
      isConnected = true
    } else {
      // Check if we have a token
      const status = await chrome.runtime.sendMessage({ action: 'getStatus' })
      if (status.hasToken) {
        connectionDot.className = 'status-dot yellow'
        connectionStatus.textContent = 'Token Set'
        isConnected = true
      } else {
        connectionDot.className = 'status-dot red'
        connectionStatus.textContent = 'Not Connected'
        isConnected = false
      }
    }
  } catch {
    connectionDot.className = 'status-dot red'
    connectionStatus.textContent = 'Error'
    isConnected = false
  }

  updateSyncButton()
}

async function checkCurrentPage() {
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    if (!tab?.id) {
      setPageNotReady('No active tab')
      return
    }

    currentTabId = tab.id

    // Check if we're on Scoutbook
    if (!tab.url?.includes('advancements.scouting.org')) {
      setPageNotReady('Not on Scoutbook')
      return
    }

    // Ping content script
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'ping' })

      if (response.isRosterPage) {
        pageDot.className = 'status-dot green'
        pageStatus.textContent = 'Ready'
        isOnRosterPage = true
        infoText.textContent = 'Click "Sync Roster" to import your roster to Chuckbox.'
      } else {
        setPageNotReady('Navigate to roster')
      }
    } catch {
      // Content script not loaded yet
      setPageNotReady('Loading...')
      // Retry after a short delay
      setTimeout(checkCurrentPage, 1000)
    }
  } catch {
    setPageNotReady('Error')
  }

  updateSyncButton()
}

function setPageNotReady(status: string) {
  pageDot.className = 'status-dot gray'
  pageStatus.textContent = status
  isOnRosterPage = false
  infoText.textContent = 'Navigate to your Scoutbook roster page to enable sync.'
}

function updateSyncButton() {
  const canSync = isOnRosterPage && isConnected
  syncBtn.disabled = !canSync

  if (!canSync) {
    if (!isConnected) {
      syncBtnText.textContent = 'Set Token First'
    } else if (!isOnRosterPage) {
      syncBtnText.textContent = 'Go to Roster Page'
    }
  } else {
    syncBtnText.textContent = 'Sync Roster'
  }
}

async function handleTokenChange() {
  const token = tokenInput.value.trim()

  if (!token || token.includes('•')) {
    return
  }

  try {
    await chrome.runtime.sendMessage({ action: 'setToken', token })
    tokenInput.value = '••••••••••••••••'
    tokenInput.disabled = true
    clearTokenBtn.classList.remove('hidden')
    showSuccess('Token saved successfully')
    await checkStatus()
  } catch (error) {
    showError('Failed to save token')
  }
}

async function handleClearToken() {
  try {
    // Clear token from storage
    await chrome.runtime.sendMessage({ action: 'setToken', token: '' })
    tokenInput.value = ''
    tokenInput.disabled = false
    tokenInput.focus()
    clearTokenBtn.classList.add('hidden')
    await checkStatus()
  } catch (error) {
    showError('Failed to clear token')
  }
}

async function handleSync() {
  if (!currentTabId) {
    showError('No active tab')
    return
  }

  // Reset UI
  hideError()
  hideSuccess()
  showProgress('Extracting roster data...', 10)
  setSyncing(true)

  try {
    // Step 1: Extract HTML from content script
    setProgress('Navigating to first page...', 15)
    const extractResponse = await chrome.tabs.sendMessage(currentTabId, { action: 'extract' })

    if (!extractResponse.success) {
      throw new Error(extractResponse.error || 'Failed to extract roster')
    }

    // Show extraction complete and estimate pages
    const pageCount = (extractResponse.html.match(/<!-- PAGE BREAK -->/gi) || []).length + 1
    setProgress(`Extracted ${pageCount} page(s). Processing...`, 30)

    // Step 2: Send to Chuckbox API
    // Start a progress animation while server processes the data
    let progressValue = 30
    const progressInterval = setInterval(() => {
      // Slowly increment progress to ~90%
      if (progressValue < 90) {
        progressValue += 2
        setProgress(`Processing roster data...`, Math.round(progressValue))
      }
    }, 200)

    const syncResponse = await chrome.runtime.sendMessage({
      action: 'sync',
      html: extractResponse.html,
    })

    clearInterval(progressInterval)

    if (!syncResponse.success) {
      throw new Error(syncResponse.error || 'Sync failed')
    }

    // Step 3: Show results
    setProgress('Complete!', 100)

    const { staging } = syncResponse
    const totalChanges =
      staging.toCreate + staging.toUpdate + staging.adultsToCreate + staging.adultsToUpdate

    // Get base URL for links
    const statusForUrl = await chrome.runtime.sendMessage({ action: 'getStatus' })
    const baseUrlForLinks = (statusForUrl.apiUrl || 'https://chuckbox.app/api').replace('/api', '')

    if (totalChanges === 0) {
      showSuccess('Roster is up to date - no changes needed.')
    } else {
      const parts = []
      if (staging.toCreate > 0) parts.push(`${staging.toCreate} new scouts`)
      if (staging.toUpdate > 0) parts.push(`${staging.toUpdate} scout updates`)
      if (staging.adultsToCreate > 0) parts.push(`${staging.adultsToCreate} new adults`)
      if (staging.adultsToUpdate > 0) parts.push(`${staging.adultsToUpdate} adult updates`)

      showSuccess(
        `Found: <strong>${parts.join(', ')}</strong><br>` +
          `<a href="${baseUrlForLinks}/settings" target="_blank" class="link">Review in Chuckbox</a>`
      )
    }

    // Update view link - use stored API URL to determine base
    const status = await chrome.runtime.sendMessage({ action: 'getStatus' })
    const apiUrl = status.apiUrl || 'https://chuckbox.app/api'
    const baseUrl = apiUrl.replace('/api', '')
    viewInChuckbox.href = `${baseUrl}/settings`
    viewInChuckbox.classList.remove('hidden')
  } catch (error) {
    showError(error instanceof Error ? error.message : 'Sync failed')
  } finally {
    setSyncing(false)
    hideProgress()
  }
}

function setSyncing(syncing: boolean) {
  syncBtn.disabled = syncing
  syncBtnText.textContent = syncing ? 'Syncing...' : 'Sync Roster'
  syncSpinner.classList.toggle('hidden', !syncing)
}

function showProgress(text: string, percent: number) {
  progressSection.classList.remove('hidden')
  progressFill.style.width = `${percent}%`
  progressText.textContent = text
}

function setProgress(text: string, percent: number) {
  progressFill.style.width = `${percent}%`
  progressText.textContent = text
}

function hideProgress() {
  setTimeout(() => {
    progressSection.classList.add('hidden')
  }, 1000)
}

function showError(message: string) {
  errorMessage.textContent = message
  errorMessage.classList.remove('hidden')
}

function hideError() {
  errorMessage.classList.add('hidden')
}

function showSuccess(message: string) {
  resultSummary.innerHTML = message
  successMessage.classList.remove('hidden')
}

function hideSuccess() {
  successMessage.classList.add('hidden')
}
