import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/resend'
import {
  generatePaymentRequestEmail,
  type LedgerEntry,
} from '@/lib/email/templates/payment-request'
import { randomBytes } from 'crypto'

interface CreatePaymentLinkRequest {
  scoutAccountId: string
  guardianProfileId: string
  amount?: number // in cents, if not provided uses balance owed
  description?: string
  customMessage?: string
}

function generateSecureToken(): string {
  return randomBytes(32).toString('hex') // 64 characters
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

    // Only admins and treasurers can create payment links
    if (!['admin', 'treasurer'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only admins and treasurers can create payment links' },
        { status: 403 }
      )
    }

    const body: CreatePaymentLinkRequest = await request.json()
    const { scoutAccountId, guardianProfileId, amount, description, customMessage } = body

    if (!scoutAccountId || !guardianProfileId) {
      return NextResponse.json(
        { error: 'Missing required fields: scoutAccountId, guardianProfileId' },
        { status: 400 }
      )
    }

    // Get scout account with scout info
    const { data: scoutAccount, error: scoutError } = await supabase
      .from('scout_accounts')
      .select(
        `
        id,
        scout_id,
        unit_id,
        balance,
        scouts (
          id,
          first_name,
          last_name
        )
      `
      )
      .eq('id', scoutAccountId)
      .eq('unit_id', membership.unit_id)
      .single()

    if (scoutError || !scoutAccount) {
      return NextResponse.json({ error: 'Scout account not found' }, { status: 404 })
    }

    // Verify guardian is linked to this scout
    const { data: guardianLink } = await supabase
      .from('scout_guardians')
      .select('id')
      .eq('scout_id', scoutAccount.scout_id)
      .eq('profile_id', guardianProfileId)
      .single()

    if (!guardianLink) {
      return NextResponse.json(
        { error: 'Guardian is not linked to this scout' },
        { status: 400 }
      )
    }

    // Get guardian profile for email
    const { data: guardian, error: guardianError } = await supabase
      .from('profiles')
      .select('id, email, full_name, first_name')
      .eq('id', guardianProfileId)
      .single()

    if (guardianError || !guardian || !guardian.email) {
      return NextResponse.json({ error: 'Guardian profile not found or has no email' }, { status: 404 })
    }

    // Get unit info
    const { data: unit } = await supabase
      .from('units')
      .select('name')
      .eq('id', membership.unit_id)
      .single()

    // Calculate amount - use provided amount or balance owed
    const balance = scoutAccount.balance || 0
    const amountCents = amount || Math.round(Math.abs(balance) * 100)

    if (amountCents < 100) {
      return NextResponse.json(
        { error: 'Minimum payment amount is $1.00' },
        { status: 400 }
      )
    }

    // Get ledger entries for the email
    const { data: journalLines } = await supabase
      .from('journal_lines')
      .select(
        `
        debit,
        credit,
        memo,
        journal_entries (
          entry_date,
          description,
          entry_type,
          is_posted,
          is_void
        )
      `
      )
      .eq('scout_account_id', scoutAccountId)
      .order('created_at', { ascending: false })
      .limit(20)

    const ledgerEntries: LedgerEntry[] = (journalLines || [])
      .filter((line) => {
        const entry = line.journal_entries as { is_posted: boolean; is_void: boolean } | null
        return entry?.is_posted && !entry?.is_void
      })
      .map((line) => {
        const entry = line.journal_entries as {
          entry_date: string
          description: string
          entry_type: string
        }
        return {
          date: entry.entry_date,
          description: line.memo || entry.description,
          type: entry.entry_type,
          debit: Number(line.debit) || 0,
          credit: Number(line.credit) || 0,
        }
      })
      .reverse() // Show oldest first

    // Generate secure token
    const token = generateSecureToken()

    // Set expiration (7 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create payment link record
    const { data: paymentLink, error: linkError } = await supabase
      .from('payment_links')
      .insert({
        unit_id: membership.unit_id,
        scout_account_id: scoutAccountId,
        amount: amountCents,
        description: description || `Payment for ${(scoutAccount.scouts as { first_name: string; last_name: string }).first_name} ${(scoutAccount.scouts as { first_name: string; last_name: string }).last_name}`,
        token,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (linkError || !paymentLink) {
      console.error('Failed to create payment link:', linkError)
      return NextResponse.json(
        { error: 'Failed to create payment link' },
        { status: 500 }
      )
    }

    // Generate payment URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const paymentUrl = `${baseUrl}/pay/${token}`

    // Generate email content
    const scout = scoutAccount.scouts as { first_name: string; last_name: string }
    const emailData = {
      guardianName: guardian.first_name || guardian.full_name || 'Parent',
      scoutName: `${scout.first_name} ${scout.last_name}`,
      unitName: unit?.name || 'Scout Unit',
      balance: balance, // negative = owes
      ledgerEntries,
      paymentUrl,
      customMessage,
    }

    const { html, text } = generatePaymentRequestEmail(emailData)

    // Send email
    try {
      await sendEmail({
        to: guardian.email,
        subject: `Payment Request for ${scout.first_name} ${scout.last_name} - ${unit?.name || 'Scout Unit'}`,
        html,
        text,
      })
    } catch (emailError) {
      console.error('Failed to send email:', emailError)
      // Don't fail the whole operation if email fails - the link is still valid
    }

    return NextResponse.json({
      success: true,
      paymentLink: {
        id: paymentLink.id,
        token,
        url: paymentUrl,
        amount: amountCents,
        expiresAt: expiresAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Create payment link error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment link' },
      { status: 500 }
    )
  }
}
