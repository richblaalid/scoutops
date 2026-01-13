import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { EditScoutButton } from '@/components/scouts/edit-scout-button'

interface ScoutPageProps {
  params: Promise<{ id: string }>
}

export default async function ScoutPage({ params }: ScoutPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get scout details
  const { data: scoutData } = await supabase
    .from('scouts')
    .select(`
      *,
      scout_accounts (
        id,
        billing_balance,
        funds_balance
      ),
      units (
        id,
        name,
        unit_number
      )
    `)
    .eq('id', id)
    .single()

  if (!scoutData) {
    notFound()
  }

  // Get user's unit membership to check role
  const { data: membershipData } = await supabase
    .from('unit_memberships')
    .select('unit_id, role')
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .single()

  const membership = membershipData as { unit_id: string; role: string } | null
  const canEditScout = membership && ['admin', 'treasurer', 'leader'].includes(membership.role)

  interface Scout {
    id: string
    first_name: string
    last_name: string
    patrol: string | null
    patrol_id: string | null
    rank: string | null
    is_active: boolean | null
    date_of_birth: string | null
    bsa_member_id: string | null
    created_at: string | null
    updated_at: string | null
    unit_id: string
    scout_accounts: { id: string; billing_balance: number | null; funds_balance: number } | null
    units: { id: string; name: string; unit_number: string } | null
  }

  const scout = scoutData as Scout
  const scoutAccount = scout.scout_accounts
  const billingBalance = scoutAccount?.billing_balance ?? 0
  const fundsBalance = scoutAccount?.funds_balance ?? 0

  // Get recent transactions for this scout
  const { data: transactionsData } = await supabase
    .from('journal_lines')
    .select(`
      id,
      debit,
      credit,
      memo,
      journal_entries (
        id,
        entry_date,
        description,
        entry_type,
        is_posted
      )
    `)
    .eq('scout_account_id', scoutAccount?.id || '')
    .order('id', { ascending: false })
    .limit(10)

  interface Transaction {
    id: string
    debit: number | null
    credit: number | null
    memo: string | null
    journal_entries: {
      id: string
      entry_date: string
      description: string
      entry_type: string | null
      is_posted: boolean | null
    } | null
  }

  const transactions = (transactionsData as Transaction[]) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/scouts"
              className="text-sm text-stone-500 hover:text-stone-700"
            >
              Scouts
            </Link>
            <span className="text-stone-400">/</span>
            <span className="text-sm text-stone-900">
              {scout.first_name} {scout.last_name}
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold text-stone-900">
            {scout.first_name} {scout.last_name}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {canEditScout && (
            <EditScoutButton
              unitId={scout.unit_id}
              scout={{
                id: scout.id,
                first_name: scout.first_name,
                last_name: scout.last_name,
                patrol: scout.patrol,
                patrol_id: scout.patrol_id,
                rank: scout.rank,
                date_of_birth: scout.date_of_birth,
                bsa_member_id: scout.bsa_member_id,
                is_active: scout.is_active,
              }}
            />
          )}
          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
              scout.is_active
                ? 'bg-success-light text-success'
                : 'bg-stone-100 text-stone-600'
            }`}
          >
            {scout.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Scout Info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Scout Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-stone-500">Patrol</p>
              <p className="font-medium">{scout.patrol || 'Not assigned'}</p>
            </div>
            <div>
              <p className="text-sm text-stone-500">Rank</p>
              <p className="font-medium">{scout.rank || 'Not set'}</p>
            </div>
            {scout.date_of_birth && (
              <div>
                <p className="text-sm text-stone-500">Date of Birth</p>
                <p className="font-medium">{scout.date_of_birth}</p>
              </div>
            )}
            {scout.bsa_member_id && (
              <div>
                <p className="text-sm text-stone-500">BSA Member ID</p>
                <p className="font-medium">{scout.bsa_member_id}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Balance */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Account Balance</CardTitle>
            <CardDescription>Current financial status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Scout Funds */}
              <div>
                <p className="text-sm font-medium text-stone-500">Scout Funds</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className={`text-3xl font-bold ${fundsBalance > 0 ? 'text-success' : 'text-stone-900'}`}>
                    {formatCurrency(fundsBalance)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  Available savings from fundraising
                </p>
              </div>

              {/* Money Owed */}
              <div>
                <p className="text-sm font-medium text-stone-500">Money Owed</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className={`text-3xl font-bold ${billingBalance < 0 ? 'text-error' : 'text-stone-900'}`}>
                    {billingBalance < 0 ? formatCurrency(Math.abs(billingBalance)) : '$0.00'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  {billingBalance < 0 ? 'Outstanding charges' : 'All paid up'}
                </p>
              </div>
            </div>
            {scoutAccount && (
              <Link
                href={`/accounts/${scoutAccount.id}`}
                className="mt-6 inline-block text-sm text-forest-600 hover:text-forest-800"
              >
                View full account details
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest activity on this scout&apos;s account</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm font-medium text-stone-500">
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4">Description</th>
                    <th className="pb-3 pr-4">Type</th>
                    <th className="pb-3 pr-4 text-right">Debit</th>
                    <th className="pb-3 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 text-stone-600">
                        {tx.journal_entries?.entry_date || '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-stone-900">
                          {tx.journal_entries?.description || tx.memo || '—'}
                        </p>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="rounded bg-stone-100 px-2 py-1 text-xs capitalize">
                          {tx.journal_entries?.entry_type || 'entry'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right text-error">
                        {tx.debit && tx.debit > 0 ? formatCurrency(tx.debit) : '—'}
                      </td>
                      <td className="py-3 text-right text-success">
                        {tx.credit && tx.credit > 0 ? formatCurrency(tx.credit) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-stone-500">No transactions yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
