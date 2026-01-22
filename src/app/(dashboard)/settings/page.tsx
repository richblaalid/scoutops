import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { UnitInfoForm } from '@/components/settings/unit-info-form'
import { PatrolList } from '@/components/settings/patrol-list'
import { LogoUpload } from '@/components/settings/logo-upload'
import { PaymentProcessingCard } from '@/components/settings/payment-processing-card'
import { ScoutbookSyncCardLazy } from '@/components/settings/scoutbook-sync-card-lazy'
import { isFinancialRole, isAdmin as checkIsAdmin } from '@/lib/roles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileSpreadsheet, Award } from 'lucide-react'
import { SettingsTabs } from '@/components/settings/settings-tabs'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; tab?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Get user's membership and unit info with fee settings
  const { data: membership } = await supabase
    .from('unit_memberships')
    .select(
      `unit_id, role, units:units!unit_memberships_unit_id_fkey(
        id,
        name,
        unit_number,
        unit_type,
        council,
        district,
        chartered_org,
        logo_url,
        processing_fee_percent,
        processing_fee_fixed,
        pass_fees_to_payer
      )`
    )
    .eq('profile_id', profile.id)
    .eq('status', 'active')
    .single()

  if (!membership) {
    redirect('/login')
  }

  // Only admin and treasurer can access settings
  if (!isFinancialRole(membership.role)) {
    redirect('/profile')
  }

  const isAdmin = checkIsAdmin(membership.role)
  const unit = membership.units as {
    id: string
    name: string
    unit_number: string
    unit_type: string
    council: string | null
    district: string | null
    chartered_org: string | null
    logo_url: string | null
    processing_fee_percent: number | null
    processing_fee_fixed: number | null
    pass_fees_to_payer: boolean | null
  } | null

  if (!unit) {
    redirect('/profile')
  }

  // Get patrols for this unit (for admin Unit tab)
  const { data: patrols } = await supabase
    .from('patrols')
    .select('id, name, display_order, is_active, unit_id')
    .eq('unit_id', membership.unit_id)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

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

  // Get last Scoutbook sync session
  const { data: lastSyncSession } = await supabase
    .from('sync_sessions')
    .select('completed_at, records_extracted')
    .eq('unit_id', membership.unit_id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .single()

  // Unit Tab Content (admin only)
  const unitTabContent = isAdmin ? (
    <div className="grid gap-6">
      <UnitInfoForm
        unitId={unit.id}
        name={unit.name}
        unitNumber={unit.unit_number}
        unitType={unit.unit_type}
        council={unit.council}
        district={unit.district}
        charteredOrg={unit.chartered_org}
      />

      <PatrolList
        unitId={membership.unit_id}
        patrols={patrols || []}
      />

      <LogoUpload
        unitId={membership.unit_id}
        currentLogoUrl={unit.logo_url}
      />
    </div>
  ) : null

  // Data Tab Content
  const dataTabContent = (
    <div className="grid gap-6">
      <ScoutbookSyncCardLazy
        lastSyncAt={lastSyncSession?.completed_at}
        lastSyncMemberCount={lastSyncSession?.records_extracted}
        isAdmin={isAdmin}
      />

      <Card>
        <CardHeader>
          <CardTitle>Import Data</CardTitle>
          <CardDescription>Import data from external sources</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-stone-200 p-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-stone-400" />
              <div>
                <p className="font-medium">Import Roster</p>
                <p className="text-sm text-stone-500">Import scouts and adults from BSA roster CSV</p>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link href="/settings/import">Import</Link>
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-stone-200 p-4">
            <div className="flex items-center gap-3">
              <Award className="h-8 w-8 text-stone-400" />
              <div>
                <p className="font-medium">Import Advancement History</p>
                <p className="text-sm text-stone-500">Import a scout&apos;s advancement from ScoutBook</p>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link href="/settings/import/advancement">Import</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // Integrations Tab Content
  const integrationsTabContent = (
    <div className="grid gap-6">
      <PaymentProcessingCard
        isConnected={!!squareCredentials}
        merchantId={squareCredentials?.merchant_id}
        connectedAt={squareCredentials?.connected_at}
        lastSyncAt={squareCredentials?.last_sync_at}
        environment={(process.env.SQUARE_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production'}
        unitId={membership.unit_id}
        processingFeePercent={Number(unit.processing_fee_percent) || 0.026}
        processingFeeFixed={Number(unit.processing_fee_fixed) || 0.1}
        passFeesToPayer={unit.pass_fees_to_payer || false}
        effectiveRate={effectiveRate}
        isAdmin={isAdmin}
      />

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
  )

  // Determine default tab based on role and URL param
  const defaultTab = params.tab || (isAdmin ? 'unit' : 'data')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-stone-600">
          Configure your unit settings and data
        </p>
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

      <SettingsTabs
        defaultTab={defaultTab}
        isAdmin={isAdmin}
        unitTabContent={unitTabContent}
        dataTabContent={dataTabContent}
        integrationsTabContent={integrationsTabContent}
      />
    </div>
  )
}
