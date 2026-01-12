'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { SquareCard } from '@/types/square'

interface PaymentLinkData {
  id: string
  currentBalanceCents: number
  feePercent: number
  feeFixedCents: number
  feesPassedToPayer: boolean
  description: string
  scoutName: string
  scoutAccountId: string
  unitName: string
  expiresAt: string
  squareEnabled: boolean
  squareLocationId: string | null
}

interface PaymentResult {
  id: string
  squarePaymentId: string
  amount: number
  creditedAmount: number
  feeAmount: number
  netAmount: number
  receiptUrl?: string
  status: string
  remainingBalance?: number
}

function formatCurrency(amountCents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amountCents / 100)
}

function formatDollars(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

const MIN_PAYMENT_CENTS = 100 // $1.00 minimum

export default function PaymentCheckoutPage() {
  const params = useParams()
  const token = params.token as string

  const [linkData, setLinkData] = useState<PaymentLinkData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)

  // Payment amount state (in dollars for input)
  const [paymentAmountInput, setPaymentAmountInput] = useState('')
  const [isCustomAmount, setIsCustomAmount] = useState(false)

  const cardContainerRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<SquareCard | null>(null)
  const [sdkReady, setSdkReady] = useState(false)
  const [cardLoading, setCardLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)

  const environment = process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT || 'sandbox'
  const applicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || ''
  const locationId = linkData?.squareLocationId || ''

  // Calculate fee and total based on entered amount
  const paymentCalculation = useMemo(() => {
    if (!linkData) return null

    const inputDollars = parseFloat(paymentAmountInput) || 0
    const baseAmountCents = Math.round(inputDollars * 100)

    // Validate amount
    const maxAmountCents = linkData.currentBalanceCents
    const isValid = baseAmountCents >= MIN_PAYMENT_CENTS && baseAmountCents <= maxAmountCents

    // Calculate fee if passed to payer
    let feeAmountCents = 0
    let totalAmountCents = baseAmountCents

    if (linkData.feesPassedToPayer && baseAmountCents > 0) {
      feeAmountCents = Math.ceil((baseAmountCents * linkData.feePercent) + linkData.feeFixedCents)
      totalAmountCents = baseAmountCents + feeAmountCents
    }

    return {
      baseAmountCents,
      feeAmountCents,
      totalAmountCents,
      isValid,
      maxAmountCents,
    }
  }, [linkData, paymentAmountInput])

  // Fetch payment link data
  useEffect(() => {
    async function fetchLinkData() {
      try {
        const response = await fetch(`/api/payment-links/${token}`)
        const data = await response.json()

        if (!response.ok) {
          setLinkError(data.error || 'Invalid payment link')
          return
        }

        setLinkData(data)
        // Set default amount to full balance
        const balanceDollars = (data.currentBalanceCents / 100).toFixed(2)
        setPaymentAmountInput(balanceDollars)
      } catch {
        setLinkError('Failed to load payment link')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchLinkData()
    }
  }, [token])

  // Load Square Web Payments SDK
  useEffect(() => {
    if (!linkData?.squareEnabled || paymentSuccess) return

    const sdkUrl =
      environment === 'production'
        ? 'https://web.squarecdn.com/v1/square.js'
        : 'https://sandbox.web.squarecdn.com/v1/square.js'

    if (window.Square) {
      setSdkReady(true)
      return
    }

    const script = document.createElement('script')
    script.src = sdkUrl
    script.async = true
    script.onload = () => setSdkReady(true)
    script.onerror = () => setError('Failed to load payment SDK')
    document.body.appendChild(script)

    return () => {
      const existingScript = document.querySelector(`script[src="${sdkUrl}"]`)
      if (existingScript) {
        existingScript.remove()
      }
    }
  }, [environment, linkData?.squareEnabled, paymentSuccess])

  // Initialize card payment form
  const initializeCard = useCallback(async () => {
    if (!window.Square || !cardContainerRef.current || !applicationId || !locationId) {
      return
    }

    try {
      setCardLoading(true)
      setError(null)

      if (cardRef.current) {
        await cardRef.current.destroy()
        cardRef.current = null
      }

      const payments = await window.Square.payments(applicationId, locationId)
      const card = await payments.card()
      await card.attach('#card-container')
      cardRef.current = card
      setCardLoading(false)
    } catch (err) {
      console.error('Failed to initialize Square card:', err)
      setError('Failed to initialize payment form')
      setCardLoading(false)
    }
  }, [applicationId, locationId])

  useEffect(() => {
    if (sdkReady && linkData?.squareEnabled && !paymentSuccess) {
      initializeCard()
    }

    return () => {
      if (cardRef.current) {
        cardRef.current.destroy().catch(console.error)
        cardRef.current = null
      }
    }
  }, [sdkReady, linkData?.squareEnabled, paymentSuccess, initializeCard])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!cardRef.current) {
      setError('Payment form not ready')
      return
    }

    if (!paymentCalculation?.isValid) {
      setError(`Please enter an amount between ${formatCurrency(MIN_PAYMENT_CENTS)} and ${formatCurrency(paymentCalculation?.maxAmountCents || 0)}`)
      return
    }

    setIsProcessing(true)

    try {
      const tokenResult = await cardRef.current.tokenize()

      if (tokenResult.status !== 'OK' || !tokenResult.token) {
        const errorMessage = tokenResult.errors?.[0]?.message || 'Card verification failed'
        setError(errorMessage)
        setIsProcessing(false)
        return
      }

      const response = await fetch(`/api/payment-links/${token}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceId: tokenResult.token,
          amountCents: paymentCalculation.baseAmountCents,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Payment failed')
      }

      setPaymentSuccess(true)
      setPaymentResult(result.payment)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Allow empty, numbers, and one decimal point with up to 2 decimal places
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setPaymentAmountInput(value)
      setIsCustomAmount(true)
    }
  }

  const handlePayFullBalance = () => {
    if (linkData) {
      setPaymentAmountInput((linkData.currentBalanceCents / 100).toFixed(2))
      setIsCustomAmount(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forest-600 mx-auto"></div>
          <p className="mt-4 text-stone-600">Loading payment details...</p>
        </div>
      </div>
    )
  }

  // Link error state
  if (linkError) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-stone-900 mb-2">Payment Link Invalid</h1>
          <p className="text-stone-600">{linkError}</p>
          <p className="mt-4 text-sm text-stone-500">
            Please contact your scout unit if you believe this is an error.
          </p>
        </div>
      </div>
    )
  }

  // Success state
  if (paymentSuccess && paymentResult) {
    const remainingBalance = paymentResult.remainingBalance ??
      (linkData ? (linkData.currentBalanceCents - (paymentResult.creditedAmount * 100)) / 100 : 0)

    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-stone-900 mb-2">Payment Successful!</h1>
          <p className="text-stone-600 mb-4">
            Your payment of {formatDollars(paymentResult.creditedAmount)} has been processed.
          </p>
          <div className="bg-stone-50 rounded-lg p-4 text-left text-sm">
            <div className="flex justify-between mb-2">
              <span className="text-stone-500">Amount Applied:</span>
              <span className="font-medium">{formatDollars(paymentResult.creditedAmount)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-stone-500">For:</span>
              <span className="font-medium">{linkData?.scoutName}</span>
            </div>
            {remainingBalance > 0 && (
              <div className="flex justify-between pt-2 border-t border-stone-200">
                <span className="text-stone-500">Remaining Balance:</span>
                <span className="font-medium text-amber-600">{formatDollars(remainingBalance)}</span>
              </div>
            )}
          </div>
          {paymentResult.receiptUrl && (
            <a
              href={paymentResult.receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-forest-600 hover:text-forest-700 font-medium"
            >
              View Receipt
            </a>
          )}
          {remainingBalance > 0 ? (
            <p className="mt-6 text-sm text-stone-500">
              You can make another payment using this same link.
              <button
                onClick={() => {
                  setPaymentSuccess(false)
                  setPaymentResult(null)
                  // Refresh link data to get updated balance
                  setLoading(true)
                  fetch(`/api/payment-links/${token}`)
                    .then(res => res.json())
                    .then(data => {
                      setLinkData(data)
                      setPaymentAmountInput((data.currentBalanceCents / 100).toFixed(2))
                      setIsCustomAmount(false)
                    })
                    .finally(() => setLoading(false))
                }}
                className="block mt-2 text-forest-600 hover:text-forest-700 font-medium"
              >
                Make Another Payment
              </button>
            </p>
          ) : (
            <p className="mt-6 text-sm text-stone-500">
              Your balance is now paid in full. You can close this window.
            </p>
          )}
        </div>
      </div>
    )
  }

  if (!linkData) {
    return null
  }

  // Zero balance state
  if (linkData.currentBalanceCents <= 0) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-stone-900 mb-2">No Balance Due</h1>
          <p className="text-stone-600">
            {linkData.scoutName}&apos;s account is up to date. No payment is needed at this time.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-stone-900">{linkData.unitName}</h1>
          <p className="text-stone-600">Secure Payment</p>
        </div>

        {/* Payment Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Balance Header */}
          <div className="bg-forest-600 text-white p-6 text-center">
            <p className="text-sm opacity-90 mb-1">Current Balance Due</p>
            <p className="text-4xl font-bold">{formatCurrency(linkData.currentBalanceCents)}</p>
            <p className="text-sm opacity-75 mt-1">for {linkData.scoutName}</p>
          </div>

          {/* Details */}
          <div className="p-6 border-b border-stone-200">
            <div className="space-y-3">
              {linkData.description && (
                <div className="flex justify-between">
                  <span className="text-stone-500">Description:</span>
                  <span className="text-stone-900 text-right max-w-[200px]">
                    {linkData.description}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-stone-100">
                <a
                  href={`/login?redirect=/accounts/${linkData.scoutAccountId}`}
                  className="text-sm text-forest-600 hover:text-forest-700 flex items-center justify-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  View full account details in Chuck Box
                </a>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {!linkData.squareEnabled ? (
              <div className="text-center py-8">
                <p className="text-stone-600">
                  Online payments are not available for this unit.
                </p>
                <p className="mt-2 text-sm text-stone-500">
                  Please contact your unit leader for alternative payment options.
                </p>
              </div>
            ) : (
              <>
                {/* Amount Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-stone-700">
                    Payment Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={paymentAmountInput}
                      onChange={handleAmountChange}
                      className="w-full pl-7 pr-4 py-3 border border-stone-300 rounded-lg text-lg font-medium focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-500">
                      Min: {formatCurrency(MIN_PAYMENT_CENTS)} · Max: {formatCurrency(linkData.currentBalanceCents)}
                    </span>
                    {isCustomAmount && (
                      <button
                        type="button"
                        onClick={handlePayFullBalance}
                        className="text-forest-600 hover:text-forest-700 font-medium"
                      >
                        Pay full balance
                      </button>
                    )}
                  </div>
                </div>

                {/* Fee Breakdown (if fees are passed to payer) */}
                {linkData.feesPassedToPayer && paymentCalculation && paymentCalculation.baseAmountCents > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-amber-800 mb-2">Payment Breakdown</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-amber-700">Payment Amount:</span>
                        <span className="text-amber-900">{formatCurrency(paymentCalculation.baseAmountCents)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-700">Processing Fee:</span>
                        <span className="text-amber-900">{formatCurrency(paymentCalculation.feeAmountCents)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-amber-200">
                        <span className="font-medium text-amber-800">Total Charge:</span>
                        <span className="font-medium text-amber-900">{formatCurrency(paymentCalculation.totalAmountCents)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Card Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-stone-700">
                    Card Details
                  </label>
                  <div
                    id="card-container"
                    ref={cardContainerRef}
                    className={`min-h-[50px] rounded-md border border-stone-300 bg-white p-3 ${
                      cardLoading ? 'animate-pulse bg-stone-100' : ''
                    }`}
                  >
                    {cardLoading && (
                      <div className="text-sm text-stone-500">Loading payment form...</div>
                    )}
                  </div>
                  <p className="text-xs text-stone-500">
                    Your payment is processed securely by Square.
                  </p>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={cardLoading || isProcessing || !paymentCalculation?.isValid}
                  className="w-full bg-forest-600 hover:bg-forest-700 text-white py-3 text-lg"
                >
                  {isProcessing
                    ? 'Processing...'
                    : `Pay ${formatCurrency(paymentCalculation?.totalAmountCents || 0)}`}
                </Button>
              </>
            )}
          </form>

          {/* Footer */}
          <div className="bg-stone-50 px-6 py-4 text-center text-xs text-stone-500">
            Powered by Chuckbox
          </div>
        </div>

        {/* Expiration Notice */}
        <p className="text-center text-sm text-stone-500 mt-4">
          This payment link expires on{' '}
          {new Date(linkData.expiresAt).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>
    </div>
  )
}
