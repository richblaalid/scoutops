/**
 * Chuckbox Extension Popup
 *
 * Handles the popup UI and user interactions
 */

// DOM Elements
const headerSubtitle = document.getElementById('headerSubtitle') as HTMLElement
const unitCard = document.getElementById('unitCard') as HTMLElement
const unitName = document.getElementById('unitName') as HTMLElement
const notConnectedCard = document.getElementById('notConnectedCard') as HTMLElement
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
const tokenSpinner = document.getElementById('tokenSpinner') as HTMLElement
const clearTokenBtn = document.getElementById('clearTokenBtn') as HTMLButtonElement
const tokenInfoText = document.getElementById('tokenInfoText') as HTMLElement

// State
let isOnRosterPage = false
let isConnected = false
let currentTabId: number | null = null
let currentUnitName: string | null = null

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await checkStatus()
  await checkCurrentPage()

  // Token input handler - validate on paste/change
  tokenInput.addEventListener('input', handleTokenInput)
  tokenInput.addEventListener('paste', () => {
    // Small delay to let paste complete
    setTimeout(handleTokenInput, 50)
  })

  // Clear token button handler
  clearTokenBtn.addEventListener('click', handleClearToken)

  // Sync button handler
  syncBtn.addEventListener('click', handleSync)
})

async function checkStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'checkAuth' })

    if (response.authenticated && response.unitName) {
      setConnected(response.unitName)
    } else {
      // Check if we have a token that might be invalid
      const status = await chrome.runtime.sendMessage({ action: 'getStatus' })
      if (status.hasToken) {
        // Token exists but validation failed - show as invalid
        setNotConnected('Token invalid or expired')
      } else {
        setNotConnected('Not Connected')
      }
    }
  } catch {
    setNotConnected('Connection Error')
  }

  updateSyncButton()
}

function setConnected(unitDisplayName: string) {
  isConnected = true
  currentUnitName = unitDisplayName

  // Show connected card, hide not connected
  unitCard.style.display = 'block'
  notConnectedCard.style.display = 'none'
  unitName.textContent = unitDisplayName

  // Update token input area
  tokenInput.value = '••••••••••••••••'
  tokenInput.disabled = true
  clearTokenBtn.classList.remove('hidden')
  tokenInfoText.innerHTML = `Connected to <strong>${unitDisplayName}</strong>`
}

function setNotConnected(status: string) {
  isConnected = false
  currentUnitName = null

  // Show not connected card, hide connected
  unitCard.style.display = 'none'
  notConnectedCard.style.display = 'block'
  connectionStatus.textContent = status

  // Update token input area
  tokenInput.value = ''
  tokenInput.disabled = false
  clearTokenBtn.classList.add('hidden')
  tokenInfoText.innerHTML = 'Get a token from <a href="https://chuckbox.app/settings/integrations" target="_blank" class="link">ChuckBox Settings</a>'
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

    // Try to ping content script, inject if needed
    const pingSuccess = await pingOrInjectContentScript(tab.id)

    if (pingSuccess) {
      // On Scoutbook with content script ready - enable sync
      pageDot.className = 'status-dot green'
      pageStatus.textContent = 'Ready'
      isOnRosterPage = true // Enable sync button
      infoText.textContent = 'Click "Sync Roster" to import your roster to ChuckBox.'
    } else {
      setPageNotReady('Unable to connect')
    }
  } catch {
    setPageNotReady('Error')
  }

  updateSyncButton()
}

async function pingOrInjectContentScript(tabId: number): Promise<boolean> {
  // First, try to ping the content script
  try {
    await chrome.tabs.sendMessage(tabId, { action: 'ping' })
    return true
  } catch {
    // Content script not loaded, try to inject it
    console.log('[Chuckbox] Content script not found, injecting...')
  }

  // Inject the content script programmatically
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
    })
    console.log('[Chuckbox] Content script injected successfully')

    // Wait a moment for the script to initialize
    await new Promise((resolve) => setTimeout(resolve, 200))

    // Verify it's working
    try {
      await chrome.tabs.sendMessage(tabId, { action: 'ping' })
      return true
    } catch {
      console.error('[Chuckbox] Content script injected but not responding')
      return false
    }
  } catch (error) {
    console.error('[Chuckbox] Failed to inject content script:', error)
    return false
  }
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

