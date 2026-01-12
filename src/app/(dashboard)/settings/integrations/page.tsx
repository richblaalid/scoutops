import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SquareConnectionCard } from '@/components/settings/square-connection-card'
import { PaymentFeeSettingsCard } from '@/components/settings/payment-fee-settings-card'
import { isFinancialRole } from '@/lib/roles'

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's membership and role with unit fee settings
  const { data: membership } = await supabase
    .from('unit_memberships')
    .select(
      `unit_id, role, units(
        name,
        processing_fee_percent,
        processing_fee_fixed,
        pass_fees_to_payer
      )`
    )
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) {
    redirect('/login')
  }

  // Only admin and treasurer can access integrations
  if (!isFinancialRole(membership.role)) {
    redirect('/settings')
  }

  const isAdmin = membership.role === 'admin'
  const unit = membership.units as {
    name: string
    processing_fee_percent: number | null
    processing_fee_fixed: number | null
    pass_fees_to_payer: boolean | null
  } | null

  // Get Square credentials for this unit
  const { data: squareCredentials } = await supabase
    .from('unit_square_credentials')
    .select('*')
    .eq('unit_id', membership.unit_id)
    .eq('is_active', true)
    .single()

  // Calculate effective rate from recent transactions (last 30 days)
  let effectiveRate: number | null = null
  if (squareCredentials) {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: recentTransactions } = await supabase
      .from('square_transactions')
      .select('amount_money, fee_money')
      .eq('unit_id', membership.unit_id)
      .eq('status', 'COMPLETED')
      .gte('square_created_at', thirtyDaysAgo.toISOString())

    if (recentTransactions && recentTransactions.length > 0) {
      const totalAmount = recentTransactions.reduce(
        (sum, t) => sum + (t.amount_money || 0),
        0
      )
      const totalFees = recentTransactions.reduce(
        (sum, t) => sum + (t.fee_money || 0),
        0
      )
      if (totalAmount > 0) {
        effectiveRate = totalFees / totalAmount
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-stone-600">Connect third-party services to enhance your unit</p>
        </div>
        <Link href="/settings">
          <Button variant="outline">Back to Settings</Button>
        </Link>
      </div>

      {params.success && (
        <div className="rounded-lg bg-success-light border border-success p-4 text-success">
          {params.success}
        </div>
      )}

      {params.error && (
        <div className="rounded-lg bg-error-light border border-error p-4 text-error">
          {params.error}
        </div>
      )}

      <div className="grid gap-6">
        <SquareConnectionCard
          isConnected={!!squareCredentials}
          merchantId={squareCredentials?.merchant_id}
          connectedAt={squareCredentials?.connected_at}
          lastSyncAt={squareCredentials?.last_sync_at}
          environment={squareCredentials?.environment}
          isAdmin={isAdmin}
        />

        <PaymentFeeSettingsCard
          unitId={membership.unit_id}
          processingFeePercent={Number(unit?.processing_fee_percent) || 0.026}
          processingFeeFixed={Number(unit?.processing_fee_fixed) || 0.1}
          passFeesToPayer={unit?.pass_fees_to_payer || false}
          effectiveRate={effectiveRate}
          isAdmin={isAdmin}
          squareConnected={!!squareCredentials}
        />

        {/* Placeholder for future integrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-stone-400">Coming Soon</span>
            </CardTitle>
            <CardDescription>
              More integrations will be available in future updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-stone-500 space-y-1">
              <li>Stripe payments</li>
              <li>QuickBooks sync</li>
              <li>Google Calendar</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
