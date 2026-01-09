import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { isFinancialRole, isManagementRole, hasFilteredView } from '@/lib/roles'
import Link from 'next/link'

interface ScoutAccount {
  id: string
  balance: number | null
  scout_id: string
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

interface JournalLine {
  id: string
  debit: number | null
  credit: number | null
  journal_entries: {
    entry_date: string
    description: string
  } | null
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
    .eq('status', 'active')
    .single()

  const membership = membershipData as { unit_id: string; role: string } | null

  if (!membership) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-2xl font-bold text-stone-900">Welcome to Chuckbox</h1>
        <p className="mt-2 text-stone-600">
          You are not currently a member of any unit. Please contact your unit administrator.
        </p>
      </div>
    )
  }

  const role = membership.role
  const isParent = role === 'parent'
  const isScout = role === 'scout'

  // For parents/scouts, get their linked scout accounts
  let linkedScoutIds: string[] = []
  let linkedScoutAccountId: string | null = null

  if (isParent) {
    const { data: guardianData } = await supabase
      .from('scout_guardians')
      .select('scout_id')
      .eq('profile_id', user.id)
    linkedScoutIds = (guardianData || []).map((g) => g.scout_id)
  }

  if (isScout) {
    // Find the scout record linked to this user's profile
    const { data: scoutData } = await supabase
      .from('scouts')
      .select('id, scout_accounts(id)')
      .eq('profile_id', user.id)
      .single()

    if (scoutData) {
      linkedScoutIds = [scoutData.id]
      linkedScoutAccountId = (scoutData.scout_accounts as { id: string } | null)?.id || null
    }
  }

  // Get scout accounts with balances (filtered for parents/scouts)
  let scoutAccountsQuery = supabase
    .from('scout_accounts')
    .select(
      `
      id,
      balance,
      scout_id,
      scouts (
        id,
        first_name,
        last_name,
        patrol
      )
    `
    )
    .eq('unit_id', membership.unit_id)

  if (hasFilteredView(role) && linkedScoutIds.length > 0) {
    scoutAccountsQuery = scoutAccountsQuery.in('scout_id', linkedScoutIds)
  } else if (hasFilteredView(role)) {
    // No linked scouts, will show empty
    scoutAccountsQuery = scoutAccountsQuery.eq('id', 'none')
  }

  const { data: scoutAccountsData } = await scoutAccountsQuery
  const scoutAccounts = scoutAccountsData as ScoutAccount[] | null

  // Calculate summary stats (for management roles)
  const totalScouts = scoutAccounts?.length || 0
  const totalBalance = scoutAccounts?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0
  const scoutsOwing = scoutAccounts?.filter((acc) => (acc.balance || 0) < 0).length || 0
  const scoutsWithCredit = scoutAccounts?.filter((acc) => (acc.balance || 0) > 0).length || 0

  // Get recent journal entries (for management roles)
  let recentTransactions: JournalEntry[] | null = null
  if (isManagementRole(role)) {
    const { data: recentTransactionsData } = await supabase
      .from('journal_entries')
      .select('id, entry_date, description, entry_type')
      .eq('unit_id', membership.unit_id)
      .eq('is_posted', true)
      .order('entry_date', { ascending: false })
      .limit(5)
    recentTransactions = recentTransactionsData as JournalEntry[] | null
  }

  // Get recent transactions for scout's own account
  let scoutRecentTransactions: JournalLine[] | null = null
  if (isScout && linkedScoutAccountId) {
    const { data: journalLinesData } = await supabase
      .from('journal_lines')
      .select(`
        id,
        debit,
        credit,
        journal_entries (
          entry_date,
          description
        )
      `)
      .eq('scout_account_id', linkedScoutAccountId)
      .order('created_at', { ascending: false })
      .limit(5)
    scoutRecentTransactions = journalLinesData as JournalLine[] | null
  }

  // Scout Dashboard - Simple view with their own account
  if (isScout) {
    const myAccount = scoutAccounts?.[0]
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">My Account</h1>
          <p className="mt-1 text-stone-600">View your scout account balance and activity</p>
        </div>

        {myAccount ? (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Current Balance</CardDescription>
                <CardTitle
                  className={`text-4xl ${(myAccount.balance || 0) < 0 ? 'text-error' : 'text-success'}`}
                >
                  {formatCurrency(myAccount.balance || 0)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {(myAccount.balance || 0) < 0 ? 'Amount owed' : 'Credit balance'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your recent account transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {scoutRecentTransactions && scoutRecentTransactions.length > 0 ? (
                  <div className="space-y-4">
                    {scoutRecentTransactions.map((line) => (
                      <div key={line.id} className="flex items-center justify-between border-b pb-2">
                        <div>
                          <p className="font-medium">{line.journal_entries?.description}</p>
                          <p className="text-sm text-stone-500">{line.journal_entries?.entry_date}</p>
                        </div>
                        <span
                          className={`font-medium ${line.debit ? 'text-error' : 'text-success'}`}
                        >
                          {line.debit
                            ? `-${formatCurrency(line.debit)}`
                            : `+${formatCurrency(line.credit || 0)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-stone-500">No recent activity</p>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-stone-500">No account found. Please contact your unit administrator.</p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Parent Dashboard - Family balance overview
  if (isParent) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Family Dashboard</h1>
          <p className="mt-1 text-stone-600">View your scouts&apos; account balances</p>
        </div>

        {scoutAccounts && scoutAccounts.length > 0 ? (
          <>
            {/* Family Balance Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Family Balance</CardDescription>
                <CardTitle
                  className={`text-4xl ${totalBalance < 0 ? 'text-error' : 'text-success'}`}
                >
                  {formatCurrency(totalBalance)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {totalBalance < 0 ? 'Total amount owed' : 'Total credit balance'}
                </p>
              </CardContent>
            </Card>

            {/* Individual Scout Accounts */}
            <Card>
              <CardHeader>
                <CardTitle>Scout Accounts</CardTitle>
                <CardDescription>Individual account balances</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {scoutAccounts.map((account) => (
                    <Link
                      key={account.id}
                      href={`/accounts/${account.id}`}
                      className="flex items-center justify-between rounded-lg border p-4 hover:bg-stone-50"
                    >
                      <div>
                        <p className="font-medium text-stone-900">
                          {account.scouts?.first_name} {account.scouts?.last_name}
                        </p>
                        {account.scouts?.patrol && (
                          <p className="text-sm text-stone-500">{account.scouts.patrol}</p>
                        )}
                      </div>
                      <span
                        className={`text-lg font-bold ${
                          (account.balance || 0) < 0 ? 'text-error' : 'text-success'
                        }`}
                      >
                        {formatCurrency(account.balance || 0)}
                      </span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-stone-500">No scouts linked to your account. Please contact your unit administrator.</p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Management Dashboard (Admin, Treasurer, Leader)
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Dashboard</h1>
        <p className="mt-1 text-stone-600">Overview of your unit&apos;s finances</p>
      </div>

      {/* Stats Cards */}
      <div className={`grid gap-4 md:grid-cols-2 ${isFinancialRole(role) ? 'lg:grid-cols-4' : 'lg:grid-cols-2'}`}>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Scouts</CardDescription>
            <CardTitle className="text-3xl">{totalScouts}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Active scout accounts</p>
          </CardContent>
        </Card>

        {isFinancialRole(role) && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Net Balance</CardDescription>
                <CardTitle
                  className={`text-3xl ${totalBalance < 0 ? 'text-error' : 'text-success'}`}
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
                <CardTitle className="text-3xl text-error">{scoutsOwing}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Negative balance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Scouts with Credit</CardDescription>
                <CardTitle className="text-3xl text-success">{scoutsWithCredit}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Positive balance</p>
              </CardContent>
            </Card>
          </>
        )}

        {!isFinancialRole(role) && (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Scouts Owing</CardDescription>
              <CardTitle className="text-3xl text-error">{scoutsOwing}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">With negative balance</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        {isFinancialRole(role) && (
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
                        <p className="text-sm text-stone-500">{tx.entry_date}</p>
                      </div>
                      <span className="rounded bg-stone-100 px-2 py-1 text-xs capitalize">
                        {tx.entry_type || 'entry'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-stone-500">No recent transactions</p>
              )}
            </CardContent>
          </Card>
        )}

        <Card className={!isFinancialRole(role) ? 'lg:col-span-2' : ''}>
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
                        <p className="text-xs text-stone-500">{account.scouts.patrol}</p>
                      )}
                    </div>
                    <span
                      className={`font-medium ${
                        (account.balance || 0) < 0 ? 'text-error' : 'text-success'
                      }`}
                    >
                      {formatCurrency(account.balance || 0)}
                    </span>
                  </div>
                ))}
                {scoutAccounts.length > 5 && (
                  <p className="text-center text-sm text-stone-500">
                    +{scoutAccounts.length - 5} more scouts
                  </p>
                )}
              </div>
            ) : (
              <p className="text-stone-500">No scout accounts yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
