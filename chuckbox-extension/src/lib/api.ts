/**
 * Chuckbox API Client
 *
 * Handles communication with the Chuckbox backend
 */

const API_BASE_URL = 'https://chuckbox.app/api'
const DEV_API_BASE_URL = 'http://localhost:3000/api'

interface SyncResponse {
  success: boolean
  sessionId: string
  staging: {
    toCreate: number
    toUpdate: number
    toSkip: number
    total: number
    adultsToCreate: number
    adultsToUpdate: number
    adultsTotal: number
  }
  usedAI: boolean
  message: string
}

interface TokenResponse {
  token: string
  expiresAt: string
  message: string
}

interface ErrorResponse {
  error: string
  details?: string
}

export class ChuckboxAPI {
  private baseUrl: string
  private token: string | null = null

  constructor(isDev = false) {
    this.baseUrl = isDev ? DEV_API_BASE_URL : API_BASE_URL
  }

  setToken(token: string | null) {
    this.token = token
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '')
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
      mode: 'cors',
    })

    const data = await response.json()

    if (!response.ok) {
      const error = data as ErrorResponse
      throw new Error(error.error || 'Request failed')
    }

    return data as T
  }

  /**
   * Send roster HTML to Chuckbox for processing
   */
  async syncRoster(html: string): Promise<SyncResponse> {
    return this.request<SyncResponse>('/scoutbook/extension-sync', {
      method: 'POST',
      body: JSON.stringify({ html }),
    })
  }

  /**
   * Check if the user has an active session with Chuckbox
   */
  async checkSession(): Promise<{ authenticated: boolean; unitName?: string }> {
    try {
      const response = await this.request<{ tokens: unknown[] }>('/scoutbook/extension-auth', {
        method: 'GET',
      })
      return { authenticated: true }
    } catch {
      return { authenticated: false }
    }
  }

  /**
   * Generate a new extension token
   */
  async generateToken(): Promise<TokenResponse> {
    return this.request<TokenResponse>('/scoutbook/extension-auth', {
      method: 'POST',
    })
  }
}

// Singleton instance
export const api = new ChuckboxAPI()
