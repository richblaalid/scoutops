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
  patrol: string | null
  is_active: boolean | null
  scout_accounts: { id: string } | null
}

interface BillingFormProps {
  unitId: string
  scouts: Scout[]
}

type BillingType = 'split' | 'fixed'

export function BillingForm({ unitId, scouts }: BillingFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [selectedScouts, setSelectedScouts] = useState<Set<string>>(new Set())
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [billingType, setBillingType] = useState<BillingType>('split')

  const parsedAmount = parseFloat(amount) || 0

  // Calculate per-scout and total based on billing type
  const perScoutAmount = billingType === 'split'
    ? (selectedScouts.size > 0 ? parsedAmount / selectedScouts.size : 0)
    : parsedAmount

  const totalAmount = billingType === 'split'
    ? parsedAmount
    : parsedAmount * selectedScouts.size

  const toggleScout = (scoutId: string) => {
    const newSelected = new Set(selectedScouts)
    if (newSelected.has(scoutId)) {
      newSelected.delete(scoutId)
    } else {
      newSelected.add(scoutId)
    }
    setSelectedScouts(newSelected)
  }

  const selectAll = () => {
    setSelectedScouts(new Set(scouts.map((s) => s.id)))
  }

  const selectNone = () => {
    setSelectedScouts(new Set())
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    if (selectedScouts.size === 0) {
      setError('Please select at least one scout')
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
      // Get the scout account IDs for selected scouts
      const selectedScoutAccounts = scouts
        .filter((s) => selectedScouts.has(s.id))
        .map((s) => ({
          scoutId: s.id,
          accountId: s.scout_accounts?.id,
          scoutName: `${s.first_name} ${s.last_name}`,
        }))

      // Check all scouts have accounts
      const missingAccounts = selectedScoutAccounts.filter((s) => !s.accountId)
      if (missingAccounts.length > 0) {
        setError(`Some scouts don't have accounts: ${missingAccounts.map((s) => s.scoutName).join(', ')}`)
        setIsLoading(false)
        return
      }

      const billingDate = new Date().toISOString().split('T')[0]

      // Create billing record
      const { data: billingRecord, error: billingError } = await (supabase as unknown as {
        from: (table: string) => {
          insert: (data: {
            unit_id: string
            description: string
            total_amount: number
            billing_date: string
          }) => {
            select: () => {
              single: () => Promise<{ data: { id: string } | null; error: Error | null }>
            }
          }
        }
      })
        .from('billing_records')
        .insert({
          unit_id: unitId,
          description,
          total_amount: totalAmount,
          billing_date: billingDate,
        })
        .select()
        .single()

      if (billingError || !billingRecord) throw billingError || new Error('Failed to create billing record')

      // Create billing charges for each scout
      const charges = selectedScoutAccounts.map((s) => ({
        billing_record_id: billingRecord.id,
        scout_account_id: s.accountId,
        amount: perScoutAmount,
        is_paid: false,
      }))

      const { error: chargesError } = await (supabase as unknown as {
        from: (table: string) => {
          insert: (data: typeof charges) => Promise<{ error: Error | null }>
        }
      })
        .from('billing_charges')
        .insert(charges)

      if (chargesError) throw chargesError

      // Create journal entry for the billing
      const entryDescription = billingType === 'split'
        ? `Fair Share: ${description}`
        : `Fixed Charge: ${description}`

      const { data: journalEntry, error: journalError } = await (supabase as unknown as {
        from: (table: string) => {
          insert: (data: {
            unit_id: string
            entry_date: string
            description: string
            entry_type: string
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
          entry_date: billingDate,
          description: entryDescription,
          entry_type: 'charge',
          is_posted: true,
        })
        .select()
        .single()

      if (journalError || !journalEntry) throw journalError || new Error('Failed to create journal entry')

      // Get accounts for journal lines
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
        .in('code', ['1200', '4100']) // Scout Accounts Receivable, Camping Fees

      const accounts = accountsData || []
      const receivableAccount = accounts.find((a) => a.code === '1200')
      const incomeAccount = accounts.find((a) => a.code === '4100')

      if (!receivableAccount || !incomeAccount) {
        throw new Error('Required accounts not found. Please contact support.')
      }

      // Create journal lines
      // Debit each scout's account (they owe money)
      const journalLines = selectedScoutAccounts.map((s) => ({
        journal_entry_id: journalEntry.id,
        account_id: receivableAccount.id,
        scout_account_id: s.accountId,
        debit: perScoutAmount,
        credit: 0,
        memo: `${s.scoutName} - ${description}`,
      }))

      // Credit income account (we earned the revenue)
      journalLines.push({
        journal_entry_id: journalEntry.id,
        account_id: incomeAccount.id,
        scout_account_id: null as unknown as string,
        debit: 0,
        credit: totalAmount,
        memo: description,
      })

      const { error: linesError } = await (supabase as unknown as {
        from: (table: string) => {
          insert: (data: typeof journalLines) => Promise<{ error: Error | null }>
        }
      })
        .from('journal_lines')
        .insert(journalLines)

      if (linesError) throw linesError

      // Update billing record with journal entry ID
      await (supabase as unknown as {
        from: (table: string) => {
          update: (data: { journal_entry_id: string }) => {
            eq: (col: string, val: string) => Promise<{ error: Error | null }>
          }
        }
      })
        .from('billing_records')
        .update({ journal_entry_id: journalEntry.id })
        .eq('id', billingRecord.id)

      setSuccess(true)
      setAmount('')
      setDescription('')
      setSelectedScouts(new Set())

      // Reload to show new record
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Group scouts by patrol
  const patrolGroups = scouts.reduce(
    (groups, scout) => {
      const patrol = scout.patrol || 'No Patrol'
      if (!groups[patrol]) {
        groups[patrol] = []
      }
      groups[patrol].push(scout)
      return groups
    },
    {} as Record<string, Scout[]>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Billing Type Toggle */}
      <div className="space-y-2">
        <Label>Billing Type</Label>
        <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
          <button
            type="button"
            onClick={() => setBillingType('split')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              billingType === 'split'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Split Total
          </button>
          <button
            type="button"
            onClick={() => setBillingType('fixed')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              billingType === 'fixed'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Fixed Amount
          </button>
        </div>
        <p className="text-sm text-gray-500">
          {billingType === 'split'
            ? 'Enter a total amount to split equally among selected scouts (e.g., camping trip costs)'
            : 'Enter an amount to charge each selected scout (e.g., annual dues)'}
        </p>
      </div>

      {/* Amount and Description */}
      <div className="flex gap-4">
        <div className="w-40 shrink-0 space-y-2">
          <Label htmlFor="amount">
            {billingType === 'split' ? 'Total Amount' : 'Per Scout'} *
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
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
        <div className="flex-1 space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Input
            id="description"
            required
            placeholder={billingType === 'split' ? 'e.g., Summer Camp 2024' : 'e.g., Annual Dues 2024'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      {/* Scout Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Select Scouts ({selectedScouts.size} selected)</Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Select All
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={selectNone}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto rounded-lg border p-4">
          {Object.entries(patrolGroups).map(([patrol, patrolScouts]) => (
            <div key={patrol} className="mb-4 last:mb-0">
              <h4 className="mb-2 text-sm font-medium text-gray-500">{patrol}</h4>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {patrolScouts.map((scout) => (
                  <label
                    key={scout.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border p-2 transition-colors ${
                      selectedScouts.has(scout.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedScouts.has(scout.id)}
                      onChange={() => toggleScout(scout.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm">
                      {scout.first_name} {scout.last_name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      {selectedScouts.size > 0 && parsedAmount > 0 && (
        <div className="rounded-lg bg-gray-50 p-4">
          <h4 className="font-medium text-gray-900">Billing Summary</h4>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Billing Type:</span>
              <span className="font-medium">
                {billingType === 'split' ? 'Split Total' : 'Fixed Amount Per Scout'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Scouts Selected:</span>
              <span className="font-medium">{selectedScouts.size}</span>
            </div>
            <div className="border-t border-gray-200 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Amount Per Scout:</span>
                <span className={`font-medium ${billingType === 'fixed' ? 'text-gray-900' : 'text-blue-600'}`}>
                  {formatCurrency(perScoutAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Total Amount:</span>
                <span className={`font-medium ${billingType === 'split' ? 'text-gray-900' : 'text-blue-600'}`}>
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
            {billingType === 'split' && (
              <p className="text-xs text-gray-500">
                {formatCurrency(parsedAmount)} ÷ {selectedScouts.size} scouts = {formatCurrency(perScoutAmount)} each
              </p>
            )}
            {billingType === 'fixed' && (
              <p className="text-xs text-gray-500">
                {formatCurrency(parsedAmount)} × {selectedScouts.size} scouts = {formatCurrency(totalAmount)} total
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">
          Billing created successfully! Refreshing...
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={isLoading || selectedScouts.size === 0 || parsedAmount <= 0}
        className="w-full"
      >
        {isLoading ? 'Creating...' : 'Create Billing'}
      </Button>
    </form>
  )
}
