import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface UpdateFeeSettingsRequest {
  unitId: string
  processingFeePercent: number
  processingFeeFixed: number
  passFeesToPayer: boolean
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: UpdateFeeSettingsRequest = await request.json()
    const { unitId, processingFeePercent, processingFeeFixed, passFeesToPayer } = body

    // Validate required fields
    if (!unitId) {
      return NextResponse.json({ error: 'Missing unit ID' }, { status: 400 })
    }

    // Validate fee values
    if (
      typeof processingFeePercent !== 'number' ||
      processingFeePercent < 0 ||
      processingFeePercent > 0.1 // Max 10%
    ) {
      return NextResponse.json(
        { error: 'Fee percentage must be between 0 and 10%' },
        { status: 400 }
      )
    }

    if (
      typeof processingFeeFixed !== 'number' ||
      processingFeeFixed < 0 ||
      processingFeeFixed > 1 // Max $1
    ) {
      return NextResponse.json(
        { error: 'Fixed fee must be between $0 and $1' },
        { status: 400 }
      )
    }

    // Check user has admin role for this unit
    const { data: membership } = await supabase
      .from('unit_memberships')
      .select('role')
      .eq('profile_id', user.id)
      .eq('unit_id', unitId)
      .eq('status', 'active')
      .single()

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only unit administrators can update fee settings' },
        { status: 403 }
      )
    }

    // Update the unit's fee settings
    const { error: updateError } = await supabase
      .from('units')
      .update({
        processing_fee_percent: processingFeePercent,
        processing_fee_fixed: processingFeeFixed,
        pass_fees_to_payer: passFeesToPayer,
      })
      .eq('id', unitId)

    if (updateError) {
      console.error('Failed to update fee settings:', updateError)
      return NextResponse.json(
        { error: 'Failed to update fee settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      settings: {
        processingFeePercent,
        processingFeeFixed,
        passFeesToPayer,
      },
    })
  } catch (error) {
    console.error('Update fee settings error:', error)
    return NextResponse.json(
      { error: 'Failed to update fee settings' },
      { status: 500 }
    )
  }
}
