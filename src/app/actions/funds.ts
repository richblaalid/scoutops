'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface ActionResult {
  success: boolean
  error?: string
  data?: unknown
}

export async function addFundsToScout(
  scoutAccountId: string,
  amount: number,
  fundraiserTypeId: string,
  notes?: string
): Promise<ActionResult> {
  const supabase = await createClient()

  // Verify user has permission
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get the scout account to find the unit
  const { data: scoutAccount, error: accountError } = await supabase
    .from('scout_accounts')
    .select(`
      id,
      unit_id,
      scout:scouts(id, first_name, last_name)
    `)
    .eq('id', scoutAccountId)
    .maybeSingle()

  if (accountError) {
    return { success: false, error: 'Failed to find scout account' }
  }

  if (!scoutAccount) {
    return { success: false, error: 'Scout account not found' }
  }

  // Verify user is admin or treasurer for this unit
  const { data: membership, error: membershipError } = await supabase
    .from('unit_memberships')
    .select('role')
    .eq('unit_id', scoutAccount.unit_id)
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError) {
    return { success: false, error: 'Failed to verify permissions' }
  }

  if (!membership || !['admin', 'treasurer'].includes(membership.role)) {
    return { success: false, error: 'Only admins and treasurers can add funds' }
  }

  // Validate amount
  if (amount <= 0) {
    return { success: false, error: 'Amount must be greater than 0' }
  }

  // Get fundraiser type name for description
  const { data: fundraiserType, error: typeError } = await supabase
    .from('fundraiser_types')
    .select('name')
    .eq('id', fundraiserTypeId)
    .maybeSingle()

  if (typeError || !fundraiserType) {
    return { success: false, error: 'Invalid fundraiser type' }
  }

  // Build description
  const scout = scoutAccount.scout as { first_name: string; last_name: string } | null
  const scoutName = scout ? `${scout.first_name} ${scout.last_name}` : 'Unknown Scout'
  const description = notes
    ? `${fundraiserType.name}: ${notes} - ${scoutName}`
    : `${fundraiserType.name} credit - ${scoutName}`

  // Use the existing RPC function
  const { data, error } = await supabase.rpc('credit_fundraising_to_scout', {
    p_scout_account_id: scoutAccountId,
    p_amount: amount,
    p_description: description,
    p_fundraiser_type: fundraiserType.name,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  // Update the journal entry with fundraiser_type_id for tracking
  const result = data as { success: boolean; journal_entry_id?: string; error?: string }
  if (result.success && result.journal_entry_id) {
    await supabase
      .from('journal_entries')
      .update({ fundraiser_type_id: fundraiserTypeId })
      .eq('id', result.journal_entry_id)
  }

  revalidatePath('/payments')
  revalidatePath('/accounts')
  revalidatePath(`/accounts/${scoutAccountId}`)

  return { success: true, data: result }
}

export async function voidPayment(
  paymentId: string,
  reason: string
): Promise<ActionResult> {
  const supabase = await createClient()

  // Verify user has permission
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get the payment to find the unit
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('id, unit_id, square_payment_id, voided_at')
    .eq('id', paymentId)
    .maybeSingle()

  if (paymentError) {
    return { success: false, error: 'Failed to find payment' }
  }

  if (!payment) {
    return { success: false, error: 'Payment not found' }
  }

  if (payment.voided_at) {
    return { success: false, error: 'Payment has already been voided' }
  }

  if (payment.square_payment_id) {
    return { success: false, error: 'Cannot void Square payments - use Square dashboard for refunds' }
  }

  // Verify user is admin for this unit
  const { data: membership, error: membershipError } = await supabase
    .from('unit_memberships')
    .select('role')
    .eq('unit_id', payment.unit_id)
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError) {
    return { success: false, error: 'Failed to verify permissions' }
  }

  if (!membership || membership.role !== 'admin') {
    return { success: false, error: 'Only admins can void payments' }
  }

  // Call the RPC function
  const { data, error } = await supabase.rpc('void_payment', {
    p_payment_id: paymentId,
    p_voided_by: user.id,
    p_reason: reason.trim(),
  })

  if (error) {
    return { success: false, error: error.message }
  }

  const result = data as { success: boolean; error?: string; reversal_entry_id?: string }
  if (!result.success) {
    return { success: false, error: result.error || 'Failed to void payment' }
  }

  revalidatePath('/payments')
  revalidatePath('/accounts')

  return { success: true, data: result }
}
