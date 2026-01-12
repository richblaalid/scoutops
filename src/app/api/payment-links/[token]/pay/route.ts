import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getSquareClientForUnitPublic } from '@/lib/square/client'
import { createHash } from 'crypto'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ token: string }>
}

// Zod schema for process payment request validation
const processPaymentSchema = z.object({
  sourceId: z.string().min(1, 'Payment source is required'),
  amountCents: z.number().int().min(100, 'Minimum payment is $1.00').max(10000000, 'Maximum payment is $100,000').optional(),
})

// Square fee: 2.6% + $0.10 per transaction
const SQUARE_FEE_PERCENT = 0.026
const SQUARE_FEE_FIXED_CENTS = 10

// Map Square error codes to user-friendly messages
function sanitizeSquareError(error: unknown): string {
  if (error && typeof error === 'object' && 'errors' in error) {
    const squareErrors = (error as { errors: Array<{ code?: string; category?: string }> }).errors
    const firstError = squareErrors?.[0]

    // Map known error codes to friendly messages
    const errorMap: Record<string, string> = {
      'CARD_DECLINED': 'Your card was declined. Please try a different payment method.',
      'CVV_FAILURE': 'The security code (CVV) is incorrect. Please check and try again.',
      'ADDRESS_VERIFICATION_FAILURE': 'Address verification failed. Please check your billing address.',
      'INVALID_EXPIRATION': 'The card expiration date is invalid.',
      'EXPIRED_CARD': 'This card has expired. Please use a different card.',
      'INSUFFICIENT_FUNDS': 'Insufficient funds. Please try a different payment method.',
      'GENERIC_DECLINE': 'Your card was declined. Please try a different payment method.',
      'CARD_NOT_SUPPORTED': 'This card type is not supported. Please try a different card.',
      'INVALID_CARD': 'Invalid card number. Please check and try again.',
      'INVALID_LOCATION': 'Payment processing is temporarily unavailable.',
      'TRANSACTION_LIMIT': 'This payment exceeds your card\'s transaction limit.',
    }

    if (firstError?.code && errorMap[firstError.code]) {
      return errorMap[firstError.code]
    }

    // For payment-related errors, give a generic decline message
    if (firstError?.category === 'PAYMENT_METHOD_ERROR') {
      return 'Payment was declined. Please check your card details or try a different payment method.'
    }
  }

  // Default generic message - don't expose internal details
  return 'Unable to process payment. Please try again or contact support.'
}

