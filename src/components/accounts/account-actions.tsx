'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PaymentModal } from './payment-modal'
import { SendPaymentRequestModal } from './send-payment-request-modal'
import { PaymentEntry } from '@/components/payments/payment-entry'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronDown, ChevronUp, CreditCard } from 'lucide-react'

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
  // Payment entry props (for financial roles)
  unitId?: string
  squareApplicationId?: string
  squareLocationId?: string | null
  squareEnvironment?: 'sandbox' | 'production'
}

export function AccountActions({
  scoutId,
  scoutAccountId,
  scoutName,
  balance,
  userRole,
  isParent,
  squareConfig,
  unitId,
  squareApplicationId,
  squareLocationId,
  squareEnvironment = 'sandbox',
}: AccountActionsProps) {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false)
  const isFinancialRole = userRole === 'admin' || userRole === 'treasurer'
  const owesBalance = balance < 0
  const canRecordPayment = isFinancialRole && unitId

  return (
    <div className="w-full space-y-4 sm:w-auto">
      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Financial role: Record Payment toggle */}
        {canRecordPayment && (
          <Button
            onClick={() => setIsPaymentFormOpen(!isPaymentFormOpen)}
            variant={isPaymentFormOpen ? 'default' : 'outline'}
            className="gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Record Payment
            {isPaymentFormOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        )}

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

        {/* Financial role: Send Payment Request */}
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

      {/* Collapsible Payment Form */}
      {canRecordPayment && isPaymentFormOpen && (
        <Card className="animate-in slide-in-from-top-2 duration-200">
          <CardContent className="pt-6">
            <PaymentEntry
              unitId={unitId}
              applicationId={squareApplicationId || ''}
              locationId={squareLocationId || null}
              environment={squareEnvironment}
              scoutAccountId={scoutAccountId}
              scoutName={scoutName}
              currentBalance={balance}
              onPaymentComplete={() => setIsPaymentFormOpen(false)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
