'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface AgingCharge {
  id: string
  amount: number
  billing_date: string
  description: string
  scout_name: string
  scout_account_id: string
  patrol: string | null
}

interface AgingReportProps {
  charges: AgingCharge[]
}

interface AgingBucket {
  label: string
  min: number
  max: number
  color: string
  bgColor: string
  charges: AgingCharge[]
  total: number
}

export function AgingReport({ charges }: AgingReportProps) {
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Calculate days overdue for each charge
  const chargesWithAge = charges.map(charge => {
    const billingDate = new Date(charge.billing_date)
    billingDate.setHours(0, 0, 0, 0)
    const daysOverdue = Math.floor((today.getTime() - billingDate.getTime()) / (1000 * 60 * 60 * 24))
    return { ...charge, daysOverdue }
  })

  // Define aging buckets
  const buckets: AgingBucket[] = [
    { label: 'Current', min: 0, max: 30, color: 'text-stone-600', bgColor: 'bg-stone-100', charges: [], total: 0 },
    { label: '31-60 Days', min: 31, max: 60, color: 'text-warning', bgColor: 'bg-warning-light', charges: [], total: 0 },
    { label: '61-90 Days', min: 61, max: 90, color: 'text-orange-600', bgColor: 'bg-orange-100', charges: [], total: 0 },
    { label: '90+ Days', min: 91, max: Infinity, color: 'text-error', bgColor: 'bg-error-light', charges: [], total: 0 },
  ]

  // Sort charges into buckets
  chargesWithAge.forEach(charge => {
    const bucket = buckets.find(b => charge.daysOverdue >= b.min && charge.daysOverdue <= b.max)
    if (bucket) {
      bucket.charges.push(charge)
      bucket.total += charge.amount
    }
  })

  const grandTotal = buckets.reduce((sum, b) => sum + b.total, 0)

  // Group charges by scout for the detail view
  const groupByScout = (charges: AgingCharge[]) => {
    const grouped = charges.reduce((acc, charge) => {
      const key = charge.scout_account_id
      if (!acc[key]) {
        acc[key] = {
          scout_name: charge.scout_name,
          scout_account_id: charge.scout_account_id,
          patrol: charge.patrol,
          charges: [],
          total: 0,
        }
      }
      acc[key].charges.push(charge)
      acc[key].total += charge.amount
      return acc
    }, {} as Record<string, { scout_name: string; scout_account_id: string; patrol: string | null; charges: AgingCharge[]; total: number }>)

    return Object.values(grouped).sort((a, b) => b.total - a.total)
  }

  if (charges.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aging Report</CardTitle>
          <CardDescription>Outstanding balances by age</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-success font-medium">No outstanding charges!</p>
            <p className="text-sm text-stone-500 mt-1">All scouts are current on their accounts.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aging Report</CardTitle>
        <CardDescription>
          {charges.length} unpaid charge{charges.length !== 1 ? 's' : ''} totaling {formatCurrency(grandTotal)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Bar */}
        <div className="space-y-2">
          <div className="flex h-8 rounded-lg overflow-hidden">
            {buckets.map(bucket => {
              const percentage = grandTotal > 0 ? (bucket.total / grandTotal) * 100 : 0
              if (percentage === 0) return null
              return (
                <div
                  key={bucket.label}
                  className={cn(bucket.bgColor, 'flex items-center justify-center text-xs font-medium', bucket.color)}
                  style={{ width: `${percentage}%` }}
                  title={`${bucket.label}: ${formatCurrency(bucket.total)}`}
                >
                  {percentage > 15 && formatCurrency(bucket.total)}
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-xs text-stone-500">
            <span>Current</span>
            <span>90+ Days Overdue</span>
          </div>
        </div>

        {/* Bucket Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {buckets.map(bucket => (
            <button
              key={bucket.label}
              onClick={() => setExpandedBucket(expandedBucket === bucket.label ? null : bucket.label)}
              className={cn(
                'text-left rounded-lg border p-4 transition-all',
                bucket.charges.length > 0 ? 'hover:border-stone-400 cursor-pointer' : 'opacity-50 cursor-default',
                expandedBucket === bucket.label && 'ring-2 ring-forest-600 border-forest-600'
              )}
              disabled={bucket.charges.length === 0}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn('text-sm font-medium', bucket.color)}>{bucket.label}</span>
                {bucket.charges.length > 0 && (
                  <ChevronDown className={cn(
                    'h-4 w-4 text-stone-400 transition-transform',
                    expandedBucket === bucket.label && 'rotate-180'
                  )} />
                )}
              </div>
              <p className={cn('text-2xl font-bold', bucket.color)}>
                {formatCurrency(bucket.total)}
              </p>
              <p className="text-xs text-stone-500 mt-1">
                {bucket.charges.length} charge{bucket.charges.length !== 1 ? 's' : ''}
              </p>
            </button>
          ))}
        </div>

        {/* Expanded Detail */}
        {expandedBucket && (
          <div className="border rounded-lg overflow-hidden">
            <div className={cn(
              'px-4 py-2 font-medium text-sm',
              buckets.find(b => b.label === expandedBucket)?.bgColor,
              buckets.find(b => b.label === expandedBucket)?.color
            )}>
              {expandedBucket} - Detail by Scout
            </div>
            <div className="divide-y">
              {groupByScout(buckets.find(b => b.label === expandedBucket)?.charges || []).map(scout => (
                <div key={scout.scout_account_id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <Link
                        href={`/accounts/${scout.scout_account_id}`}
                        className="font-medium text-forest-600 hover:text-forest-800"
                      >
                        {scout.scout_name}
                      </Link>
                      {scout.patrol && (
                        <span className="text-sm text-stone-500 ml-2">({scout.patrol})</span>
                      )}
                    </div>
                    <span className="font-semibold">{formatCurrency(scout.total)}</span>
                  </div>
                  <div className="space-y-1 pl-4 border-l-2 border-stone-200">
                    {scout.charges.map(charge => (
                      <div key={charge.id} className="flex justify-between text-sm">
                        <span className="text-stone-600">
                          {charge.description}
                          <span className="text-stone-400 ml-2">
                            ({new Date(charge.billing_date).toLocaleDateString()})
                          </span>
                        </span>
                        <span>{formatCurrency(charge.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left font-medium text-stone-500">
                <th className="pb-2 pr-4">Aging Bucket</th>
                <th className="pb-2 pr-4 text-center">Charges</th>
                <th className="pb-2 pr-4 text-center">Scouts</th>
                <th className="pb-2 text-right">Amount</th>
                <th className="pb-2 text-right">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map(bucket => {
                const uniqueScouts = new Set(bucket.charges.map(c => c.scout_account_id)).size
                const percentage = grandTotal > 0 ? (bucket.total / grandTotal) * 100 : 0
                return (
                  <tr key={bucket.label} className="border-b last:border-0">
                    <td className={cn('py-2 pr-4 font-medium', bucket.color)}>{bucket.label}</td>
                    <td className="py-2 pr-4 text-center text-stone-600">{bucket.charges.length}</td>
                    <td className="py-2 pr-4 text-center text-stone-600">{uniqueScouts}</td>
                    <td className={cn('py-2 pr-4 text-right font-medium', bucket.color)}>
                      {formatCurrency(bucket.total)}
                    </td>
                    <td className="py-2 text-right text-stone-500">
                      {percentage.toFixed(1)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-medium">
                <td className="py-2 pr-4">Total</td>
                <td className="py-2 pr-4 text-center">{charges.length}</td>
                <td className="py-2 pr-4 text-center">
                  {new Set(charges.map(c => c.scout_account_id)).size}
                </td>
                <td className="py-2 pr-4 text-right">{formatCurrency(grandTotal)}</td>
                <td className="py-2 text-right">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
