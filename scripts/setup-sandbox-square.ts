/**
 * Setup Square sandbox credentials for local testing
 *
 * Usage: npx tsx scripts/setup-sandbox-square.ts
 */

import { createClient } from '@supabase/supabase-js'
import { randomBytes, createCipheriv } from 'crypto'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function encrypt(plaintext: string): string {
  const key = process.env.TOKEN_ENCRYPTION_KEY
  if (!key || key.length !== 64) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-character hex string')
  }

  const keyBuffer = Buffer.from(key, 'hex')
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv, { authTagLength: AUTH_TAG_LENGTH })

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

async function main() {
  // Sandbox credentials from Square Dashboard
  const SANDBOX_ACCESS_TOKEN = 'EAAAl4HNJfOpXWHrUUNTmAnY8cY9kcTKlKorCg-SAvQayCDD5r978KNZY9EnpYr6'
  const SANDBOX_LOCATION_ID = 'LM27T8R3W0XR6'
  const UNIT_ID = '10000000-0000-4000-a000-000000000001'

  // Check required env vars
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    console.error('Missing TOKEN_ENCRYPTION_KEY')
    process.exit(1)
  }

  // Create Supabase client with service role
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Encrypt the tokens
  const encryptedAccessToken = encrypt(SANDBOX_ACCESS_TOKEN)
  const encryptedRefreshToken = encrypt('sandbox-no-refresh-token')

  console.log('Encrypted access token:', encryptedAccessToken.substring(0, 50) + '...')

  // Delete any existing credentials for this unit
  const { error: deleteError } = await supabase
    .from('unit_square_credentials')
    .delete()
    .eq('unit_id', UNIT_ID)

  if (deleteError) {
    console.error('Error deleting existing credentials:', deleteError)
  } else {
    console.log('Cleared existing credentials for unit')
  }

  // Insert new sandbox credentials
  const { data, error } = await supabase
    .from('unit_square_credentials')
    .insert({
      unit_id: UNIT_ID,
      merchant_id: 'SANDBOX_MERCHANT',
      location_id: SANDBOX_LOCATION_ID,
      access_token_encrypted: encryptedAccessToken,
      refresh_token_encrypted: encryptedRefreshToken,
      token_expires_at: '2030-01-01T00:00:00Z',
      environment: 'sandbox',
      is_active: true,
      connected_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('Error inserting credentials:', error)
    process.exit(1)
  }

  console.log('✓ Sandbox Square credentials set up successfully!')
  console.log('  Unit ID:', UNIT_ID)
  console.log('  Location ID:', SANDBOX_LOCATION_ID)
  console.log('  Environment: sandbox')
  console.log('')
  console.log('You can now test payment links at http://localhost:3000')
}

main().catch(console.error)
