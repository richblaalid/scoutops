import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { getDefaultLocationId } from '@/lib/square/client'
import { ParentPaymentForm } from '@/components/payments/parent-payment-form'
import Link from 'next/link'

interface Scout {
  id: string
  first_name: string
  last_name: string
  scout_accounts: {
    id: string
    balance: number | null
  } | null
}

interface BillingCharge {
  id: string
  amount: number
  is_paid: boolean | null
  billing_record_id: string
  scout_account_id: string
  billing_records: {
    description: string
    billing_date: string
  } | null
}

export default async function PayPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's membership
  const { data: membership } = await supabase
    .from('unit_memberships')
    .select('unit_id, role')
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) {
    redirect('/login')
  }

  // Get the scouts linked to this parent
  const { data: guardianData } = await supabase
    .from('scout_guardians')
    .select('scout_id')
    .eq('profile_id', user.id)

  const linkedScoutIds = (guardianData || []).map((g) => g.scout_id)

  // Get scouts with their accounts
  let scouts: Scout[] = []
  if (linkedScoutIds.length > 0) {
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
      .in('id', linkedScoutIds)
      .eq('is_active', true)
      .order('last_name')

    scouts = (scoutsData as Scout[]) || []
  }

  // Get unpaid billing charges for these scouts
  let unpaidCharges: BillingCharge[] = []
  const scoutAccountIds = scouts
    .filter((s) => s.scout_accounts)
    .map((s) => s.scout_accounts!.id)

  if (scoutAccountIds.length > 0) {
    const { data: chargesData } = await supabase
      .from('billing_charges')
      .select(`
        id,
        amount,
        is_paid,
        billing_record_id,
        scout_account_id,
        billing_records (
          description,
          billing_date
        )
      `)
      .in('scout_account_id', scoutAccountIds)
      .or('is_paid.is.null,is_paid.eq.false')
      .order('billing_records(billing_date)', { ascending: false })

    unpaidCharges = (chargesData as BillingCharge[]) || []
  }

  // Check if Square is connected
  const { data: squareCredentials } = await supabase
    .from('unit_square_credentials')
    .select('merchant_id, location_id, environment')
    .eq('unit_id', membership.unit_id)
    .eq('is_active', true)
    .single()

  let locationId: string | null = null
  if (squareCredentials) {
    locationId = squareCredentials.location_id || await getDefaultLocationId(membership.unit_id)
  }

  const squareApplicationId = process.env.SQUARE_APPLICATION_ID || ''
  const isSquareConnected = !!squareCredentials && !!locationId

  // Calculate total owed
  const totalOwed = scouts.reduce((sum, scout) => {
    const balance = scout.scout_accounts?.balance || 0
    return sum + (balance < 0 ? Math.abs(balance) : 0)
  }, 0)

  const totalUnpaidCharges = unpaidCharges.reduce((sum, charge) => sum + charge.amount, 0)

  // If no linked scouts, show message
  if (scouts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Make a Payment</h1>
          <p className="mt-1 text-stone-600">Pay balances for your scouts</p>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-500">
              No scouts are linked to your account. Please contact your unit administrator
              to link your scouts to your profile.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Make a Payment</h1>
        <p className="mt-1 text-stone-600">Pay balances for your scouts</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Balance Due</CardDescription>
            <CardTitle className={`text-2xl ${totalOwed > 0 ? 'text-error' : 'text-success'}`}>
              {totalOwed > 0 ? formatCurrency(totalOwed) : 'Paid in Full'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-stone-500">
              Across {scouts.length} scout{scouts.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unpaid Charges</CardDescription>
            <CardTitle className="text-2xl text-stone-900">
              {unpaidCharges.length > 0 ? formatCurrency(totalUnpaidCharges) : 'None'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-stone-500">
              {unpaidCharges.length} pending charge{unpaidCharges.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Scout Balances */}
      <Card>
        <CardHeader>
          <CardTitle>Scout Balances</CardTitle>
          <CardDescription>Current balance for each of your scouts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {scouts.map((scout) => {
              const balance = scout.scout_accounts?.balance || 0
              const owes = balance < 0

              return (
                <div
                  key={scout.id}
                  className="flex items-center justify-between rounded-lg border border-stone-200 p-3"
                >
                  <div>
                    <p className="font-medium text-stone-900">
                      {scout.first_name} {scout.last_name}
                    </p>
                    <p className="text-xs text-stone-500">
                      {owes ? 'Amount owed' : 'Credit balance'}
                    </p>
                  </div>
                  <p className={`text-lg font-semibold ${owes ? 'text-error' : 'text-success'}`}>
                    {owes ? formatCurrency(Math.abs(balance)) : formatCurrency(balance)}
                  </p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Unpaid Charges */}
      {unpaidCharges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unpaid Charges</CardTitle>
            <CardDescription>Select charges to pay or enter a custom amount</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unpaidCharges.map((charge) => {
                const scout = scouts.find(
                  (s) => s.scout_accounts?.id === charge.scout_account_id
                )
                return (
                  <div
                    key={charge.id}
                    className="flex items-center justify-between rounded-lg border border-stone-200 p-3"
                  >
                    <div>
                      <p className="font-medium text-stone-900">
                        {charge.billing_records?.description || 'Charge'}
                      </p>
                      <p className="text-xs text-stone-500">
                        {scout?.first_name} {scout?.last_name} &bull;{' '}
                        {charge.billing_records?.billing_date
                          ? new Date(charge.billing_records.billing_date).toLocaleDateString()
                          : ''}
                      </p>
                    </div>
                    <p className="font-semibold text-stone-900">
                      {formatCurrency(charge.amount)}
                    </p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Form */}
      {isSquareConnected ? (
        <Card>
          <CardHeader>
            <CardTitle>Pay with Card</CardTitle>
            <CardDescription>
              Secure payment processed by Square
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ParentPaymentForm
              applicationId={squareApplicationId}
              locationId={locationId!}
              environment={squareCredentials!.environment as 'sandbox' | 'production'}
              scouts={scouts}
              unpaidCharges={unpaidCharges}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-stone-300">
          <CardHeader>
            <CardTitle className="text-stone-500">Online Payments Not Available</CardTitle>
          </CardHeader>
          <CardContent className="text-stone-500">
            <p>
              Online payments are not currently available for your unit.
              Please contact your unit administrator for payment options.
            </p>
          </CardContent>
        </Card>
      )}

      {/* View Payment History Link */}
      <div className="text-center">
        <Link
          href="/payments"
          className="text-sm text-forest-600 hover:text-forest-700"
        >
          View Payment History &rarr;
        </Link>
      </div>
    </div>
  )
}
