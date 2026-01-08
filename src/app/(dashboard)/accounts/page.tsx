import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

interface ScoutAccount {
  id: string
  balance: number | null
  scouts: {
    id: string
    first_name: string
    last_name: string
    patrol: string | null
    is_active: boolean | null
  } | null
}

export default async function AccountsPage() {
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

  // Get scout accounts
  const { data: accountsData } = await supabase
    .from('scout_accounts')
    .select(`
      id,
      balance,
      scouts (
        id,
        first_name,
        last_name,
        patrol,
        is_active
      )
    `)
    .eq('unit_id', membership.unit_id)
    .order('balance', { ascending: true })

  const accounts = (accountsData as ScoutAccount[]) || []

  // Calculate totals
  const totalOwed = accounts
    .filter((a) => (a.balance || 0) < 0)
    .reduce((sum, a) => sum + Math.abs(a.balance || 0), 0)

  const totalCredit = accounts
    .filter((a) => (a.balance || 0) > 0)
    .reduce((sum, a) => sum + (a.balance || 0), 0)

  const netBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Scout Accounts</h1>
        <p className="mt-1 text-gray-600">View and manage scout financial accounts</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Owed to Unit</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              {formatCurrency(totalOwed)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              From {accounts.filter((a) => (a.balance || 0) < 0).length} scouts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Credit Balance</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {formatCurrency(totalCredit)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              From {accounts.filter((a) => (a.balance || 0) > 0).length} scouts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net Balance</CardDescription>
            <CardTitle
              className={`text-2xl ${netBalance < 0 ? 'text-red-600' : 'text-green-600'}`}
            >
              {formatCurrency(netBalance)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {netBalance < 0 ? 'Net owed to unit' : 'Net credit available'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts List */}
      <Card>
        <CardHeader>
          <CardTitle>All Scout Accounts</CardTitle>
          <CardDescription>
            {accounts.length} account{accounts.length !== 1 ? 's' : ''} • Sorted by balance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm font-medium text-gray-500">
                    <th className="pb-3 pr-4">Scout</th>
                    <th className="pb-3 pr-4">Patrol</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4 text-right">Balance</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => {
                    const balance = account.balance || 0
                    return (
                      <tr key={account.id} className="border-b last:border-0">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-gray-900">
                            {account.scouts?.first_name} {account.scouts?.last_name}
                          </p>
                        </td>
                        <td className="py-3 pr-4 text-gray-600">
                          {account.scouts?.patrol || '—'}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                              account.scouts?.is_active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {account.scouts?.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-right">
                          <span
                            className={`font-medium ${
                              balance < 0
                                ? 'text-red-600'
                                : balance > 0
                                  ? 'text-green-600'
                                  : 'text-gray-600'
                            }`}
                          >
                            {formatCurrency(balance)}
                          </span>
                        </td>
                        <td className="py-3">
                          <Link
                            href={`/accounts/${account.id}`}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No scout accounts yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
