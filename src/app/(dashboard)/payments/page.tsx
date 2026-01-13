import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AccessDenied } from '@/components/ui/access-denied'
import { formatCurrency, formatDate } from '@/lib/utils'
import { canAccessPage, canPerformAction } from '@/lib/roles'
import { PaymentEntry } from '@/components/payments/payment-entry'
import { getDefaultLocationId } from '@/lib/square/client'
import Link from 'next/link'

interface Payment {
  id: string
  amount: number
  fee_amount: number | null
  net_amount: number
  payment_method: string | null
  status: string | null
  created_at: string | null
  notes: string | null
  scout_account_id: string
  scout_accounts: {
    scouts: {
      first_name: string
      last_name: string
    } | null
  } | null
}

interface Scout {
  id: string
  first_name: string
  last_name: string
  scout_accounts: {
    id: string
    balance: number | null
  } | null
}

export default async function PaymentsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get user's unit membership
  const { data: membershipData } = await supabase
    .from('unit_memberships')
    .select('unit_id, role')
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .single()

  const membership = membershipData as { unit_id: string; role: string } | null

  if (!membership) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-2xl font-bold text-stone-900">No Unit Access</h1>
        <p className="mt-2 text-stone-600">
          You are not currently a member of any unit.
        </p>
      </div>
    )
  }

  // Check role-based access
  if (!canAccessPage(membership.role, 'payments')) {
    return <AccessDenied message="You don't have permission to view payments." />
  }

  const canRecordPayment = canPerformAction(membership.role, 'record_payments')

  // Get scouts with balances and Square credentials in parallel
  interface SquareCredentialsData {
    merchant_id: string
    location_id: string | null
    environment: 'sandbox' | 'production'
  }

  // Run scouts and credentials queries in parallel
  const [scoutsResult, credentialsResult] = await Promise.all([
    supabase
      .from('scouts')
      .select(`
        id,
        first_name,
        last_name,
        scout_accounts (
          id,
          balance
        )
      `)
      .eq('unit_id', membership.unit_id)
      .eq('is_active', true)
      .order('last_name'),
    supabase
      .from('unit_square_credentials')
      .select('merchant_id, location_id, environment')
      .eq('unit_id', membership.unit_id)
      .eq('is_active', true)
      .single(),
  ])

  const scouts = (scoutsResult.data as Scout[]) || []
  let squareCredentials: SquareCredentialsData | null = null

  if (credentialsResult.data) {
    squareCredentials = credentialsResult.data as SquareCredentialsData

    // Get location ID if not cached
    if (!squareCredentials.location_id) {
      const locationId = await getDefaultLocationId(membership.unit_id)
      if (locationId) {
        squareCredentials = { ...squareCredentials, location_id: locationId }
      }
    }
  }

  const squareApplicationId = process.env.SQUARE_APPLICATION_ID || ''
  const isSquareConnected = !!squareCredentials && !!squareCredentials.location_id

  // Get recent payments
  const { data: paymentsData } = await supabase
    .from('payments')
    .select(`
      id,
      amount,
      fee_amount,
      net_amount,
      payment_method,
      status,
      created_at,
      notes,
      scout_account_id,
      scout_accounts (
        scouts (
          first_name,
          last_name
        )
      )
    `)
    .eq('unit_id', membership.unit_id)
    .order('created_at', { ascending: false })
    .limit(20)

  const payments = (paymentsData as Payment[]) || []

  // Calculate totals
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0)
  const totalFees = payments.reduce((sum, p) => sum + (p.fee_amount || 0), 0)
  const netCollected = payments.reduce((sum, p) => sum + p.net_amount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Payments</h1>
        <p className="mt-1 text-stone-600">
          Record and track payments from scouts
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Collected</CardDescription>
              <CardTitle className="text-2xl text-success">
                {formatCurrency(totalCollected)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-stone-500">
                From {payments.length} payment{payments.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Processing Fees</CardDescription>
              <CardTitle className="text-2xl text-error">
                {formatCurrency(totalFees)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-stone-500">
                Card payment fees
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Net Received</CardDescription>
              <CardTitle className="text-2xl text-info">
                {formatCurrency(netCollected)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-stone-500">
                After fees
              </p>
            </CardContent>
          </Card>
        </div>

      {/* Record Payment */}
      {canRecordPayment && (
        <Card>
          <CardHeader>
            <CardTitle>Record Payment</CardTitle>
            <CardDescription>
              {isSquareConnected
                ? 'Accept card payments or record cash/check payments'
                : 'Record cash, check, or other payments'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentEntry
              unitId={membership.unit_id}
              applicationId={squareApplicationId}
              locationId={squareCredentials?.location_id || null}
              environment={squareCredentials?.environment || 'sandbox'}
              scouts={scouts}
            />
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
          <CardDescription>
            {payments.length} payment{payments.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-sm font-medium text-stone-500">
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4">Scout</th>
                    <th className="pb-3 pr-4">Method</th>
                    <th className="pb-3 pr-4 text-right">Amount</th>
                    <th className="pb-3 pr-4 text-right">Fee</th>
                    <th className="pb-3 text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-stone-100 last:border-0">
                      <td className="py-3 pr-4 text-stone-600">
                        {payment.created_at ? formatDate(payment.created_at) : '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-stone-900">
                          {payment.scout_accounts?.scouts?.first_name}{' '}
                          {payment.scout_accounts?.scouts?.last_name}
                        </p>
                        {payment.notes && (
                          <p className="text-xs text-stone-500">{payment.notes}</p>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-medium capitalize text-stone-700">
                          {payment.payment_method || 'unknown'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right font-medium text-success">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="py-3 pr-4 text-right text-error">
                        {payment.fee_amount
                          ? formatCurrency(payment.fee_amount)
                          : '—'}
                      </td>
                      <td className="py-3 text-right font-medium text-stone-900">
                        {formatCurrency(payment.net_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-stone-500">No payments recorded yet</p>
          )}
        </CardContent>
      </Card>

      {/* Square Connection Prompt (only show if not connected) */}
      {!isSquareConnected && (
        <Card className="border-dashed border-stone-300">
          <CardHeader>
            <CardTitle className="text-stone-500">Online Payments</CardTitle>
          </CardHeader>
          <CardContent className="text-stone-500">
            <p>
              Connect your Square account to accept online card payments from scouts and parents.
            </p>
            <Link
              href="/settings/integrations"
              className="mt-3 inline-flex items-center text-sm font-medium text-forest-600 hover:text-forest-700"
            >
              Connect Square &rarr;
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
