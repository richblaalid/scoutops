import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getSquareClientForUnitPublic } from '@/lib/square/client'
import { randomUUID } from 'crypto'

interface RouteParams {
  params: Promise<{ token: string }>
}

interface ProcessPaymentRequest {
  sourceId: string // Payment token from Square Web Payments SDK
}

// Square fee: 2.6% + $0.10 per transaction
const SQUARE_FEE_PERCENT = 0.026
const SQUARE_FEE_FIXED_CENTS = 10

function calculateFee(amountCents: number): number {
  return Math.round(amountCents * SQUARE_FEE_PERCENT + SQUARE_FEE_FIXED_CENTS)
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params

    if (!token || token.length !== 64) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    const body: ProcessPaymentRequest = await request.json()
    const { sourceId } = body

    if (!sourceId) {
      return NextResponse.json({ error: 'Missing payment source' }, { status: 400 })
    }

    // Use service client to bypass RLS
    const supabase = await createServiceClient()

    // Fetch and validate payment link
    const { data: paymentLink, error: linkError } = await supabase
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
        billing_charge_id,
        scout_accounts (
          id,
          scout_id,
          scouts (
            first_name,
            last_name
          )
        )
      `
      )
      .eq('token', token)
      .single()

    if (linkError || !paymentLink) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 })
    }

    // Validate link status
    if (paymentLink.status !== 'pending') {
      return NextResponse.json(
        { error: `This payment link has already been ${paymentLink.status}` },
        { status: 400 }
      )
    }

    // Check expiration
    if (new Date(paymentLink.expires_at) < new Date()) {
      await supabase
        .from('payment_links')
        .update({ status: 'expired' })
        .eq('id', paymentLink.id)

      return NextResponse.json({ error: 'This payment link has expired' }, { status: 400 })
    }

    // Get Square client for this unit (using public/service client version)
    const squareClient = await getSquareClientForUnitPublic(paymentLink.unit_id)
    if (!squareClient) {
      return NextResponse.json(
        { error: 'Square is not connected for this unit' },
        { status: 400 }
      )
    }

    // Get the location ID from credentials
    const { data: squareCredentials } = await supabase
      .from('unit_square_credentials')
      .select('location_id')
      .eq('unit_id', paymentLink.unit_id)
      .eq('is_active', true)
      .single()

    const locationId = squareCredentials?.location_id
    if (!locationId) {
      return NextResponse.json({ error: 'No Square location found' }, { status: 400 })
    }

    const amountCents = paymentLink.amount
    const feeCents = calculateFee(amountCents)
    const netCents = amountCents - feeCents
    const amountDollars = amountCents / 100
    const feeDollars = feeCents / 100
    const netDollars = netCents / 100

    // Create idempotency key
    const idempotencyKey = randomUUID()

    // Get scout name for description
    const scoutAccount = paymentLink.scout_accounts as {
      id: string
      scout_id: string
      scouts: { first_name: string; last_name: string }
    }
    const scout = scoutAccount?.scouts
    const scoutName = scout ? `${scout.first_name} ${scout.last_name}` : 'Scout'
    const paymentNote = paymentLink.description || `Payment for ${scoutName}`

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
      referenceId: paymentLink.scout_account_id || undefined,
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
        unit_id: paymentLink.unit_id,
        entry_date: paymentDate,
        description: `Online payment from ${scoutName} (via payment link)`,
        entry_type: 'payment',
        reference: squarePayment.id,
        is_posted: true,
      })
      .select()
      .single()

    if (journalError || !journalEntry) {
      console.error('Failed to create journal entry:', journalError)
      // Payment succeeded in Square but failed to record
      return NextResponse.json(
        {
          error: 'Payment processed but failed to record. Please contact the unit.',
          squarePaymentId: squarePayment.id,
        },
        { status: 500 }
      )
    }

    // Get accounts for journal lines
    const { data: accountsData } = await supabase
      .from('accounts')
      .select('id, code')
      .eq('unit_id', paymentLink.unit_id)
      .in('code', ['1000', '1200', '5600']) // Bank, Scout AR, Payment Fees

    const accounts = accountsData || []
    const bankAccount = accounts.find((a) => a.code === '1000')
    const receivableAccount = accounts.find((a) => a.code === '1200')
    const feeAccount = accounts.find((a) => a.code === '5600')

    if (!bankAccount || !receivableAccount) {
      console.error('Required accounts not found')
      return NextResponse.json(
        {
          error: 'Payment processed but accounts not configured. Please contact the unit.',
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
        memo: `Online payment from ${scoutName}`,
      },
      // Credit scout's receivable (full amount to reduce what they owe)
      {
        journal_entry_id: journalEntry.id,
        account_id: receivableAccount.id,
        scout_account_id: paymentLink.scout_account_id,
        debit: 0,
        credit: amountDollars,
        memo: 'Payment received via payment link',
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

    const { error: linesError } = await supabase.from('journal_lines').insert(journalLines)

    if (linesError) {
      console.error('Failed to create journal lines:', linesError)
    }

    // Create payment record
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .insert({
        unit_id: paymentLink.unit_id,
        scout_account_id: paymentLink.scout_account_id,
        amount: amountDollars,
        fee_amount: feeDollars,
        net_amount: netDollars,
        payment_method: 'card',
        square_payment_id: squarePayment.id,
        square_receipt_url: squarePayment.receiptUrl,
        status: 'completed',
        journal_entry_id: journalEntry.id,
        notes: `${paymentNote} (via payment link)`,
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Failed to create payment record:', paymentError)
    }

    // If there's a billing charge, mark it as paid
    if (paymentLink.billing_charge_id) {
      await supabase
        .from('billing_charges')
        .update({ is_paid: true })
        .eq('id', paymentLink.billing_charge_id)
    }

    // Sync the transaction to square_transactions
    const cardDetails = squarePayment.cardDetails
    await supabase.from('square_transactions').insert({
      unit_id: paymentLink.unit_id,
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
      scout_account_id: paymentLink.scout_account_id,
      is_reconciled: true,
      square_created_at: squarePayment.createdAt!,
    })

    // Mark payment link as completed
    await supabase
      .from('payment_links')
      .update({
        status: 'completed',
        payment_id: paymentRecord?.id,
        completed_at: new Date().toISOString(),
      })
      .eq('id', paymentLink.id)

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
    console.error('Payment link payment error:', error)

    // Check for Square-specific errors
    if (error && typeof error === 'object' && 'errors' in error) {
      const squareErrors = (error as { errors: Array<{ detail?: string; code?: string }> }).errors
      const errorMessage = squareErrors?.[0]?.detail || 'Payment failed'
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 })
  }
}
