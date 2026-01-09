import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSquareClientForUnit, getDefaultLocationId } from '@/lib/square/client'
import { randomUUID } from 'crypto'

interface CreatePaymentRequest {
  scoutAccountId: string
  amountCents: number
  sourceId: string // Payment token from Square Web Payments SDK
  description?: string
  billingChargeId?: string
}

// Square fee: 2.6% + $0.10 per transaction
const SQUARE_FEE_PERCENT = 0.026
const SQUARE_FEE_FIXED_CENTS = 10

function calculateFee(amountCents: number): number {
  return Math.round(amountCents * SQUARE_FEE_PERCENT + SQUARE_FEE_FIXED_CENTS)
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

    const body: CreatePaymentRequest = await request.json()
    const { scoutAccountId, amountCents, sourceId, description, billingChargeId } = body

    if (!scoutAccountId || !amountCents || !sourceId) {
      return NextResponse.json(
        { error: 'Missing required fields: scoutAccountId, amountCents, sourceId' },
        { status: 400 }
      )
    }

    if (amountCents < 100) {
      return NextResponse.json(
        { error: 'Minimum payment amount is $1.00' },
        { status: 400 }
      )
    }

    // Verify the scout account belongs to this unit
    const { data: scoutAccount } = await supabase
      .from('scout_accounts')
      .select('id, scout_id, unit_id, balance, scouts(first_name, last_name)')
      .eq('id', scoutAccountId)
      .eq('unit_id', membership.unit_id)
      .single()

    if (!scoutAccount) {
      return NextResponse.json({ error: 'Scout account not found' }, { status: 404 })
    }

    // Get Square client for this unit
    const squareClient = await getSquareClientForUnit(membership.unit_id)
    if (!squareClient) {
      return NextResponse.json(
        { error: 'Square is not connected for this unit' },
        { status: 400 }
      )
    }

    // Get the location ID
    const locationId = await getDefaultLocationId(membership.unit_id)
    if (!locationId) {
      return NextResponse.json(
        { error: 'No Square location found' },
        { status: 400 }
      )
    }

    // Calculate amounts
    const feeCents = calculateFee(amountCents)
    const netCents = amountCents - feeCents
    const amountDollars = amountCents / 100
    const feeDollars = feeCents / 100
    const netDollars = netCents / 100

    // Create an idempotency key to prevent duplicate payments
    const idempotencyKey = randomUUID()

    // Get scout name for description
    const scout = scoutAccount.scouts as { first_name: string; last_name: string } | null
    const scoutName = scout ? `${scout.first_name} ${scout.last_name}` : 'Unknown Scout'
    const paymentNote = description || `Payment for ${scoutName}`

    // Create payment in Square
    const squareResponse = await squareClient.payments.create({
      sourceId,
      idempotencyKey,
      amountMoney: {
        amount: BigInt(amountCents),
        currency: 'USD',
      },
      locationId,
      note: paymentNote,
      referenceId: scoutAccountId,
    })

    if (!squareResponse.payment) {
      return NextResponse.json(
        { error: 'Failed to create payment in Square' },
        { status: 500 }
      )
    }

    const squarePayment = squareResponse.payment

    // Check if payment was successful
    if (squarePayment.status !== 'COMPLETED') {
      return NextResponse.json(
        {
          error: `Payment ${squarePayment.status?.toLowerCase()}`,
          status: squarePayment.status,
        },
        { status: 400 }
      )
    }

    // Create journal entry for the payment
    const paymentDate = new Date().toISOString().split('T')[0]

    const { data: journalEntry, error: journalError } = await supabase
      .from('journal_entries')
      .insert({
        unit_id: membership.unit_id,
        entry_date: paymentDate,
        description: `Square payment from ${scoutName}`,
        entry_type: 'payment',
        reference: squarePayment.id,
        is_posted: true,
      })
      .select()
      .single()

    if (journalError || !journalEntry) {
      console.error('Failed to create journal entry:', journalError)
      // Payment succeeded in Square but failed to record - this needs attention
      return NextResponse.json(
        {
          error: 'Payment processed but failed to record. Please contact support.',
          squarePaymentId: squarePayment.id,
        },
        { status: 500 }
      )
    }

    // Get accounts for journal lines
    const { data: accountsData } = await supabase
      .from('accounts')
      .select('id, code')
      .eq('unit_id', membership.unit_id)
      .in('code', ['1000', '1200', '5600']) // Bank, Scout AR, Payment Fees

    const accounts = accountsData || []
    const bankAccount = accounts.find((a) => a.code === '1000')
    const receivableAccount = accounts.find((a) => a.code === '1200')
    const feeAccount = accounts.find((a) => a.code === '5600')

    if (!bankAccount || !receivableAccount) {
      console.error('Required accounts not found')
      return NextResponse.json(
        {
          error: 'Payment processed but accounts not configured. Please contact support.',
          squarePaymentId: squarePayment.id,
        },
        { status: 500 }
      )
    }

    // Create journal lines
    const journalLines = [
      // Debit bank account (net amount received)
      {
        journal_entry_id: journalEntry.id,
        account_id: bankAccount.id,
        scout_account_id: null,
        debit: netDollars,
        credit: 0,
        memo: `Square payment from ${scoutName}`,
      },
      // Credit scout's receivable (full amount to reduce what they owe)
      {
        journal_entry_id: journalEntry.id,
        account_id: receivableAccount.id,
        scout_account_id: scoutAccountId,
        debit: 0,
        credit: amountDollars,
        memo: 'Payment received via Square',
      },
    ]

    // Add fee expense if we have the fee account
    if (feeAccount && feeDollars > 0) {
      journalLines.push({
        journal_entry_id: journalEntry.id,
        account_id: feeAccount.id,
        scout_account_id: null,
        debit: feeDollars,
        credit: 0,
        memo: 'Square processing fee',
      })
    }

    const { error: linesError } = await supabase
      .from('journal_lines')
      .insert(journalLines)

    if (linesError) {
      console.error('Failed to create journal lines:', linesError)
    }

    // Create payment record
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .insert({
        unit_id: membership.unit_id,
        scout_account_id: scoutAccountId,
        amount: amountDollars,
        fee_amount: feeDollars,
        net_amount: netDollars,
        payment_method: 'card',
        square_payment_id: squarePayment.id,
        square_receipt_url: squarePayment.receiptUrl,
        status: 'completed',
        journal_entry_id: journalEntry.id,
        notes: paymentNote,
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Failed to create payment record:', paymentError)
    }

    // If there's a billing charge, mark it as paid
    if (billingChargeId) {
      await supabase
        .from('billing_charges')
        .update({ is_paid: true })
        .eq('id', billingChargeId)
        .eq('scout_account_id', scoutAccountId)
    }

    // Sync the transaction to square_transactions
    const cardDetails = squarePayment.cardDetails
    await supabase.from('square_transactions').insert({
      unit_id: membership.unit_id,
      square_payment_id: squarePayment.id!,
      square_order_id: squarePayment.orderId,
      amount_money: amountCents,
      fee_money: feeCents,
      net_money: netCents,
      currency: 'USD',
      status: squarePayment.status!,
      source_type: squarePayment.sourceType,
      card_brand: cardDetails?.card?.cardBrand,
      last_4: cardDetails?.card?.last4,
      receipt_url: squarePayment.receiptUrl,
      receipt_number: squarePayment.receiptNumber,
      payment_id: paymentRecord?.id,
      scout_account_id: scoutAccountId,
      is_reconciled: true,
      square_created_at: squarePayment.createdAt!,
    })

    return NextResponse.json({
      success: true,
      payment: {
        id: paymentRecord?.id,
        squarePaymentId: squarePayment.id,
        amount: amountDollars,
        feeAmount: feeDollars,
        netAmount: netDollars,
        receiptUrl: squarePayment.receiptUrl,
        status: squarePayment.status,
      },
    })
  } catch (error) {
    console.error('Square payment error:', error)

    // Check for Square-specific errors
    if (error && typeof error === 'object' && 'errors' in error) {
      const squareErrors = (error as { errors: Array<{ detail?: string; code?: string }> }).errors
      const errorMessage = squareErrors?.[0]?.detail || 'Payment failed'
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
}
