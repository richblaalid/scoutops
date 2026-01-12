'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { SQUARE_FEE_PERCENT, SQUARE_FEE_FIXED_DOLLARS } from '@/lib/billing'

interface RecordPaymentFormProps {
  unitId: string
  scoutAccountId: string
  scoutName: string
  currentBalance: number
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'card', label: 'Card (Manual Entry)' },
  { value: 'transfer', label: 'Bank Transfer' },
]

export function RecordPaymentForm({
  unitId,
  scoutAccountId,
  scoutName,
  currentBalance,
}: RecordPaymentFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [reference, setReference] = useState('')

  const parsedAmount = parseFloat(amount) || 0
  const isCard = paymentMethod === 'card'
  const feeAmount = isCard ? parsedAmount * SQUARE_FEE_PERCENT + SQUARE_FEE_FIXED_DOLLARS : 0
  const netAmount = parsedAmount - feeAmount

  const handlePayFullBalance = () => {
    if (currentBalance < 0) {
      setAmount(Math.abs(currentBalance).toFixed(2))
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    if (parsedAmount <= 0) {
      setError('Please enter a valid amount')
      setIsLoading(false)
      return
    }

    const supabase = createClient()

    try {
      const paymentDate = new Date().toISOString().split('T')[0]

      // Create journal entry for the payment
      const { data: journalEntry, error: journalError } = await supabase
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
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('id, code')
        .eq('unit_id', unitId)
        .in('code', ['1000', '1200', '5600'])

      const accounts = accountsData || []
      const bankAccount = accounts.find((a) => a.code === '1000')
      const receivableAccount = accounts.find((a) => a.code === '1200')
      const feeAccount = accounts.find((a) => a.code === '5600')

      if (!bankAccount || !receivableAccount) {
        throw new Error('Required accounts not found')
      }

      // Create journal lines
      const journalLines = [
        {
          journal_entry_id: journalEntry.id,
          account_id: bankAccount.id,
          scout_account_id: null,
          debit: netAmount,
          credit: 0,
          memo: `${paymentMethod} payment from ${scoutName}`,
        },
        {
          journal_entry_id: journalEntry.id,
          account_id: receivableAccount.id,
          scout_account_id: scoutAccountId,
          debit: 0,
          credit: parsedAmount,
          memo: `Payment received`,
        },
      ]

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

      const { error: linesError } = await supabase.from('journal_lines').insert(journalLines)

      if (linesError) throw linesError

      // Create payment record
      const { error: paymentError } = await supabase.from('payments').insert({
        unit_id: unitId,
        scout_account_id: scoutAccountId,
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

      setTimeout(() => {
        router.refresh()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Payment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
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
                {currentBalance < 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePayFullBalance}
                    className="whitespace-nowrap"
                  >
                    Full Balance
                  </Button>
                )}
              </div>
            </div>

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
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reference">Reference #</Label>
              <Input
                id="reference"
                placeholder="Check number, receipt #, etc."
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                placeholder="Optional notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {parsedAmount > 0 && (
            <div className="rounded-lg bg-stone-50 p-4">
              <div className="space-y-1 text-sm">
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
                <div className="flex justify-between border-t border-stone-200 pt-1">
                  <span className="text-stone-500">New Balance:</span>
                  <span className={currentBalance + parsedAmount < 0 ? 'text-error' : 'text-success'}>
                    {formatCurrency(currentBalance + parsedAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}

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

          <Button type="submit" disabled={isLoading || parsedAmount <= 0} className="w-full">
            {isLoading ? 'Recording...' : 'Record Payment'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
