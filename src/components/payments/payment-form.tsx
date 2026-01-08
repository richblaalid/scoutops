'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'

interface Scout {
  id: string
  first_name: string
  last_name: string
  scout_accounts: {
    id: string
    balance: number | null
  } | null
}

interface PaymentFormProps {
  unitId: string
  scouts: Scout[]
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'card', label: 'Card (Manual Entry)' },
  { value: 'transfer', label: 'Bank Transfer' },
]

// Simulated Square fee: 2.6% + $0.10 per transaction
const CARD_FEE_PERCENT = 0.026
const CARD_FEE_FIXED = 0.10

export function PaymentForm({ unitId, scouts }: PaymentFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [selectedScoutId, setSelectedScoutId] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [reference, setReference] = useState('')

  const parsedAmount = parseFloat(amount) || 0
  const isCard = paymentMethod === 'card'
  const feeAmount = isCard ? parsedAmount * CARD_FEE_PERCENT + CARD_FEE_FIXED : 0
  const netAmount = parsedAmount - feeAmount

  const selectedScout = scouts.find((s) => s.id === selectedScoutId)
  const scoutAccount = selectedScout?.scout_accounts
  const currentBalance = scoutAccount?.balance || 0

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    if (!selectedScoutId || !scoutAccount) {
      setError('Please select a scout')
      setIsLoading(false)
      return
    }

    if (parsedAmount <= 0) {
      setError('Please enter a valid amount')
      setIsLoading(false)
      return
    }

    const supabase = createClient()

    try {
      const paymentDate = new Date().toISOString().split('T')[0]
      const scoutName = `${selectedScout?.first_name} ${selectedScout?.last_name}`

      // Create journal entry for the payment
      const { data: journalEntry, error: journalError } = await (supabase as unknown as {
        from: (table: string) => {
          insert: (data: {
            unit_id: string
            entry_date: string
            description: string
            entry_type: string
            reference: string | null
            is_posted: boolean
          }) => {
            select: () => {
              single: () => Promise<{ data: { id: string } | null; error: Error | null }>
            }
          }
        }
      })
        .from('journal_entries')
        .insert({
          unit_id: unitId,
          entry_date: paymentDate,
          description: `Payment from ${scoutName}`,
          entry_type: 'payment',
          reference: reference || null,
          is_posted: true,
        })
        .select()
        .single()

      if (journalError || !journalEntry) {
        throw journalError || new Error('Failed to create journal entry')
      }

      // Get accounts
      const { data: accountsData } = await (supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              in: (col: string, vals: string[]) => Promise<{ data: { id: string; code: string }[] | null }>
            }
          }
        }
      })
        .from('accounts')
        .select('id, code')
        .eq('unit_id', unitId)
        .in('code', ['1000', '1200', '5600']) // Bank, Scout AR, Payment Fees

      const accounts = accountsData || []
      const bankAccount = accounts.find((a) => a.code === '1000')
      const receivableAccount = accounts.find((a) => a.code === '1200')
      const feeAccount = accounts.find((a) => a.code === '5600')

      if (!bankAccount || !receivableAccount) {
        throw new Error('Required accounts not found')
      }

      // Create journal lines
      const journalLines = [
        // Debit bank account (money received)
        {
          journal_entry_id: journalEntry.id,
          account_id: bankAccount.id,
          scout_account_id: null,
          debit: netAmount,
          credit: 0,
          memo: `${paymentMethod} payment from ${scoutName}`,
        },
        // Credit scout's receivable (reduce what they owe)
        {
          journal_entry_id: journalEntry.id,
          account_id: receivableAccount.id,
          scout_account_id: scoutAccount.id,
          debit: 0,
          credit: parsedAmount,
          memo: `Payment received`,
        },
      ]

      // If card payment, add fee expense
      if (isCard && feeAccount && feeAmount > 0) {
        journalLines.push({
          journal_entry_id: journalEntry.id,
          account_id: feeAccount.id,
          scout_account_id: null,
          debit: feeAmount,
          credit: 0,
          memo: 'Card processing fee',
        })
      }

      const { error: linesError } = await (supabase as unknown as {
        from: (table: string) => {
          insert: (data: typeof journalLines) => Promise<{ error: Error | null }>
        }
      })
        .from('journal_lines')
        .insert(journalLines)

      if (linesError) throw linesError

      // Create payment record
      const { error: paymentError } = await (supabase as unknown as {
        from: (table: string) => {
          insert: (data: {
            unit_id: string
            scout_account_id: string
            amount: number
            fee_amount: number
            net_amount: number
            payment_method: string
            status: string
            journal_entry_id: string
            notes: string | null
          }) => Promise<{ error: Error | null }>
        }
      })
        .from('payments')
        .insert({
          unit_id: unitId,
          scout_account_id: scoutAccount.id,
          amount: parsedAmount,
          fee_amount: feeAmount,
          net_amount: netAmount,
          payment_method: paymentMethod,
          status: 'completed',
          journal_entry_id: journalEntry.id,
          notes: notes || null,
        })

      if (paymentError) throw paymentError

      setSuccess(true)
      setAmount('')
      setNotes('')
      setReference('')
      setSelectedScoutId('')

      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Scout Selection */}
        <div className="space-y-2">
          <Label htmlFor="scout">Scout *</Label>
          <select
            id="scout"
            required
            className="flex h-10 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2"
            value={selectedScoutId}
            onChange={(e) => setSelectedScoutId(e.target.value)}
          >
            <option value="">Select a scout...</option>
            {scouts.map((scout) => {
              const balance = scout.scout_accounts?.balance || 0
              return (
                <option key={scout.id} value={scout.id}>
                  {scout.first_name} {scout.last_name} ({formatCurrency(balance)})
                </option>
              )
            })}
          </select>
          {selectedScout && (
            <p className="text-xs text-stone-500">
              Current balance:{' '}
              <span
                className={
                  currentBalance < 0
                    ? 'text-error'
                    : currentBalance > 0
                      ? 'text-success'
                      : ''
                }
              >
                {formatCurrency(currentBalance)}
              </span>
            </p>
          )}
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">
              $
            </span>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              required
              className="pl-7 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Payment Method */}
        <div className="space-y-2">
          <Label htmlFor="method">Payment Method *</Label>
          <select
            id="method"
            required
            className="flex h-10 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </div>

        {/* Reference */}
        <div className="space-y-2">
          <Label htmlFor="reference">Reference #</Label>
          <Input
            id="reference"
            placeholder="Check number, receipt #, etc."
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          placeholder="Optional notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Summary */}
      {parsedAmount > 0 && (
        <div className="rounded-lg bg-stone-50 p-4">
          <h4 className="font-medium text-stone-900">Payment Summary</h4>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500">Amount:</span>
              <span className="font-medium text-stone-900">{formatCurrency(parsedAmount)}</span>
            </div>
            {isCard && (
              <div className="flex justify-between text-error">
                <span>Processing Fee (2.6% + $0.10):</span>
                <span>-{formatCurrency(feeAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-stone-200 pt-1 font-medium">
              <span className="text-stone-700">Net to Bank:</span>
              <span className="text-success">{formatCurrency(netAmount)}</span>
            </div>
            {selectedScout && (
              <div className="flex justify-between border-t border-stone-200 pt-1">
                <span className="text-stone-500">New Balance:</span>
                <span
                  className={
                    currentBalance + parsedAmount < 0
                      ? 'text-error'
                      : 'text-success'
                  }
                >
                  {formatCurrency(currentBalance + parsedAmount)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error/Success */}
      {error && (
        <div className="rounded-lg bg-error-light p-3 text-sm font-medium text-error-dark">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-success-light p-3 text-sm font-medium text-success-dark">
          Payment recorded successfully! Refreshing...
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={isLoading || !selectedScoutId || parsedAmount <= 0}
        className="w-full"
      >
        {isLoading ? 'Recording...' : 'Record Payment'}
      </Button>
    </form>
  )
}
