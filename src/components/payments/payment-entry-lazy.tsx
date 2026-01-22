'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Dynamic import of PaymentEntry - defers Square SDK loading until needed
const PaymentEntry = dynamic(
  () => import('./payment-entry').then(mod => ({ default: mod.PaymentEntry })),
  {
    loading: () => (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
        <span className="ml-2 text-stone-500">Loading payment form...</span>
      </div>
    ),
    ssr: false, // Square SDK requires browser APIs
  }
)

interface PaymentEntryLazyProps {
  unitId: string
  applicationId: string
  locationId: string | null
  environment: 'sandbox' | 'production'
  scouts: Array<{
    id: string
    first_name: string
    last_name: string
    scout_accounts: {
      id: string
      billing_balance: number | null
      funds_balance?: number
    } | null
  }>
}

export function PaymentEntryLazy(props: PaymentEntryLazyProps) {
  return <PaymentEntry {...props} />
}
