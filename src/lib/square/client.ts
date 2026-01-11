import { SquareClient, SquareEnvironment } from 'square'
import { encrypt, decrypt } from '../encryption'
import { createClient, createServiceClient } from '../supabase/server'
import type { Database } from '@/types/database'

type SquareCredentials = Database['public']['Tables']['unit_square_credentials']['Row']

export function getSquareEnvironment(): SquareEnvironment {
  const env = process.env.SQUARE_ENVIRONMENT || 'sandbox'
  return env === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox
}

export function getSquareApplicationId(): string {
  const appId = process.env.SQUARE_APPLICATION_ID
  if (!appId) {
    throw new Error('SQUARE_APPLICATION_ID environment variable is not set')
  }
  return appId
}

export function getSquareApplicationSecret(): string {
  const secret = process.env.SQUARE_APPLICATION_SECRET
  if (!secret) {
    throw new Error('SQUARE_APPLICATION_SECRET environment variable is not set')
  }
  return secret
}

export function getOAuthRedirectUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/api/square/oauth/callback`
}

export function getOAuthAuthorizeUrl(state: string): string {
  const appId = getSquareApplicationId()
  const redirectUri = encodeURIComponent(getOAuthRedirectUrl())
  const env = getSquareEnvironment()

  const baseUrl =
    env === SquareEnvironment.Production
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com'

  const scopes = [
    'PAYMENTS_READ',
    'PAYMENTS_WRITE',
    'MERCHANT_PROFILE_READ',
    'ITEMS_READ',
    'ORDERS_READ',
  ].join('+')

  return `${baseUrl}/oauth2/authorize?client_id=${appId}&scope=${scopes}&session=false&state=${state}&redirect_uri=${redirectUri}`
}

export async function exchangeCodeForTokens(code: string) {
  const client = new SquareClient({ environment: getSquareEnvironment() })

  const response = await client.oAuth.obtainToken({
    clientId: getSquareApplicationId(),
    clientSecret: getSquareApplicationSecret(),
    code,
    grantType: 'authorization_code',
    redirectUri: getOAuthRedirectUrl(),
  })

  if (!response.accessToken || !response.refreshToken) {
    throw new Error('Failed to obtain tokens from Square')
  }

  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    expiresAt: response.expiresAt,
    merchantId: response.merchantId,
  }
}

export async function refreshAccessToken(refreshToken: string) {
  const client = new SquareClient({ environment: getSquareEnvironment() })

  const response = await client.oAuth.obtainToken({
    clientId: getSquareApplicationId(),
    clientSecret: getSquareApplicationSecret(),
    refreshToken,
    grantType: 'refresh_token',
  })

  if (!response.accessToken || !response.refreshToken) {
    throw new Error('Failed to refresh tokens from Square')
  }

  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    expiresAt: response.expiresAt,
  }
}

export async function revokeToken(accessToken: string) {
  const client = new SquareClient({ environment: getSquareEnvironment() })

  await client.oAuth.revokeToken({
    clientId: getSquareApplicationId(),
    accessToken,
  })
}

export async function getUnitSquareCredentials(
  unitId: string
): Promise<SquareCredentials | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('unit_square_credentials')
    .select('*')
    .eq('unit_id', unitId)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

// Service client version for public routes (bypasses RLS)
export async function getUnitSquareCredentialsPublic(
  unitId: string
): Promise<SquareCredentials | null> {
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('unit_square_credentials')
    .select('*')
    .eq('unit_id', unitId)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

async function getValidAccessToken(credentials: SquareCredentials): Promise<string> {
  const tokenExpiresAt = new Date(credentials.token_expires_at)
  const now = new Date()
  const bufferMinutes = 5

  // Check if token expires within 5 minutes
  const expiresWithinBuffer = tokenExpiresAt.getTime() - now.getTime() < bufferMinutes * 60 * 1000

  if (!expiresWithinBuffer) {
    return decrypt(credentials.access_token_encrypted)
  }

  // Need to refresh the token
  const currentRefreshToken = decrypt(credentials.refresh_token_encrypted)
  const newTokens = await refreshAccessToken(currentRefreshToken)

  // Update the stored credentials
  const supabase = await createClient()
  await supabase
    .from('unit_square_credentials')
    .update({
      access_token_encrypted: encrypt(newTokens.accessToken),
      refresh_token_encrypted: encrypt(newTokens.refreshToken),
      token_expires_at: newTokens.expiresAt,
    })
    .eq('id', credentials.id)

  return newTokens.accessToken
}

// Service client version for public routes
async function getValidAccessTokenPublic(credentials: SquareCredentials): Promise<string> {
  const tokenExpiresAt = new Date(credentials.token_expires_at)
  const now = new Date()
  const bufferMinutes = 5

  const expiresWithinBuffer = tokenExpiresAt.getTime() - now.getTime() < bufferMinutes * 60 * 1000

  if (!expiresWithinBuffer) {
    return decrypt(credentials.access_token_encrypted)
  }

  // Need to refresh the token
  const currentRefreshToken = decrypt(credentials.refresh_token_encrypted)
  const newTokens = await refreshAccessToken(currentRefreshToken)

  // Update the stored credentials using service client
  const supabase = await createServiceClient()
  await supabase
    .from('unit_square_credentials')
    .update({
      access_token_encrypted: encrypt(newTokens.accessToken),
      refresh_token_encrypted: encrypt(newTokens.refreshToken),
      token_expires_at: newTokens.expiresAt,
    })
    .eq('id', credentials.id)

  return newTokens.accessToken
}

export async function getSquareClientForUnit(unitId: string): Promise<SquareClient | null> {
  const credentials = await getUnitSquareCredentials(unitId)
  if (!credentials) {
    return null
  }

  const accessToken = await getValidAccessToken(credentials)

  return new SquareClient({
    environment: getSquareEnvironment(),
    token: accessToken,
  })
}

// Public version for unauthenticated routes (bypasses RLS)
export async function getSquareClientForUnitPublic(unitId: string): Promise<SquareClient | null> {
  const credentials = await getUnitSquareCredentialsPublic(unitId)
  if (!credentials) {
    return null
  }

  const accessToken = await getValidAccessTokenPublic(credentials)

  return new SquareClient({
    environment: getSquareEnvironment(),
    token: accessToken,
  })
}

export async function getDefaultLocationId(unitId: string): Promise<string | null> {
  const credentials = await getUnitSquareCredentials(unitId)
  if (credentials?.location_id) {
    return credentials.location_id
  }

  // Fetch the main location from Square
  const client = await getSquareClientForUnit(unitId)
  if (!client) {
    return null
  }

  const response = await client.locations.list()
  const mainLocation = response.locations?.find((loc) => loc.status === 'ACTIVE')

  if (mainLocation?.id) {
    // Cache the location_id
    const supabase = await createClient()
    await supabase
      .from('unit_square_credentials')
      .update({ location_id: mainLocation.id })
      .eq('unit_id', unitId)

    return mainLocation.id
  }

  return null
}

export async function saveSquareCredentials(
  unitId: string,
  merchantId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: string
) {
  const supabase = await createClient()

  const encryptedAccessToken = encrypt(accessToken)
  const encryptedRefreshToken = encrypt(refreshToken)

  // Upsert credentials (replace if exists)
  const { data, error } = await supabase
    .from('unit_square_credentials')
    .upsert(
      {
        unit_id: unitId,
        merchant_id: merchantId,
        access_token_encrypted: encryptedAccessToken,
        refresh_token_encrypted: encryptedRefreshToken,
        token_expires_at: expiresAt,
        environment: getSquareEnvironment() === SquareEnvironment.Production ? 'production' : 'sandbox',
        is_active: true,
        connected_at: new Date().toISOString(),
      },
      {
        onConflict: 'unit_id',
      }
    )
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to save Square credentials: ${error.message}`)
  }

  return data
}

export async function disconnectSquare(unitId: string) {
  const credentials = await getUnitSquareCredentials(unitId)

  if (credentials) {
    // Try to revoke the token from Square
    try {
      const accessToken = decrypt(credentials.access_token_encrypted)
      await revokeToken(accessToken)
    } catch {
      // Token may already be invalid, continue with disconnect
    }
  }

  // Mark as inactive in database
  const supabase = await createClient()
  const { error } = await supabase
    .from('unit_square_credentials')
    .update({ is_active: false })
    .eq('unit_id', unitId)

  if (error) {
    throw new Error(`Failed to disconnect Square: ${error.message}`)
  }
}
