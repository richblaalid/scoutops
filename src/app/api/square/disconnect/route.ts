import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { disconnectSquare } from '@/lib/square/client'

export async function POST() {
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

    // Only admins can disconnect Square
    if (membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only unit admins can disconnect Square' },
        { status: 403 }
      )
    }

    await disconnectSquare(membership.unit_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Square disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Square' },
      { status: 500 }
    )
  }
}
