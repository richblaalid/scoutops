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
        base_amount,
        fee_amount,
        fees_passed_to_payer,
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

    // Validate scout account ID exists
    if (!paymentLink.scout_account_id) {
      return NextResponse.json({ error: 'Payment link is not associated with a scout account' }, { status: 400 })
    }

    // Get current balance from scout_accounts for live balance display
    const { data: scoutAccount } = await supabase
      .from('scout_accounts')
      .select('balance')
      .eq('id', paymentLink.scout_account_id)
      .single()

    // Current balance (negative = owes money)
    const currentBalance = scoutAccount?.balance || 0
    // Amount owed in cents (positive number)
    const currentBalanceCents = Math.round(Math.abs(currentBalance) * 100)

    // Get unit fee settings and logo for dynamic fee calculation
    const { data: unitSettings } = await supabase
      .from('units')
      .select('processing_fee_percent, processing_fee_fixed, pass_fees_to_payer, logo_url')
      .eq('id', paymentLink.unit_id)
      .single()

    const scout = (paymentLink.scout_accounts as { scouts: { first_name: string; last_name: string } })?.scouts
    const unit = paymentLink.units as { name: string }

    return NextResponse.json({
      id: paymentLink.id,
      // Original link amount (for reference)
      originalAmount: paymentLink.amount,
      // Live balance in cents
      currentBalanceCents,
      // Fee settings for client-side calculation
      feePercent: Number(unitSettings?.processing_fee_percent) || 0.026,
      feeFixedCents: Math.round((Number(unitSettings?.processing_fee_fixed) || 0.10) * 100),
      feesPassedToPayer: unitSettings?.pass_fees_to_payer || false,
      description: paymentLink.description,
      scoutName: scout ? `${scout.first_name} ${scout.last_name}` : 'Scout',
      scoutAccountId: paymentLink.scout_account_id,
      unitName: unit?.name || 'Scout Unit',
      unitLogoUrl: unitSettings?.logo_url || null,
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
