import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AccessDenied } from '@/components/ui/access-denied'
import { formatCurrency } from '@/lib/utils'
import { canAccessPage, canPerformAction } from '@/lib/roles'
import { BillingForm } from '@/components/billing/billing-form'
import Link from 'next/link'

interface BillingRecord {
  id: string
  description: string
  total_amount: number
  billing_date: string
  created_at: string | null
  events: {
    id: string
    title: string
  } | null
  billing_charges: {
    id: string
    amount: number
    is_paid: boolean | null
    scout_accounts: {
      scouts: {
        first_name: string
        last_name: string
      } | null
    } | null
  }[]
}

interface Scout {
  id: string
  first_name: string
  last_name: string
  patrol: string | null
  is_active: boolean | null
  scout_accounts: { id: string } | null
}

export default async function BillingPage() {
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
        <h1 className="text-2xl font-bold text-gray-900">No Unit Access</h1>
        <p className="mt-2 text-gray-600">
          You are not currently a member of any unit.
        </p>
      </div>
    )
  }

  // Check role-based access
  if (!canAccessPage(membership.role, 'billing')) {
    return <AccessDenied message="Only administrators and treasurers can access billing." />
  }

  const canCreateBilling = canPerformAction(membership.role, 'manage_billing')

  // Get active scouts for billing form
  const { data: scoutsData } = await supabase
    .from('scouts')
    .select(`
      id,
      first_name,
      last_name,
      patrol,
      is_active,
      scout_accounts (id)
    `)
    .eq('unit_id', membership.unit_id)
    .eq('is_active', true)
    .order('last_name')

  const scouts = (scoutsData as Scout[]) || []

  // Get recent billing records
  const { data: billingData } = await supabase
    .from('billing_records')
    .select(`
      id,
      description,
      total_amount,
      billing_date,
      created_at,
      events (
        id,
        title
      ),
      billing_charges (
        id,
        amount,
        is_paid,
        scout_accounts (
          scouts (
            first_name,
            last_name
          )
        )
      )
    `)
    .eq('unit_id', membership.unit_id)
    .order('billing_date', { ascending: false })
    .limit(10)

  const billingRecords = (billingData as BillingRecord[]) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Scout Billing</h1>
        <p className="mt-1 text-gray-600">
          Create charges for shared expenses or fixed fees
        </p>
      </div>

      {/* Create New Billing */}
      {canCreateBilling && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Billing</CardTitle>
            <CardDescription>
              Split costs among scouts or apply fixed charges
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BillingForm unitId={membership.unit_id} scouts={scouts} />
          </CardContent>
        </Card>
      )}

      {/* Recent Billing Records */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Billing Records</CardTitle>
          <CardDescription>
            {billingRecords.length} billing record{billingRecords.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {billingRecords.length > 0 ? (
            <div className="space-y-4">
              {billingRecords.map((record) => (
                <div
                  key={record.id}
                  className="rounded-lg border p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {record.description}
                      </h3>
                      {record.events && (
                        <p className="text-sm text-gray-500">
                          Event: {record.events.title}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-gray-500">
                        {record.billing_date} • {record.billing_charges.length} scouts
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(record.total_amount)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatCurrency(
                          record.total_amount / (record.billing_charges.length || 1)
                        )}{' '}
                        per scout
                      </p>
                    </div>
                  </div>

                  {/* Show individual charges */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {record.billing_charges.slice(0, 5).map((charge) => (
                      <span
                        key={charge.id}
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${
                          charge.is_paid
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {charge.scout_accounts?.scouts?.first_name}{' '}
                        {charge.scout_accounts?.scouts?.last_name?.charAt(0)}.
                        {charge.is_paid ? ' (Paid)' : ''}
                      </span>
                    ))}
                    {record.billing_charges.length > 5 && (
                      <span className="text-xs text-gray-500">
                        +{record.billing_charges.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No billing records yet</p>
              {canCreateBilling && (
                <p className="mt-2 text-sm text-gray-400">
                  Create your first billing record above
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card>
        <CardHeader>
          <CardTitle>How Scout Billing Works</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-gray-600">
          <p className="mb-3 font-medium">Two billing options:</p>
          <ul className="list-disc pl-4 space-y-1 mb-4">
            <li><strong>Split Total</strong> – Divide a shared expense equally among selected scouts (e.g., camping trips)</li>
            <li><strong>Fixed Amount</strong> – Charge each selected scout the same amount (e.g., annual dues)</li>
          </ul>
          <ol className="list-decimal pl-4 space-y-2">
            <li>Choose your billing type</li>
            <li>Enter the amount and description</li>
            <li>Select which scouts to charge</li>
            <li>Each scout&apos;s account is debited accordingly</li>
            <li>Parents can view and pay their balance online</li>
          </ol>
          <p className="mt-4">
            <Link href="/accounts" className="text-blue-600 hover:text-blue-800">
              View Scout Account Balances →
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
