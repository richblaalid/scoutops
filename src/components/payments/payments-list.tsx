'use client'

import { useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { VoidPaymentDialog } from './void-payment-dialog'
import { Ban } from 'lucide-react'

interface Payment {
  id: string
  amount: number
  fee_amount: number | null
  net_amount: number
  payment_method: string | null
  status: string | null
  created_at: string | null
  notes: string | null
  square_payment_id?: string | null
  voided_at?: string | null
  voided_by?: string | null
  void_reason?: string | null
  scout_account_id: string
  scout_accounts: {
    scouts: {
      first_name: string
      last_name: string
    } | null
  } | null
}

interface PaymentsListProps {
  payments: Payment[]
  canVoid: boolean
}

export function PaymentsList({ payments, canVoid }: PaymentsListProps) {
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [voidDialogOpen, setVoidDialogOpen] = useState(false)

  const handleVoidClick = (payment: Payment) => {
    setSelectedPayment(payment)
    setVoidDialogOpen(true)
  }

  const isVoidable = (payment: Payment) => {
    // Can only void manual payments (not Square payments) that haven't been voided
    return (
      canVoid &&
      !payment.square_payment_id &&
      !payment.voided_at
    )
  }

  if (payments.length === 0) {
    return <p className="text-stone-500">No payments recorded yet</p>
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-200 text-left text-sm font-medium text-stone-500">
              <th className="pb-3 pr-4">Date</th>
              <th className="pb-3 pr-4">Scout</th>
              <th className="pb-3 pr-4">Method</th>
              <th className="pb-3 pr-4 text-right">Amount</th>
              <th className="pb-3 pr-4 text-right">Fee</th>
              <th className="pb-3 pr-4 text-right">Net</th>
              {canVoid && <th className="pb-3 w-[80px]"></th>}
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => {
              const isVoided = !!payment.voided_at
              const scoutName = payment.scout_accounts?.scouts
                ? `${payment.scout_accounts.scouts.first_name} ${payment.scout_accounts.scouts.last_name}`
                : 'Unknown'

              return (
                <tr
                  key={payment.id}
                  className={`border-b border-stone-100 last:border-0 ${
                    isVoided ? 'bg-stone-50 opacity-60' : ''
                  }`}
                >
                  <td className="py-3 pr-4 text-stone-600">
                    {payment.created_at ? formatDate(payment.created_at) : '—'}
                  </td>
                  <td className="py-3 pr-4">
                    <p className={`font-medium ${isVoided ? 'text-stone-500 line-through' : 'text-stone-900'}`}>
                      {scoutName}
                    </p>
                    {payment.notes && !isVoided && (
                      <p className="text-xs text-stone-500">{payment.notes}</p>
                    )}
                    {isVoided && payment.void_reason && (
                      <p className="text-xs text-destructive">
                        VOIDED: {payment.void_reason}
                      </p>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-medium capitalize ${
                        isVoided
                          ? 'bg-stone-200 text-stone-500'
                          : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {payment.payment_method || 'unknown'}
                    </span>
                  </td>
                  <td
                    className={`py-3 pr-4 text-right font-medium ${
                      isVoided ? 'text-stone-400 line-through' : 'text-success'
                    }`}
                  >
                    {formatCurrency(payment.amount)}
                  </td>
                  <td
                    className={`py-3 pr-4 text-right ${
                      isVoided ? 'text-stone-400' : 'text-error'
                    }`}
                  >
                    {payment.fee_amount ? formatCurrency(payment.fee_amount) : '—'}
                  </td>
                  <td
                    className={`py-3 pr-4 text-right font-medium ${
                      isVoided ? 'text-stone-400 line-through' : 'text-stone-900'
                    }`}
                  >
                    {formatCurrency(payment.net_amount)}
                  </td>
                  {canVoid && (
                    <td className="py-3">
                      {isVoidable(payment) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVoidClick(payment)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                      {isVoided && (
                        <span className="text-xs text-stone-400">Voided</span>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Void Dialog */}
      {selectedPayment && (
        <VoidPaymentDialog
          payment={{
            ...selectedPayment,
            scout_name: selectedPayment.scout_accounts?.scouts
              ? `${selectedPayment.scout_accounts.scouts.first_name} ${selectedPayment.scout_accounts.scouts.last_name}`
              : undefined,
          }}
          open={voidDialogOpen}
          onOpenChange={setVoidDialogOpen}
        />
      )}
    </>
  )
}
