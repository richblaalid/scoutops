import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getOAuthAuthorizeUrl } from '@/lib/square/client'
import { randomBytes } from 'crypto'

export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's active membership
    const { data: membership } = await supabase
      .from('unit_memberships')
      .select('unit_id, role')
      .eq('profile_id', user.id)
      .eq('status', 'active')
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No active membership found' }, { status: 403 })
    }

    // Only admins can connect Square
    if (membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only unit admins can connect Square' },
        { status: 403 }
      )
    }

    // Generate a secure state token that includes the unit_id
    const stateToken = randomBytes(16).toString('hex')
    const state = `${stateToken}:${membership.unit_id}`

    // Store the state in a cookie for verification on callback
    const cookieStore = await cookies()
    cookieStore.set('square_oauth_state', stateToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    })

    // Redirect to Square OAuth
    const authorizeUrl = getOAuthAuthorizeUrl(state)

    return NextResponse.redirect(authorizeUrl)
  } catch (error) {
    console.error('Square OAuth authorize error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Square authorization' },
      { status: 500 }
    )
  }
}
