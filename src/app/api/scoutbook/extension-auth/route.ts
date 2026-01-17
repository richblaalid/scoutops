import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createExtensionToken,
  revokeExtensionToken,
  getActiveTokens,
} from '@/lib/auth/extension-auth'

/**
 * GET /api/scoutbook/extension-auth
 *
 * Get active extension tokens for the current user
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
    }

    const tokens = await getActiveTokens(supabase, profile.id)

    return NextResponse.json({ tokens })
  } catch (error) {
    console.error('Extension auth GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/scoutbook/extension-auth
 *
 * Generate a new extension auth token
 * Only admins and treasurers can generate tokens
 */
export async function POST() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
    }

    // Get user's unit membership - only admin/treasurer can generate tokens
    const { data: membership } = await supabase
      .from('unit_memberships')
      .select('unit_id, role')
      .eq('profile_id', profile.id)
      .eq('status', 'active')
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'No active unit membership' },
        { status: 403 }
      )
    }

    if (!['admin', 'treasurer'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only unit administrators can generate extension tokens' },
        { status: 403 }
      )
    }

    const { token, expiresAt } = await createExtensionToken(
      supabase,
      profile.id,
      membership.unit_id
    )

    return NextResponse.json({
      token,
      expiresAt: expiresAt.toISOString(),
      message:
        'Token generated successfully. Copy it now - it will not be shown again.',
    })
  } catch (error) {
    console.error('Extension auth POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/scoutbook/extension-auth
 *
 * Revoke an extension token
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const tokenId = searchParams.get('tokenId')

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Token ID required' },
        { status: 400 }
      )
    }

    await revokeExtensionToken(supabase, tokenId, profile.id)

    return NextResponse.json({ success: true, message: 'Token revoked' })
  } catch (error) {
    console.error('Extension auth DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
