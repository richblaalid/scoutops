'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { RefreshCw, ExternalLink } from 'lucide-react'

interface OrderLineItem {
  name: string
  quantity: number
  amount: number
}

interface SquareTransaction {
  id: string
  square_payment_id: string
  amount_money: number
  fee_money: number
  net_money: number
  currency: string
  status: string
  card_brand: string | null
  last_4: string | null
  receipt_url: string | null
  receipt_number: string | null
  square_created_at: string
  buyer_email_address: string | null
  cardholder_name: string | null
  note: string | null
  order_line_items: OrderLineItem[] | null
}

interface SquareHistoryTabProps {
  unitId: string
}

export function SquareHistoryTab({ unitId }: SquareHistoryTabProps) {
  const [transactions, setTransactions] = useState<SquareTransaction[]>([])
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(30)
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        days: days.toString(),
        status: statusFilter,
      })

      const response = await fetch(`/api/square/transactions?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transactions')
      }

      setTransactions(data.transactions)
      setLastSyncAt(data.lastSyncAt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [days, statusFilter])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const handleSync = async () => {
    setIsSyncing(true)
    setError(null)

    try {
      const response = await fetch('/api/square/sync', { method: 'POST' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync transactions')
      }

      // Refresh the list after sync
      await fetchTransactions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setIsSyncing(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return 'Never synced'
    return `Last synced: ${formatDate(dateStr)}`
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return 'bg-success-light text-success'
      case 'FAILED':
        return 'bg-error-light text-error'
      case 'PENDING':
        return 'bg-amber-100 text-amber-700'
      default:
        return 'bg-stone-100 text-stone-600'
    }
  }

  const formatCard = (brand: string | null, last4: string | null) => {
    if (!brand && !last4) return '—'
    const brandStr = brand || 'Card'
    const last4Str = last4 ? `•••• ${last4}` : ''
    return `${brandStr} ${last4Str}`.trim()
  }

  const formatItems = (items: OrderLineItem[] | null) => {
    if (!items || items.length === 0) return null
    return items.map((item, idx) => (
      <div key={idx} className="text-xs">
        {item.quantity > 1 ? `${item.quantity}× ` : ''}{item.name}
      </div>
    ))
  }

  const formatCustomer = (txn: SquareTransaction) => {
    const name = txn.cardholder_name
    const email = txn.buyer_email_address
    if (!name && !email) return null
    return { name, email }
  }

  // Calculate summary stats
  const completedTxns = transactions.filter(t => t.status.toUpperCase() === 'COMPLETED')
  const totalAmount = completedTxns.reduce((sum, t) => sum + t.amount_money, 0) / 100
  const totalFees = completedTxns.reduce((sum, t) => sum + t.fee_money, 0) / 100
  const totalNet = completedTxns.reduce((sum, t) => sum + t.net_money, 0) / 100

  return (
    <div className="space-y-6">
      {/* Header with Sync */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Square Transaction History</h2>
          <p className="text-sm text-stone-500">{formatLastSync(lastSyncAt)}</p>
        </div>
        <Button
          variant="outline"
          onClick={handleSync}
          disabled={isSyncing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Amount</CardDescription>
            <CardTitle className="text-2xl text-success">
              {formatCurrency(totalAmount)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-stone-500">
              {completedTxns.length} completed transaction{completedTxns.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Processing Fees</CardDescription>
            <CardTitle className="text-2xl text-error">
              {formatCurrency(totalFees)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-stone-500">Square fees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net Received</CardDescription>
            <CardTitle className="text-2xl text-info">
              {formatCurrency(totalNet)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-stone-500">After fees</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-stone-500">Date range:</span>
          <div className="inline-flex rounded-lg border border-stone-200 bg-white p-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  days === d
                    ? 'bg-forest-700 text-white'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {d} days
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-stone-500">Status:</span>
          <div className="inline-flex rounded-lg border border-stone-200 bg-white p-1">
            {['all', 'completed', 'refunded'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors ${
                  statusFilter === s
                    ? 'bg-forest-700 text-white'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-error-light p-3 text-sm font-medium text-error">
          {error}
        </div>
      )}

      {/* Transaction Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} in the last {days} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-stone-400" />
            </div>
          ) : transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-sm font-medium text-stone-500">
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4">Customer</th>
                    <th className="pb-3 pr-4">Details</th>
                    <th className="pb-3 pr-4">Card</th>
                    <th className="pb-3 pr-4 text-right">Amount</th>
                    <th className="pb-3 pr-4 text-right">Fee</th>
                    <th className="pb-3 pr-4 text-right">Net</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => {
                    const customer = formatCustomer(txn)
                    const items = formatItems(txn.order_line_items)
                    return (
                      <tr key={txn.id} className="border-b border-stone-100 last:border-0">
                        <td className="py-3 pr-4 text-sm text-stone-600">
                          {formatDate(txn.square_created_at)}
                        </td>
                        <td className="py-3 pr-4">
                          {customer ? (
                            <div>
                              {customer.name && (
                                <p className="text-sm font-medium text-stone-900">{customer.name}</p>
                              )}
                              {customer.email && (
                                <p className="text-xs text-stone-500">{customer.email}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-stone-400">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 max-w-[200px]">
                          {txn.note || items ? (
                            <div className="text-stone-700">
                              {txn.note && (
                                <p className="text-sm font-medium">{txn.note}</p>
                              )}
                              {items && (
                                <div className={txn.note ? 'mt-1 text-stone-500' : ''}>
                                  {items}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-stone-400">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-sm text-stone-700">
                          {formatCard(txn.card_brand, txn.last_4)}
                        </td>
                        <td className="py-3 pr-4 text-right text-sm font-medium text-stone-900">
                          {formatCurrency(txn.amount_money / 100)}
                        </td>
                        <td className="py-3 pr-4 text-right text-sm text-error">
                          {txn.fee_money > 0 ? formatCurrency(txn.fee_money / 100) : '—'}
                        </td>
                        <td className="py-3 pr-4 text-right text-sm font-medium text-stone-900">
                          {formatCurrency(txn.net_money / 100)}
                        </td>
                        <td className="py-3">
                          <span
                            className={`rounded-md px-2 py-1 text-xs font-medium capitalize ${getStatusBadgeClass(txn.status)}`}
                          >
                            {txn.status.toLowerCase()}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-stone-500">
              No transactions found. Click &quot;Sync Now&quot; to fetch transactions from Square.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
