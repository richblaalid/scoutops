'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'

interface Guardian {
  id: string
  email: string | null
  full_name: string | null
  first_name: string | null
  is_primary: boolean
}

interface SendPaymentRequestModalProps {
  scoutAccountId: string
  scoutId: string
  scoutName: string
  balance: number // Current balance (negative = owes money)
}

export function SendPaymentRequestModal({
  scoutAccountId,
  scoutId,
  scoutName,
  balance,
}: SendPaymentRequestModalProps) {
  const [open, setOpen] = useState(false)
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [selectedGuardianId, setSelectedGuardianId] = useState('')
  const [amount, setAmount] = useState('')
  const [customMessage, setCustomMessage] = useState('')

  const amountOwed = Math.abs(balance)
  const owesAmount = balance < 0

  // Fetch guardians when dialog opens
  useEffect(() => {
    if (open) {
      fetchGuardians()
      // Pre-fill amount if scout owes money
      if (owesAmount) {
        setAmount(amountOwed.toFixed(2))
      }
    }
  }, [open, owesAmount, amountOwed])

  async function fetchGuardians() {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('scout_guardians')
        .select(
          `
          profile_id,
          is_primary,
          profiles (
            id,
            email,
            full_name,
            first_name
          )
        `
        )
        .eq('scout_id', scoutId)

      if (error) throw error

      const guardianList: Guardian[] = (data || [])
        .filter((g) => g.profiles && (g.profiles as { email: string | null }).email)
        .map((g) => ({
          id: (g.profiles as { id: string }).id,
          email: (g.profiles as { email: string | null }).email,
          full_name: (g.profiles as { full_name: string | null }).full_name,
          first_name: (g.profiles as { first_name: string | null }).first_name,
          is_primary: g.is_primary || false,
        }))

      setGuardians(guardianList)

      // Auto-select primary guardian if available
      const primary = guardianList.find((g) => g.is_primary)
      if (primary) {
        setSelectedGuardianId(primary.id)
      } else if (guardianList.length === 1) {
        setSelectedGuardianId(guardianList[0].id)
      }
    } catch (err) {
      console.error('Failed to fetch guardians:', err)
      setError('Failed to load guardians')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!selectedGuardianId) {
      setError('Please select a guardian')
      return
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount < 1) {
      setError('Minimum amount is $1.00')
      return
    }

    setSending(true)

    try {
      const response = await fetch('/api/payment-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scoutAccountId,
          guardianProfileId: selectedGuardianId,
          amount: Math.round(parsedAmount * 100), // Convert to cents
          description: `Payment for ${scoutName}`,
          customMessage: customMessage || undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send payment request')
      }

      const selectedGuardian = guardians.find((g) => g.id === selectedGuardianId)
      setSuccess(`Payment request sent to ${selectedGuardian?.email || 'guardian'}`)

      // Reset form after short delay
      setTimeout(() => {
        setOpen(false)
        setSelectedGuardianId('')
        setAmount('')
        setCustomMessage('')
        setSuccess(null)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send payment request')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-800"
          disabled={!owesAmount}
          title={owesAmount ? 'Send payment request email' : 'No balance owed'}
        >
          Send Payment Request
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Send Payment Request</DialogTitle>
          <DialogDescription>
            Email a payment link to {scoutName}&apos;s guardian. They&apos;ll receive a ledger
            summary and a secure link to pay online.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest-600 mx-auto"></div>
            <p className="mt-2 text-sm text-stone-500">Loading guardians...</p>
          </div>
        ) : guardians.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-stone-600">No guardians found for this scout.</p>
            <p className="mt-2 text-sm text-stone-500">
              Invite a parent/guardian from the Members page first.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Guardian Selection */}
            <div className="space-y-2">
              <Label htmlFor="guardian">Send To</Label>
              <select
                id="guardian"
                required
                disabled={sending}
                className="flex h-10 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2 disabled:opacity-50"
                value={selectedGuardianId}
                onChange={(e) => setSelectedGuardianId(e.target.value)}
              >
                <option value="">Select a guardian...</option>
                {guardians.map((guardian) => (
                  <option key={guardian.id} value={guardian.id}>
                    {guardian.full_name || guardian.first_name || 'Guardian'} ({guardian.email})
                    {guardian.is_primary ? ' - Primary' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  disabled={sending}
                  className="flex h-10 w-full rounded-md border border-stone-300 bg-white pl-7 pr-3 py-2 text-sm text-stone-900 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2 disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              {owesAmount && (
                <p className="text-xs text-stone-500">
                  Current balance owed: {formatCurrency(amountOwed)}
                </p>
              )}
            </div>

            {/* Custom Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Custom Message (Optional)</Label>
              <textarea
                id="message"
                disabled={sending}
                className="flex min-h-[80px] w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 ring-offset-background placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2 disabled:opacity-50"
                placeholder="Add a personal note to include in the email..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                maxLength={500}
              />
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                {success}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={sending || !selectedGuardianId}>
                {sending ? 'Sending...' : 'Send Payment Request'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
