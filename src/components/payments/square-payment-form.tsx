'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import { SQUARE_FEE_PERCENT, SQUARE_FEE_FIXED_DOLLARS } from '@/lib/billing'
import { trackPaymentInitiated, trackPaymentCompleted, trackPaymentFailed } from '@/lib/analytics'
import type { SquarePayments, SquareCard, SquareTokenResult } from '@/types/square'

interface Scout {
  id: string
  first_name: string
  last_name: string
  scout_accounts: {
    id: string
    balance: number | null
  } | null
}

interface SquarePaymentFormProps {
  applicationId: string
  locationId: string
  scouts: Scout[]
  environment: 'sandbox' | 'production'
  onPaymentComplete?: () => void
}

export function SquarePaymentForm({
  applicationId,
  locationId,
  scouts,
  environment,
  onPaymentComplete,
}: SquarePaymentFormProps) {
  const router = useRouter()
  const cardContainerRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<SquareCard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [selectedScoutId, setSelectedScoutId] = useState('')
  const [amount, setAmount] = useState('')
  const [sdkReady, setSdkReady] = useState(false)

  const parsedAmount = parseFloat(amount) || 0
  const feeAmount = parsedAmount > 0 ? parsedAmount * SQUARE_FEE_PERCENT + SQUARE_FEE_FIXED_DOLLARS : 0
  const netAmount = parsedAmount - feeAmount

  const selectedScout = scouts.find((s) => s.id === selectedScoutId)
  const scoutAccount = selectedScout?.scout_accounts
  const currentBalance = scoutAccount?.balance || 0

  // Load Square Web Payments SDK
  useEffect(() => {
    const sdkUrl =
      environment === 'production'
        ? 'https://web.squarecdn.com/v1/square.js'
        : 'https://sandbox.web.squarecdn.com/v1/square.js'

    // Check if already loaded
    if (window.Square) {
      setSdkReady(true)
      return
    }

    const script = document.createElement('script')
    script.src = sdkUrl
    script.async = true
    script.onload = () => setSdkReady(true)
    script.onerror = () => setError('Failed to load Square payment SDK')
    document.body.appendChild(script)

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector(`script[src="${sdkUrl}"]`)
      if (existingScript) {
        existingScript.remove()
      }
    }
  }, [environment])

  // Initialize card payment form
  const initializeCard = useCallback(async () => {
    if (!window.Square || !cardContainerRef.current) {
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Destroy existing card if any
      if (cardRef.current) {
        await cardRef.current.destroy()
        cardRef.current = null
      }

      const payments = await window.Square.payments(applicationId, locationId)
      const card = await payments.card()
      await card.attach('#card-container')
      cardRef.current = card
      setIsLoading(false)
    } catch (err) {
      console.error('Failed to initialize Square card:', err)
      setError('Failed to initialize payment form')
      setIsLoading(false)
    }
  }, [applicationId, locationId])

  useEffect(() => {
    if (sdkReady) {
      initializeCard()
    }

    return () => {
      // Cleanup card on unmount
      if (cardRef.current) {
        cardRef.current.destroy().catch(console.error)
        cardRef.current = null
      }
    }
  }, [sdkReady, initializeCard])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!cardRef.current) {
      setError('Payment form not ready')
      return
    }

    if (!selectedScoutId || !scoutAccount) {
      setError('Please select a scout')
      return
    }

    if (parsedAmount < 1) {
      setError('Minimum payment amount is $1.00')
      return
    }

    setIsProcessing(true)

    // Track payment initiated
    trackPaymentInitiated({
      amount: parsedAmount,
      scoutAccountId: scoutAccount.id,
      method: 'card',
    })

    try {
      // Tokenize the card
      const tokenResult = await cardRef.current.tokenize()

      if (tokenResult.status !== 'OK' || !tokenResult.token) {
        const errorMessage = tokenResult.errors?.[0]?.message || 'Card verification failed'
        setError(errorMessage)
        setIsProcessing(false)
        return
      }

      // Send payment to our API
      const response = await fetch('/api/square/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scoutAccountId: scoutAccount.id,
          amountCents: Math.round(parsedAmount * 100),
          sourceId: tokenResult.token,
          description: `Payment for ${selectedScout?.first_name} ${selectedScout?.last_name}`,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Payment failed')
      }

      // Track payment completed
      trackPaymentCompleted({
        amount: parsedAmount,
        fee: feeAmount,
        net: netAmount,
        scoutAccountId: scoutAccount.id,
        method: 'card',
      })

      setSuccess(true)
      setAmount('')
      setSelectedScoutId('')

      // Reinitialize the card form for next payment
      await initializeCard()

      if (onPaymentComplete) {
        onPaymentComplete()
      }

      // Refresh server components after delay to show updated balance
      setTimeout(() => {
        router.refresh()
      }, 2000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed'
      setError(errorMessage)

      // Track payment failed
      trackPaymentFailed({
        amount: parsedAmount,
        errorType: errorMessage,
        scoutAccountId: scoutAccount?.id,
      })
    } finally {
      setIsProcessing(false)
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
            disabled={isLoading || isProcessing}
            className="flex h-10 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2 disabled:opacity-50"
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
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="1"
              required
              disabled={isLoading || isProcessing}
              className="flex h-10 w-full rounded-md border border-stone-300 bg-white pl-7 pr-3 py-2 text-sm text-stone-900 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2 disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Card Input */}
      <div className="space-y-2">
        <Label>Card Details *</Label>
        <div
          id="card-container"
          ref={cardContainerRef}
          className={`min-h-[50px] rounded-md border border-stone-300 bg-white p-3 ${
            isLoading ? 'animate-pulse bg-stone-100' : ''
          }`}
        >
          {isLoading && (
            <div className="text-sm text-stone-500">Loading payment form...</div>
          )}
        </div>
        <p className="text-xs text-stone-500">
          Payments are processed securely by Square. Card details never touch our servers.
        </p>
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
            <div className="flex justify-between text-stone-500">
              <span>Processing Fee (2.6% + $0.10):</span>
              <span>-{formatCurrency(feeAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-stone-200 pt-1 font-medium">
              <span className="text-stone-700">Net to Unit:</span>
              <span className="text-stone-900">{formatCurrency(netAmount)}</span>
            </div>
            {selectedScout && (
              <div className="flex justify-between border-t border-stone-200 pt-1">
                <span className="text-stone-500">New Balance:</span>
                <span
                  className={
                    currentBalance + parsedAmount < 0 ? 'text-error' : 'text-success'
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
        <div className="rounded-lg bg-error-light p-3 text-sm font-medium text-error">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-success-light p-3 text-sm font-medium text-success">
          Payment processed successfully! Refreshing...
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={isLoading || isProcessing || !selectedScoutId || parsedAmount < 1}
        className="w-full"
      >
        {isProcessing ? 'Processing...' : isLoading ? 'Loading...' : `Pay ${parsedAmount > 0 ? formatCurrency(parsedAmount) : ''}`}
      </Button>
    </form>
  )
}