async function handleTokenInput() {
  const token = tokenInput.value.trim()

  // Ignore if empty, masked, or too short
  if (!token || token.includes('•') || token.length < 20) {
    return
  }

  // Show validating state
  tokenSpinner.classList.remove('hidden')
  tokenInput.disabled = true
  hideError()

  try {
    // Save token first
    await chrome.runtime.sendMessage({ action: 'setToken', token })

    // Then validate it
    const response = await chrome.runtime.sendMessage({ action: 'checkAuth' })

    if (response.authenticated && response.unitName) {
      setConnected(response.unitName)
      showSuccess(`Connected to ${response.unitName}`)
    } else {
      // Token is invalid
      setNotConnected('Token invalid or expired')
      showError('Token is invalid or expired. Generate a new one in ChuckBox Settings.')
      // Clear the invalid token
      await chrome.runtime.sendMessage({ action: 'setToken', token: '' })
    }
  } catch (error) {
    showError('Failed to validate token. Check your connection.')
    setNotConnected('Connection Error')
  } finally {
    tokenSpinner.classList.add('hidden')
    updateSyncButton()
  }
}

async function handleClearToken() {
  try {
    // Clear token from storage
    await chrome.runtime.sendMessage({ action: 'setToken', token: '' })
    setNotConnected('Not Connected')
    tokenInput.focus()
    hideSuccess()
    await checkStatus()
  } catch (error) {
    showError('Failed to disconnect')
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
  showProgress('Preparing...', 5)
  setSyncing(true)

  try {
    // Step 1: Check if on roster page, navigate if needed
    const pingResponse = await chrome.tabs.sendMessage(currentTabId, { action: 'ping' })

    if (!pingResponse.isRosterPage) {
      setProgress('Navigating to roster...', 10)
      const navResponse = await chrome.tabs.sendMessage(currentTabId, { action: 'navigateToRoster' })

      if (!navResponse.success) {
        throw new Error(navResponse.error || 'Could not navigate to roster page')
      }

      // Wait a moment for page to fully load after navigation
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Step 2: Extract HTML from content script
    setProgress('Extracting roster data...', 15)
    const extractResponse = await chrome.tabs.sendMessage(currentTabId, { action: 'extract' })

    if (!extractResponse.success) {
      throw new Error(extractResponse.error || 'Failed to extract roster')
    }

    // Show extraction complete and estimate pages
    const pageCount = (extractResponse.html.match(/<!-- PAGE BREAK -->/gi) || []).length + 1
    setProgress(`Extracted ${pageCount} page(s). Processing...`, 30)

    // Step 3: Send to Chuckbox API
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
        `<strong>Sync complete!</strong><br>` +
          `${parts.join(', ')}<br><br>` +
          `<a href="${baseUrlForLinks}/settings/integrations" target="_blank" class="link" style="font-weight: 500;">Review changes in ChuckBox →</a>`
      )
    }

    // Update view link - use stored API URL to determine base
    const status = await chrome.runtime.sendMessage({ action: 'getStatus' })
    const apiUrl = status.apiUrl || 'https://chuckbox.app/api'
    const baseUrl = apiUrl.replace('/api', '')
    viewInChuckbox.href = `${baseUrl}/settings/integrations`
    viewInChuckbox.classList.remove('hidden')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed'
    // Improve error messages
    if (message.includes('Rate limit')) {
      showError('Too many syncs. Please wait an hour before syncing again.')
    } else if (message.includes('Invalid') || message.includes('expired')) {
      showError('Token is invalid or expired. Generate a new one in ChuckBox Settings.')
    } else if (message.includes('roster')) {
      showError('Navigate to your Scoutbook roster page, then click Sync.')
    } else {
      showError(message)
    }
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
