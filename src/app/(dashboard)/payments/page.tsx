import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { PaymentForm } from '@/components/payments/payment-form'

interface Payment {
  id: string
  amount: number
  fee_amount: number | null
  net_amount: number
  payment_method: string | null
  status: string | null
  created_at: string | null
  notes: string | null
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
    .eq('is_active', true)
    .single()

  const membership = membershipData as { unit_id: string; role: string } | null

  if (!membership) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-2xl font-bold text-gray-900">No Unit Access</h1>
        <p className="mt-2 text-gray-600">
          You are not currently a member of any unit.
        </p>
      </div>
    )
  }

  const canRecordPayment = ['admin', 'treasurer'].includes(membership.role)

  // Get scouts with balances for payment form
  const { data: scoutsData } = await supabase
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
    .order('last_name')

  const scouts = (scoutsData as Scout[]) || []

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
        <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
        <p className="mt-1 text-gray-600">Record and track payments from scouts</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Collected</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {formatCurrency(totalCollected)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              From {payments.length} payment{payments.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Processing Fees</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              {formatCurrency(totalFees)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Card payment fees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net Received</CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {formatCurrency(netCollected)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
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
              Record a cash, check, or card payment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentForm unitId={membership.unit_id} scouts={scouts} />
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
                  <tr className="border-b text-left text-sm font-medium text-gray-500">
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
                    <tr key={payment.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 text-gray-600">
                        {payment.created_at
                          ? new Date(payment.created_at).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-gray-900">
                          {payment.scout_accounts?.scouts?.first_name}{' '}
                          {payment.scout_accounts?.scouts?.last_name}
                        </p>
                        {payment.notes && (
                          <p className="text-xs text-gray-500">{payment.notes}</p>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="rounded bg-gray-100 px-2 py-1 text-xs capitalize">
                          {payment.payment_method || 'unknown'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right font-medium text-green-600">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="py-3 pr-4 text-right text-red-600">
                        {payment.fee_amount
                          ? formatCurrency(payment.fee_amount)
                          : '—'}
                      </td>
                      <td className="py-3 text-right font-medium">
                        {formatCurrency(payment.net_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No payments recorded yet</p>
          )}
        </CardContent>
      </Card>

      {/* Square Integration Notice */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-gray-500">Online Payments (Coming Soon)</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-500">
          <p>
            Square integration for online card payments will be available in a future update.
            For now, record cash and check payments manually above.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