function calculateFee(amountCents: number): number {
  return Math.round(amountCents * SQUARE_FEE_PERCENT + SQUARE_FEE_FIXED_CENTS)
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params

    if (!token || token.length !== 64) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    // Parse and validate request body
    const rawBody = await request.json()
    const parseResult = processPaymentSchema.safeParse(rawBody)

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]
      return NextResponse.json(
        { error: firstError?.message || 'Invalid request data' },
        { status: 400 }
      )
    }

    const { sourceId, amountCents: requestedAmountCents } = parseResult.data

    // Use service client to bypass RLS
    const supabase = await createServiceClient()

    // Fetch and validate payment link
    const { data: paymentLink, error: linkError } = await supabase
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

    // Validate scout account ID exists
    if (!paymentLink.scout_account_id) {
      return NextResponse.json({ error: 'Payment link is not associated with a scout account' }, { status: 400 })
    }

    // Get current balance from scout account
    const { data: scoutAccountBalance } = await supabase
      .from('scout_accounts')
      .select('balance')
      .eq('id', paymentLink.scout_account_id)
      .single()

    const currentBalance = scoutAccountBalance?.balance || 0
    const currentBalanceCents = Math.round(Math.abs(currentBalance) * 100)

    // Get unit fee settings
    const { data: unitSettings } = await supabase
      .from('units')
      .select('processing_fee_percent, processing_fee_fixed, pass_fees_to_payer')
      .eq('id', paymentLink.unit_id)
      .single()

    const feePercent = Number(unitSettings?.processing_fee_percent) || SQUARE_FEE_PERCENT
    const feeFixedCents = Math.round((Number(unitSettings?.processing_fee_fixed) || 0.10) * 100)
    const feesPassedToPayer = unitSettings?.pass_fees_to_payer || false

    // Use requested amount or fall back to current balance
    const baseAmountCents = requestedAmountCents || currentBalanceCents

    // Validate amount is within allowed range
    if (baseAmountCents < 100) {
      return NextResponse.json({ error: 'Minimum payment is $1.00' }, { status: 400 })
    }
    if (baseAmountCents > currentBalanceCents) {
      return NextResponse.json(
        { error: `Payment amount cannot exceed current balance of $${(currentBalanceCents / 100).toFixed(2)}` },
        { status: 400 }
      )
    }

    // Calculate fee if passed to payer
    let feeAmountCents = 0
    let totalAmountCents = baseAmountCents

    if (feesPassedToPayer) {
      feeAmountCents = Math.ceil((baseAmountCents * feePercent) + feeFixedCents)
      totalAmountCents = baseAmountCents + feeAmountCents
    }

    // Square still charges their fee on the total transaction
    const squareFeeCents = calculateFee(totalAmountCents)
    const netCents = totalAmountCents - squareFeeCents

    // Convert to dollars for accounting
    const totalAmountDollars = totalAmountCents / 100
    const baseAmountDollars = baseAmountCents / 100
    const squareFeeDollars = squareFeeCents / 100
    const netDollars = netCents / 100

    // Create a deterministic idempotency key to prevent duplicate payments on retry
    // Based on: payment link ID, amount, and source token (unique per card submission)
    const idempotencyKey = createHash('sha256')
      .update(`${paymentLink.id}-${totalAmountCents}-${sourceId}`)
      .digest('hex')
      .slice(0, 45) // Square idempotency keys max 45 chars

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
        amount: BigInt(totalAmountCents),
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
    // When fees are passed to payer:
    // - Scout is credited only the base amount (what they owed)
    // - Unit receives net after Square's fee, but fee is offset by payer's additional payment
    // When fees are absorbed by unit:
    // - Scout is credited the full amount they paid
    // - Unit pays Square's fee from their proceeds

    const journalLines: Array<{
      journal_entry_id: string
      account_id: string
      scout_account_id: string | null
      debit: number
      credit: number
      memo: string
    }> = []

    if (feesPassedToPayer && feeAmountCents > 0) {
      // Fees passed to payer: Scout credited base amount only
      // Bank receives net amount, fee expense balances the payer's fee contribution
      journalLines.push(
        // Debit bank account (net amount received from Square)
        {
          journal_entry_id: journalEntry.id,
          account_id: bankAccount.id,
          scout_account_id: null,
          debit: netDollars,
          credit: 0,
          memo: `Online payment from ${scoutName}`,
        },
        // Credit scout's receivable (base amount only - what they actually owed)
        {
          journal_entry_id: journalEntry.id,
          account_id: receivableAccount.id,
          scout_account_id: paymentLink.scout_account_id,
          debit: 0,
          credit: baseAmountDollars,
          memo: 'Payment received via payment link',
        }
      )

      // If there's a fee account and Square's fee is less than what payer paid in fees,
      // the difference would be income, but for simplicity we track Square fee as expense
      // and the payer's fee contribution offsets the total
      if (feeAccount && squareFeeDollars > 0) {
        journalLines.push({
          journal_entry_id: journalEntry.id,
          account_id: feeAccount.id,
          scout_account_id: null,
          debit: squareFeeDollars,
          credit: 0,
          memo: 'Square processing fee (paid by payer)',
        })
      }
    } else {
      // Fees absorbed by unit: Standard flow
      journalLines.push(
        // Debit bank account (net amount received)
        {
          journal_entry_id: journalEntry.id,
          account_id: bankAccount.id,
          scout_account_id: null,
          debit: netDollars,
          credit: 0,
          memo: `Online payment from ${scoutName}`,
        },
        // Credit scout's receivable (full amount they paid)
        {
          journal_entry_id: journalEntry.id,
          account_id: receivableAccount.id,
          scout_account_id: paymentLink.scout_account_id,
          debit: 0,
          credit: totalAmountDollars,
          memo: 'Payment received via payment link',
        }
      )

      // Add fee expense (unit pays this)
      if (feeAccount && squareFeeDollars > 0) {
        journalLines.push({
          journal_entry_id: journalEntry.id,
          account_id: feeAccount.id,
          scout_account_id: null,
          debit: squareFeeDollars,
          credit: 0,
          memo: 'Square processing fee',
        })
      }
    }

    const { error: linesError } = await supabase.from('journal_lines').insert(journalLines)

    if (linesError) {
      console.error('Failed to create journal lines:', linesError)
    }

    // Create payment record
    // Amount is what the scout was credited (base amount if fees passed to payer)
    const creditedAmount = feesPassedToPayer ? baseAmountDollars : totalAmountDollars
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .insert({
        unit_id: paymentLink.unit_id,
        scout_account_id: paymentLink.scout_account_id,
        amount: creditedAmount,
        fee_amount: squareFeeDollars,
        net_amount: netDollars,
        payment_method: 'card',
        square_payment_id: squarePayment.id,
        square_receipt_url: squarePayment.receiptUrl,
        status: 'completed',
        journal_entry_id: journalEntry.id,
        notes: feesPassedToPayer
          ? `${paymentNote} (via payment link, fee paid by payer)`
          : `${paymentNote} (via payment link)`,
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
      amount_money: totalAmountCents,
      fee_money: squareFeeCents,
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

    // Calculate remaining balance after this payment
    const remainingBalanceCents = currentBalanceCents - baseAmountCents
    const remainingBalanceDollars = remainingBalanceCents / 100

    // Only mark payment link as completed if full balance is paid
    if (remainingBalanceCents <= 0) {
      await supabase
        .from('payment_links')
        .update({
          status: 'completed',
          payment_id: paymentRecord?.id,
          completed_at: new Date().toISOString(),
        })
        .eq('id', paymentLink.id)
    }
    // Otherwise, keep the link active for additional payments

    return NextResponse.json({
      success: true,
      payment: {
        id: paymentRecord?.id,
        squarePaymentId: squarePayment.id,
        amount: totalAmountDollars,
        creditedAmount: creditedAmount,
        feeAmount: squareFeeDollars,
        netAmount: netDollars,
        feesPassedToPayer,
        receiptUrl: squarePayment.receiptUrl,
        status: squarePayment.status,
        remainingBalance: remainingBalanceDollars,
      },
    })
  } catch (error) {
    // Log full error for debugging but return sanitized message to client
    console.error('Payment link payment error:', error)

    const userMessage = sanitizeSquareError(error)
    return NextResponse.json({ error: userMessage }, { status: 400 })
  }
}
