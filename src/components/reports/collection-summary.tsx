'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, cn } from '@/lib/utils'

interface PaymentData {
  id: string
  amount: number
  net_amount: number
  fee_amount: number | null
  payment_method: string | null
  created_at: string
}

interface BillingData {
  id: string
  total_amount: number
  billing_date: string
}

interface CollectionSummaryProps {
  payments: PaymentData[]
  billingRecords: BillingData[]
}

interface PeriodStats {
  label: string
  billed: number
  collected: number
  fees: number
  net: number
  rate: number
}

export function CollectionSummary({ payments, billingRecords }: CollectionSummaryProps) {
  const now = new Date()

  // Define time periods
  const periods = {
    thisMonth: {
      label: 'This Month',
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: now,
    },
    lastMonth: {
      label: 'Last Month',
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      end: new Date(now.getFullYear(), now.getMonth(), 0),
    },
    thisQuarter: {
      label: 'This Quarter',
      start: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1),
      end: now,
    },
    ytd: {
      label: 'Year to Date',
      start: new Date(now.getFullYear(), 0, 1),
      end: now,
    },
  }

  // Calculate stats for each period
  const calculatePeriodStats = (start: Date, end: Date, label: string): PeriodStats => {
    const periodPayments = payments.filter(p => {
      const date = new Date(p.created_at)
      return date >= start && date <= end
    })

    const periodBilling = billingRecords.filter(b => {
      const date = new Date(b.billing_date)
      return date >= start && date <= end
    })

    const billed = periodBilling.reduce((sum, b) => sum + b.total_amount, 0)
    const collected = periodPayments.reduce((sum, p) => sum + p.amount, 0)
    const fees = periodPayments.reduce((sum, p) => sum + (p.fee_amount || 0), 0)
    const net = periodPayments.reduce((sum, p) => sum + p.net_amount, 0)
    const rate = billed > 0 ? (collected / billed) * 100 : 0

    return { label, billed, collected, fees, net, rate }
  }

  const stats: PeriodStats[] = [
    calculatePeriodStats(periods.thisMonth.start, periods.thisMonth.end, periods.thisMonth.label),
    calculatePeriodStats(periods.lastMonth.start, periods.lastMonth.end, periods.lastMonth.label),
    calculatePeriodStats(periods.thisQuarter.start, periods.thisQuarter.end, periods.thisQuarter.label),
    calculatePeriodStats(periods.ytd.start, periods.ytd.end, periods.ytd.label),
  ]

  // Calculate all-time totals
  const allTimeBilled = billingRecords.reduce((sum, b) => sum + b.total_amount, 0)
  const allTimeCollected = payments.reduce((sum, p) => sum + p.amount, 0)
  const allTimeFees = payments.reduce((sum, p) => sum + (p.fee_amount || 0), 0)
  const allTimeNet = payments.reduce((sum, p) => sum + p.net_amount, 0)
  const allTimeRate = allTimeBilled > 0 ? (allTimeCollected / allTimeBilled) * 100 : 0

  // Get rate color
  const getRateColor = (rate: number) => {
    if (rate >= 90) return 'text-success'
    if (rate >= 70) return 'text-warning'
    return 'text-error'
  }

  // Get rate background for progress bar
  const getRateBg = (rate: number) => {
    if (rate >= 90) return 'bg-success'
    if (rate >= 70) return 'bg-warning'
    return 'bg-error'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Collection & Cash Flow</CardTitle>
        <CardDescription>
          Payment collection rates and cash flow by time period
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* All-Time Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-stone-500">All-Time Billed</p>
            <p className="text-2xl font-bold text-stone-900">{formatCurrency(allTimeBilled)}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-stone-500">All-Time Collected</p>
            <p className="text-2xl font-bold text-success">{formatCurrency(allTimeCollected)}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-stone-500">Processing Fees</p>
            <p className="text-2xl font-bold text-error">{formatCurrency(allTimeFees)}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-stone-500">Collection Rate</p>
            <p className={cn('text-2xl font-bold', getRateColor(allTimeRate))}>
              {allTimeRate.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Period Breakdown */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm font-medium text-stone-500">
                <th className="pb-3 pr-4">Period</th>
                <th className="pb-3 pr-4 text-right">Billed</th>
                <th className="pb-3 pr-4 text-right">Collected</th>
                <th className="pb-3 pr-4 text-right">Fees</th>
                <th className="pb-3 pr-4 text-right">Net</th>
                <th className="pb-3 text-right w-32">Collection Rate</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((stat) => (
                <tr key={stat.label} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium text-stone-900">{stat.label}</td>
                  <td className="py-3 pr-4 text-right text-stone-600">
                    {stat.billed > 0 ? formatCurrency(stat.billed) : '—'}
                  </td>
                  <td className="py-3 pr-4 text-right text-success font-medium">
                    {stat.collected > 0 ? formatCurrency(stat.collected) : '—'}
                  </td>
                  <td className="py-3 pr-4 text-right text-stone-500">
                    {stat.fees > 0 ? formatCurrency(stat.fees) : '—'}
                  </td>
                  <td className="py-3 pr-4 text-right text-stone-600">
                    {stat.net > 0 ? formatCurrency(stat.net) : '—'}
                  </td>
                  <td className="py-3">
                    {stat.billed > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', getRateBg(stat.rate))}
                            style={{ width: `${Math.min(stat.rate, 100)}%` }}
                          />
                        </div>
                        <span className={cn('text-sm font-medium w-12 text-right', getRateColor(stat.rate))}>
                          {stat.rate.toFixed(0)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-stone-400 text-sm">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 text-xs text-stone-500 pt-2 border-t">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span>90%+ (Excellent)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span>70-89% (Good)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-error" />
            <span>&lt;70% (Needs Attention)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
