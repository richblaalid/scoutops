import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Zod schema for fee settings validation
const updateFeeSettingsSchema = z.object({
  unitId: z.string().uuid('Invalid unit ID'),
  processingFeePercent: z.number().min(0, 'Fee percentage cannot be negative').max(0.1, 'Fee percentage cannot exceed 10%'),
  processingFeeFixed: z.number().min(0, 'Fixed fee cannot be negative').max(1, 'Fixed fee cannot exceed $1.00'),
  passFeesToPayer: z.boolean(),
})

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

    // Parse and validate request body
    const rawBody = await request.json()
    const parseResult = updateFeeSettingsSchema.safeParse(rawBody)

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]
      return NextResponse.json(
        { error: firstError?.message || 'Invalid request data' },
        { status: 400 }
      )
    }

    const { unitId, processingFeePercent, processingFeeFixed, passFeesToPayer } = parseResult.data

    // Get user's profile (profile_id is separate from auth user id)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
    }

    // Check user has admin role for this unit
    const { data: membership } = await supabase
      .from('unit_memberships')
      .select('role')
      .eq('profile_id', profile.id)
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
