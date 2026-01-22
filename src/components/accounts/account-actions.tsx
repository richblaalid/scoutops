'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PaymentModal } from './payment-modal'
import { SendPaymentRequestModal } from './send-payment-request-modal'
import { UseFundsModal } from './use-funds-modal'
import { AddFundsModal } from './add-funds-modal'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronDown, ChevronUp, CreditCard, Wallet, Loader2 } from 'lucide-react'

// Dynamic import of PaymentEntry - defers Square SDK loading
const PaymentEntry = dynamic(
  () => import('@/components/payments/payment-entry').then(mod => ({ default: mod.PaymentEntry })),
  {
    loading: () => (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
        <span className="ml-2 text-sm text-stone-500">Loading...</span>
      </div>
    ),
    ssr: false,
  }
)

interface AccountActionsProps {
  scoutId: string
  scoutAccountId: string
  scoutName: string
  billingBalance: number
  fundsBalance: number
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
  billingBalance,
  fundsBalance,
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
  const [isUseFundsModalOpen, setIsUseFundsModalOpen] = useState(false)
  const isFinancialRole = userRole === 'admin' || userRole === 'treasurer'
  const owesBalance = billingBalance < 0
  const hasFunds = fundsBalance > 0
  const canUseFunds = hasFunds && owesBalance
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

        {/* Use Funds button - for parents when funds available and owes money */}
        {isParent && canUseFunds && (
          <>
            <Button
              onClick={() => setIsUseFundsModalOpen(true)}
              variant="outline"
              className="gap-2 border-success text-success hover:bg-success-light"
            >
              <Wallet className="h-4 w-4" />
              Use Scout Funds
            </Button>
            <UseFundsModal
              isOpen={isUseFundsModalOpen}
              onClose={() => setIsUseFundsModalOpen(false)}
              scoutAccountId={scoutAccountId}
              scoutName={scoutName}
              billingBalance={billingBalance}
              fundsBalance={fundsBalance}
            />
          </>
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
              currentBalance={billingBalance}
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
            balance={billingBalance}
          />
        )}

        {/* Financial role: Add Funds */}
        {isFinancialRole && unitId && (
          <AddFundsModal
            scoutAccountId={scoutAccountId}
            scoutName={scoutName}
            currentFundsBalance={fundsBalance}
            unitId={unitId}
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
              currentBalance={billingBalance}
              onPaymentComplete={() => setIsPaymentFormOpen(false)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
