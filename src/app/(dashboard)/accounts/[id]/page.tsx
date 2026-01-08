import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface AccountPageProps {
  params: Promise<{ id: string }>
}

interface JournalLine {
  id: string
  debit: number | null
  credit: number | null
  memo: string | null
  journal_entries: {
    id: string
    entry_date: string
    description: string
    entry_type: string | null
    reference: string | null
    is_posted: boolean | null
    is_void: boolean | null
  } | null
}

export default async function AccountDetailPage({ params }: AccountPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get account with scout info
  const { data: accountData } = await supabase
    .from('scout_accounts')
    .select(`
      id,
      balance,
      created_at,
      updated_at,
      scouts (
        id,
        first_name,
        last_name,
        patrol,
        rank,
        is_active
      )
    `)
    .eq('id', id)
    .single()

  if (!accountData) {
    notFound()
  }

  interface ScoutAccount {
    id: string
    balance: number | null
    created_at: string | null
    updated_at: string | null
    scouts: {
      id: string
      first_name: string
      last_name: string
      patrol: string | null
      rank: string | null
      is_active: boolean | null
    } | null
  }

  const account = accountData as ScoutAccount
  const balance = account.balance || 0

  // Get all transactions for this account
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
        reference,
        is_posted,
        is_void
      )
    `)
    .eq('scout_account_id', id)
    .order('id', { ascending: false })

  const transactions = (transactionsData as JournalLine[]) || []

  // Calculate running totals
  const totalDebits = transactions.reduce((sum, tx) => sum + (tx.debit || 0), 0)
  const totalCredits = transactions.reduce((sum, tx) => sum + (tx.credit || 0), 0)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link href="/accounts" className="text-sm text-stone-500 hover:text-stone-700">
          Accounts
        </Link>
        <span className="text-stone-400">/</span>
        <span className="text-sm text-stone-900">
          {account.scouts?.first_name} {account.scouts?.last_name}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">
            {account.scouts?.first_name} {account.scouts?.last_name}
          </h1>
          <p className="mt-1 text-stone-600">
            {account.scouts?.patrol && `${account.scouts.patrol} Patrol`}
            {account.scouts?.patrol && account.scouts?.rank && ' • '}
            {account.scouts?.rank}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-stone-500">Current Balance</p>
          <p
            className={`text-3xl font-bold ${
              balance < 0 ? 'text-error' : balance > 0 ? 'text-success' : 'text-stone-900'
            }`}
          >
            {formatCurrency(balance)}
          </p>
          <p className="text-sm text-stone-500">
            {balance < 0 ? 'Owes' : balance > 0 ? 'Credit' : 'Zero Balance'}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Charges (Debits)</CardDescription>
            <CardTitle className="text-xl text-error">
              {formatCurrency(totalDebits)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Payments (Credits)</CardDescription>
            <CardTitle className="text-xl text-success">
              {formatCurrency(totalCredits)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net (Credits - Debits)</CardDescription>
            <CardTitle
              className={`text-xl ${balance < 0 ? 'text-error' : 'text-success'}`}
            >
              {formatCurrency(balance)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </CardDescription>
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
                    <th className="pb-3 pr-4">Reference</th>
                    <th className="pb-3 pr-4 text-right">Debit</th>
                    <th className="pb-3 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const isVoid = tx.journal_entries?.is_void
                    return (
                      <tr
                        key={tx.id}
                        className={`border-b last:border-0 ${isVoid ? 'opacity-50' : ''}`}
                      >
                        <td className="py-3 pr-4 text-stone-600">
                          {tx.journal_entries?.entry_date || '—'}
                        </td>
                        <td className="py-3 pr-4">
                          <p className="font-medium text-stone-900">
                            {tx.journal_entries?.description || tx.memo || '—'}
                          </p>
                          {tx.memo && tx.journal_entries?.description && (
                            <p className="text-xs text-stone-500">{tx.memo}</p>
                          )}
                          {isVoid && (
                            <span className="text-xs text-error">(VOID)</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="rounded bg-stone-100 px-2 py-1 text-xs capitalize">
                            {tx.journal_entries?.entry_type || 'entry'}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-sm text-stone-500">
                          {tx.journal_entries?.reference || '—'}
                        </td>
                        <td className="py-3 pr-4 text-right text-error">
                          {tx.debit && tx.debit > 0 ? formatCurrency(tx.debit) : '—'}
                        </td>
                        <td className="py-3 text-right text-success">
                          {tx.credit && tx.credit > 0 ? formatCurrency(tx.credit) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-medium">
                    <td colSpan={4} className="py-3 pr-4 text-right">
                      Totals:
                    </td>
                    <td className="py-3 pr-4 text-right text-error">
                      {formatCurrency(totalDebits)}
                    </td>
                    <td className="py-3 text-right text-success">
                      {formatCurrency(totalCredits)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-stone-500">No transactions yet</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Link
            href={`/scouts/${account.scouts?.id}`}
            className="rounded-md bg-stone-100 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-200"
          >
            View Scout Profile
          </Link>
          <Link
            href="/billing"
            className="rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-800"
          >
            Create Billing
          </Link>
          <Link
            href="/payments"
            className="rounded-md bg-success px-4 py-2 text-sm font-medium text-white hover:bg-success/90"
          >
            Record Payment
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
