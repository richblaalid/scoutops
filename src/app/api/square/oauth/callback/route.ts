import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens, saveSquareCredentials } from '@/lib/square/client'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const settingsUrl = `${baseUrl}/settings/integrations`

  // Handle OAuth errors from Square
  if (error) {
    console.error('Square OAuth error:', error, errorDescription)
    const errorUrl = new URL(settingsUrl)
    errorUrl.searchParams.set('error', errorDescription || error)
    return NextResponse.redirect(errorUrl)
  }

  if (!code || !state) {
    const errorUrl = new URL(settingsUrl)
    errorUrl.searchParams.set('error', 'Missing authorization code or state')
    return NextResponse.redirect(errorUrl)
  }

  try {
    // Parse state: format is "stateToken:unitId"
    const [stateToken, unitId] = state.split(':')

    if (!stateToken || !unitId) {
      const errorUrl = new URL(settingsUrl)
      errorUrl.searchParams.set('error', 'Invalid state parameter')
      return NextResponse.redirect(errorUrl)
    }

    // Verify state token from cookie
    const cookieStore = await cookies()
    const storedState = cookieStore.get('square_oauth_state')?.value

    if (!storedState || storedState !== stateToken) {
      const errorUrl = new URL(settingsUrl)
      errorUrl.searchParams.set('error', 'Invalid state - please try again')
      return NextResponse.redirect(errorUrl)
    }

    // Clear the state cookie
    cookieStore.delete('square_oauth_state')

    // Verify the user still has admin access to this unit
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      const errorUrl = new URL(settingsUrl)
      errorUrl.searchParams.set('error', 'Session expired - please log in again')
      return NextResponse.redirect(errorUrl)
    }

    // Get user's profile (profile_id is separate from auth user id)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      const errorUrl = new URL(settingsUrl)
      errorUrl.searchParams.set('error', 'Profile not found')
      return NextResponse.redirect(errorUrl)
    }

    const { data: membership } = await supabase
      .from('unit_memberships')
      .select('unit_id, role')
      .eq('profile_id', profile.id)
      .eq('unit_id', unitId)
      .eq('status', 'active')
      .single()

    if (!membership || membership.role !== 'admin') {
      const errorUrl = new URL(settingsUrl)
      errorUrl.searchParams.set('error', 'You do not have permission to connect Square for this unit')
      return NextResponse.redirect(errorUrl)
    }

    // Exchange the authorization code for tokens
    const tokens = await exchangeCodeForTokens(code)

    // Save the encrypted credentials
    await saveSquareCredentials(
      unitId,
      tokens.merchantId!,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.expiresAt!
    )

    // Redirect back to settings with success message
    const successUrl = new URL(settingsUrl)
    successUrl.searchParams.set('success', 'Square connected successfully')
    return NextResponse.redirect(successUrl)
  } catch (err) {
    console.error('Square OAuth callback error:', err)
    const errorUrl = new URL(settingsUrl)
    errorUrl.searchParams.set('error', 'Failed to connect Square account')
    return NextResponse.redirect(errorUrl)
  }
}
