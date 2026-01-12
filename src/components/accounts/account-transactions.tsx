'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'

interface JournalLine {
  id: string
  debit: number | null
  credit: number | null
  memo: string | null
  journal_entries: {
    id: string
    entry_date: string
    created_at: string | null
    description: string
    entry_type: string | null
    reference: string | null
    is_posted: boolean | null
    is_void: boolean | null
  } | null
}

type FilterType = 'all' | 'charges' | 'payments'

interface AccountTransactionsProps {
  transactions: JournalLine[]
}

export function AccountTransactions({ transactions }: AccountTransactionsProps) {
  const [filter, setFilter] = useState<FilterType>('all')

  const filteredTransactions = transactions.filter((tx) => {
    if (filter === 'all') return true
    if (filter === 'charges') return (tx.debit || 0) > 0
    if (filter === 'payments') return (tx.credit || 0) > 0
    return true
  })

  const totalDebits = filteredTransactions.reduce((sum, tx) => sum + (tx.debit || 0), 0)
  const totalCredits = filteredTransactions.reduce((sum, tx) => sum + (tx.credit || 0), 0)

  const filterButtons: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'charges', label: 'Charges' },
    { value: 'payments', label: 'Payments' },
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Transaction History</CardTitle>
          <div className="flex gap-1 rounded-lg bg-stone-100 p-1">
            {filterButtons.map((btn) => (
              <button
                key={btn.value}
                onClick={() => setFilter(btn.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === btn.value
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-stone-500">
          {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
        </p>
      </CardHeader>
      <CardContent>
        {filteredTransactions.length > 0 ? (
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
                {filteredTransactions.map((tx) => {
                  const isVoid = tx.journal_entries?.is_void
                  return (
                    <tr
                      key={tx.id}
                      className={`border-b last:border-0 ${isVoid ? 'opacity-50' : ''}`}
                    >
                      <td className="py-3 pr-4 text-stone-600">
                        {tx.journal_entries?.created_at
                          ? formatDate(tx.journal_entries.created_at)
                          : tx.journal_entries?.entry_date
                            ? formatDate(tx.journal_entries.entry_date)
                            : '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-stone-900">
                          {tx.journal_entries?.description || tx.memo || '—'}
                        </p>
                        {tx.memo && tx.journal_entries?.description && (
                          <p className="text-xs text-stone-500">{tx.memo}</p>
                        )}
                        {isVoid && <span className="text-xs text-error">(VOID)</span>}
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
                  <td className="py-3 pr-4 text-right text-error">{formatCurrency(totalDebits)}</td>
                  <td className="py-3 text-right text-success">{formatCurrency(totalCredits)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="text-stone-500">
            {filter === 'all' ? 'No transactions yet' : `No ${filter} found`}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
