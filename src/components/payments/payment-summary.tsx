'use client'

import { formatCurrency } from '@/lib/utils'

interface PaymentSummaryProps {
  /** Payment amount in dollars */
  amount: number
  /** Whether to show processing fees */
  showFees: boolean
  /** Fee amount in dollars */
  feeAmount: number
  /** Net amount after fees in dollars */
  netAmount: number
  /** Current balance (optional, for showing new balance) */
  currentBalance?: number
  /** Whether a scout is selected (controls new balance display) */
  showNewBalance?: boolean
}

/**
 * Displays a summary of payment amounts, fees, and resulting balance.
 */
export function PaymentSummary({
  amount,
  showFees,
  feeAmount,
  netAmount,
  currentBalance = 0,
  showNewBalance = false,
}: PaymentSummaryProps) {
  if (amount <= 0) return null

  const newBalance = currentBalance + amount

  return (
    <div className="rounded-lg bg-stone-50 p-4">
      <h4 className="font-medium text-stone-900">Payment Summary</h4>
      <div className="mt-2 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-stone-500">Amount:</span>
          <span className="font-medium text-stone-900">{formatCurrency(amount)}</span>
        </div>
        {showFees && (
          <div className="flex justify-between text-stone-500">
            <span>Processing Fee (2.6% + $0.10):</span>
            <span>-{formatCurrency(feeAmount)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-stone-200 pt-1 font-medium">
          <span className="text-stone-700">Net to Unit:</span>
          <span className="text-stone-900">{formatCurrency(showFees ? netAmount : amount)}</span>
        </div>
        {showNewBalance && (
          <div className="flex justify-between border-t border-stone-200 pt-1">
            <span className="text-stone-500">New Balance:</span>
            <span className={newBalance < 0 ? 'text-error' : 'text-success'}>
              {formatCurrency(newBalance)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
