import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ token: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params

    if (!token || token.length !== 64) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    // Use service client to bypass RLS for public access
    const supabase = await createServiceClient()

    // Fetch payment link by token
    const { data: paymentLink, error } = await supabase
      .from('payment_links')
      .select(
        `
        id,
        amount,
        description,
        status,
        expires_at,
        unit_id,
        scout_account_id,
        units (
          name
        ),
        scout_accounts (
          scouts (
            first_name,
            last_name
          )
        )
      `
      )
      .eq('token', token)
      .single()

    if (error || !paymentLink) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 })
    }

    // Check if link is still valid
    if (paymentLink.status !== 'pending') {
      return NextResponse.json(
        {
          error: `This payment link has already been ${paymentLink.status}`,
          status: paymentLink.status,
        },
        { status: 400 }
      )
    }

    // Check expiration
    if (new Date(paymentLink.expires_at) < new Date()) {
      // Mark as expired
      await supabase
        .from('payment_links')
        .update({ status: 'expired' })
        .eq('id', paymentLink.id)

      return NextResponse.json(
        { error: 'This payment link has expired', status: 'expired' },
        { status: 400 }
      )
    }

    // Check if Square is connected for this unit and get location ID
    const { data: squareCredentials } = await supabase
      .from('unit_square_credentials')
      .select('id, location_id')
      .eq('unit_id', paymentLink.unit_id)
      .eq('is_active', true)
      .single()

    const scout = (paymentLink.scout_accounts as { scouts: { first_name: string; last_name: string } })?.scouts
    const unit = paymentLink.units as { name: string }

    return NextResponse.json({
      id: paymentLink.id,
      amount: paymentLink.amount,
      description: paymentLink.description,
      scoutName: scout ? `${scout.first_name} ${scout.last_name}` : 'Scout',
      unitName: unit?.name || 'Scout Unit',
      expiresAt: paymentLink.expires_at,
      squareEnabled: !!squareCredentials,
      squareLocationId: squareCredentials?.location_id || null,
    })
  } catch (error) {
    console.error('Get payment link error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment link' },
      { status: 500 }
    )
  }
}
