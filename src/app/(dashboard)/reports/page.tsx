import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AccessDenied } from '@/components/ui/access-denied'
import { formatCurrency } from '@/lib/utils'
import { canAccessPage } from '@/lib/roles'
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

interface JournalEntry {
  id: string
  entry_date: string
  description: string
  entry_type: string | null
  is_posted: boolean | null
  is_void: boolean | null
  journal_lines: {
    debit: number | null
    credit: number | null
  }[]
}

export default async function ReportsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get user's unit membership
  const { data: membershipData } = await supabase
    .from('unit_memberships')
    .select('unit_id, role, units(name, unit_number)')
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .single()

  interface Membership {
    unit_id: string
    role: string
    units: { name: string; unit_number: string } | null
  }

  const membership = membershipData as Membership | null

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
  if (!canAccessPage(membership.role, 'reports')) {
    return <AccessDenied message="Only administrators, treasurers, and leaders can access reports." />
  }

  // Get all scout accounts
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

  // Get recent journal entries
  const { data: entriesData } = await supabase
    .from('journal_entries')
    .select(`
      id,
      entry_date,
      description,
      entry_type,
      is_posted,
      is_void,
      journal_lines (
        debit,
        credit
      )
    `)
    .eq('unit_id', membership.unit_id)
    .eq('is_posted', true)
    .order('entry_date', { ascending: false })
    .limit(50)

  const entries = (entriesData as JournalEntry[]) || []

  // Calculate totals
  const totalOwed = accounts
    .filter((a) => (a.balance || 0) < 0)
    .reduce((sum, a) => sum + Math.abs(a.balance || 0), 0)

  const totalCredit = accounts
    .filter((a) => (a.balance || 0) > 0)
    .reduce((sum, a) => sum + (a.balance || 0), 0)

  const netBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0)

  // Group by patrol
  const patrolBalances = accounts.reduce(
    (groups, account) => {
      const patrol = account.scouts?.patrol || 'No Patrol'
      if (!groups[patrol]) {
        groups[patrol] = { total: 0, count: 0, owing: 0 }
      }
      groups[patrol].total += account.balance || 0
      groups[patrol].count += 1
      if ((account.balance || 0) < 0) {
        groups[patrol].owing += Math.abs(account.balance || 0)
      }
      return groups
    },
    {} as Record<string, { total: number; count: number; owing: number }>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 text-gray-600">
          Financial reports for {membership.units?.name || 'your unit'}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Scouts</CardDescription>
            <CardTitle className="text-2xl">{accounts.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Owed</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              {formatCurrency(totalOwed)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Credit</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {formatCurrency(totalCredit)}
            </CardTitle>
          </CardHeader>
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
        </Card>
      </div>

      {/* Balance by Patrol */}
      <Card>
        <CardHeader>
          <CardTitle>Balance by Patrol</CardTitle>
          <CardDescription>Summary of balances grouped by patrol</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm font-medium text-gray-500">
                  <th className="pb-3 pr-4">Patrol</th>
                  <th className="pb-3 pr-4 text-center">Scouts</th>
                  <th className="pb-3 pr-4 text-right">Total Owed</th>
                  <th className="pb-3 text-right">Net Balance</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(patrolBalances)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([patrol, data]) => (
                    <tr key={patrol} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium text-gray-900">
                        {patrol}
                      </td>
                      <td className="py-3 pr-4 text-center text-gray-600">
                        {data.count}
                      </td>
                      <td className="py-3 pr-4 text-right text-red-600">
                        {data.owing > 0 ? formatCurrency(data.owing) : '—'}
                      </td>
                      <td
                        className={`py-3 text-right font-medium ${
                          data.total < 0 ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {formatCurrency(data.total)}
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-medium">
                  <td className="py-3 pr-4">Total</td>
                  <td className="py-3 pr-4 text-center">{accounts.length}</td>
                  <td className="py-3 pr-4 text-right text-red-600">
                    {formatCurrency(totalOwed)}
                  </td>
                  <td
                    className={`py-3 text-right ${
                      netBalance < 0 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {formatCurrency(netBalance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Scouts Owing */}
      <Card>
        <CardHeader>
          <CardTitle>Scouts Owing</CardTitle>
          <CardDescription>
            {accounts.filter((a) => (a.balance || 0) < 0).length} scouts with
            negative balance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.filter((a) => (a.balance || 0) < 0).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm font-medium text-gray-500">
                    <th className="pb-3 pr-4">Scout</th>
                    <th className="pb-3 pr-4">Patrol</th>
                    <th className="pb-3 text-right">Amount Owed</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts
                    .filter((a) => (a.balance || 0) < 0)
                    .map((account) => (
                      <tr key={account.id} className="border-b last:border-0">
                        <td className="py-3 pr-4">
                          <Link
                            href={`/accounts/${account.id}`}
                            className="font-medium text-blue-600 hover:text-blue-800"
                          >
                            {account.scouts?.first_name} {account.scouts?.last_name}
                          </Link>
                        </td>
                        <td className="py-3 pr-4 text-gray-600">
                          {account.scouts?.patrol || '—'}
                        </td>
                        <td className="py-3 text-right font-medium text-red-600">
                          {formatCurrency(Math.abs(account.balance || 0))}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-green-600">No scouts currently owe money!</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Recent financial activity</CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm font-medium text-gray-500">
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4">Description</th>
                    <th className="pb-3 pr-4">Type</th>
                    <th className="pb-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const totalAmount = entry.journal_lines.reduce(
                      (sum, line) => sum + (line.debit || 0),
                      0
                    )
                    return (
                      <tr
                        key={entry.id}
                        className={`border-b last:border-0 ${entry.is_void ? 'opacity-50' : ''}`}
                      >
                        <td className="py-3 pr-4 text-gray-600">
                          {entry.entry_date}
                        </td>
                        <td className="py-3 pr-4">
                          <p className="font-medium text-gray-900">
                            {entry.description}
                          </p>
                          {entry.is_void && (
                            <span className="text-xs text-red-500">(VOID)</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="rounded bg-gray-100 px-2 py-1 text-xs capitalize">
                            {entry.entry_type || 'entry'}
                          </span>
                        </td>
                        <td className="py-3 text-right font-medium">
                          {formatCurrency(totalAmount)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No transactions yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
