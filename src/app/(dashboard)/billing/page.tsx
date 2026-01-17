import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AccessDenied } from '@/components/ui/access-denied'
import { formatCurrency } from '@/lib/utils'
import { canAccessPage, canPerformAction } from '@/lib/roles'
import { BillingForm } from '@/components/billing/billing-form'
import { BillingRecordCard } from '@/components/billing/billing-record-card'
import Link from 'next/link'

interface BillingRecord {
  id: string
  description: string
  total_amount: number
  billing_date: string
  created_at: string | null
  is_void: boolean | null
  void_reason: string | null
  events: {
    id: string
    title: string
  } | null
  billing_charges: {
    id: string
    amount: number
    is_paid: boolean | null
    is_void: boolean | null
    scout_accounts: {
      scout_id: string
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
  is_active: boolean | null
  scout_accounts: { id: string } | null
  patrols: { name: string } | null
}

export default async function BillingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get user's profile (profile_id is now separate from auth user id)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) return null

  // Get user's unit membership
  const { data: membershipData } = await supabase
    .from('unit_memberships')
    .select('unit_id, role')
    .eq('profile_id', profile.id)
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
  if (!canAccessPage(membership.role, 'billing')) {
    return <AccessDenied message="Only administrators and treasurers can access billing." />
  }

  const canCreateBilling = canPerformAction(membership.role, 'manage_billing')
  const canEditBilling = canPerformAction(membership.role, 'edit_billing')
  const canVoidBilling = canPerformAction(membership.role, 'void_billing')

  // Get active scouts for billing form
  const { data: scoutsData } = await supabase
    .from('scouts')
    .select(`
      id,
      first_name,
      last_name,
      is_active,
      scout_accounts (id),
      patrols (name)
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
      is_void,
      void_reason,
      events (
        id,
        title
      ),
      billing_charges (
        id,
        amount,
        is_paid,
        is_void,
        scout_accounts (
          scout_id,
          scouts (
            first_name,
            last_name
          )
        )
      )
    `)
    .eq('unit_id', membership.unit_id)
    .order('billing_date', { ascending: false })
    .limit(20)

  // Cast through unknown since is_void columns are added via migration
  const billingRecords = (billingData as unknown as BillingRecord[]) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Scout Billing</h1>
        <p className="mt-1 text-stone-600">
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
      <div>
        <h2 className="text-lg font-semibold text-stone-900 mb-3">Recent Billing Records</h2>
        {billingRecords.length > 0 ? (
          <div className="space-y-3">
            {billingRecords.map((record) => (
              <BillingRecordCard
                key={record.id}
                id={record.id}
                description={record.description}
                totalAmount={record.total_amount}
                billingDate={record.billing_date}
                createdAt={record.created_at}
                isVoid={record.is_void === true}
                voidReason={record.void_reason}
                charges={record.billing_charges}
                canEdit={canEditBilling}
                canVoid={canVoidBilling}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-stone-500">No billing records yet</p>
              {canCreateBilling && (
                <p className="mt-2 text-sm text-stone-400">
                  Create your first billing record above
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Help Text */}
      <Card>
        <CardHeader>
          <CardTitle>How Scout Billing Works</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-stone-600">
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
            <Link href="/accounts" className="text-forest-600 hover:text-forest-800">
              View Scout Account Balances →
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
