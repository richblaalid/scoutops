import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

interface ScoutAccount {
  id: string
  balance: number | null
  scouts: {
    id: string
    first_name: string
    last_name: string
    patrol: string | null
  } | null
}

interface JournalEntry {
  id: string
  entry_date: string
  description: string
  entry_type: string | null
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get current user
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
        <h1 className="text-2xl font-bold text-gray-900">Welcome to ScoutOps</h1>
        <p className="mt-2 text-gray-600">
          You are not currently a member of any unit. Please contact your unit administrator.
        </p>
      </div>
    )
  }

  // Get scout accounts with balances
  const { data: scoutAccountsData } = await supabase
    .from('scout_accounts')
    .select(
      `
      id,
      balance,
      scouts (
        id,
        first_name,
        last_name,
        patrol
      )
    `
    )
    .eq('unit_id', membership.unit_id)

  const scoutAccounts = scoutAccountsData as ScoutAccount[] | null

  // Calculate summary stats
  const totalScouts = scoutAccounts?.length || 0
  const totalBalance = scoutAccounts?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0
  const scoutsOwing = scoutAccounts?.filter((acc) => (acc.balance || 0) < 0).length || 0
  const scoutsWithCredit = scoutAccounts?.filter((acc) => (acc.balance || 0) > 0).length || 0

  // Get recent journal entries
  const { data: recentTransactionsData } = await supabase
    .from('journal_entries')
    .select('id, entry_date, description, entry_type')
    .eq('unit_id', membership.unit_id)
    .eq('is_posted', true)
    .order('entry_date', { ascending: false })
    .limit(5)

  const recentTransactions = recentTransactionsData as JournalEntry[] | null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-600">Overview of your unit&apos;s finances</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Scouts</CardDescription>
            <CardTitle className="text-3xl">{totalScouts}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Active scout accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net Balance</CardDescription>
            <CardTitle
              className={`text-3xl ${totalBalance < 0 ? 'text-red-600' : 'text-green-600'}`}
            >
              {formatCurrency(totalBalance)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {totalBalance >= 0 ? 'Credit' : 'Owed'} across all scouts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Scouts Owing</CardDescription>
            <CardTitle className="text-3xl text-red-600">{scoutsOwing}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Negative balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Scouts with Credit</CardDescription>
            <CardTitle className="text-3xl text-green-600">{scoutsWithCredit}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Positive balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest financial activity</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTransactions && recentTransactions.length > 0 ? (
              <div className="space-y-4">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{tx.description}</p>
                      <p className="text-sm text-gray-500">{tx.entry_date}</p>
                    </div>
                    <span className="rounded bg-gray-100 px-2 py-1 text-xs capitalize">
                      {tx.entry_type || 'entry'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No recent transactions</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scout Account Summary</CardTitle>
            <CardDescription>Current balances</CardDescription>
          </CardHeader>
          <CardContent>
            {scoutAccounts && scoutAccounts.length > 0 ? (
              <div className="space-y-2">
                {scoutAccounts.slice(0, 5).map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between border-b pb-2"
                  >
                    <div>
                      <p className="font-medium">
                        {account.scouts?.first_name} {account.scouts?.last_name}
                      </p>
                      {account.scouts?.patrol && (
                        <p className="text-xs text-gray-500">{account.scouts.patrol}</p>
                      )}
                    </div>
                    <span
                      className={`font-medium ${
                        (account.balance || 0) < 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {formatCurrency(account.balance || 0)}
                    </span>
                  </div>
                ))}
                {scoutAccounts.length > 5 && (
                  <p className="text-center text-sm text-gray-500">
                    +{scoutAccounts.length - 5} more scouts
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No scout accounts yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
