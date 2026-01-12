'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PaymentModal } from './payment-modal'
import { SendPaymentRequestModal } from './send-payment-request-modal'

interface AccountActionsProps {
  scoutId: string
  scoutAccountId: string
  scoutName: string
  balance: number
  userRole: string
  isParent: boolean
  squareConfig: {
    applicationId: string
    locationId: string
    environment: 'sandbox' | 'production'
  } | null
}

export function AccountActions({
  scoutId,
  scoutAccountId,
  scoutName,
  balance,
  userRole,
  isParent,
  squareConfig,
}: AccountActionsProps) {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const isFinancialRole = userRole === 'admin' || userRole === 'treasurer'
  const owesBalance = balance < 0

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Parent actions */}
      {isParent && owesBalance && squareConfig && (
        <>
          <Button onClick={() => setIsPaymentModalOpen(true)}>Make a Payment</Button>
          <PaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            scoutAccountId={scoutAccountId}
            scoutName={scoutName}
            currentBalance={balance}
            applicationId={squareConfig.applicationId}
            locationId={squareConfig.locationId}
            environment={squareConfig.environment}
          />
        </>
      )}

      {/* Financial role actions */}
      {isFinancialRole && owesBalance && (
        <SendPaymentRequestModal
          scoutAccountId={scoutAccountId}
          scoutId={scoutId}
          scoutName={scoutName}
          balance={balance}
        />
      )}

      {/* Common actions */}
      <Link
        href={`/scouts/${scoutId}`}
        className="rounded-md bg-stone-100 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-200"
      >
        View Scout Profile
      </Link>
    </div>
  )
}
