import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SquareConnectionCard } from '@/components/settings/square-connection-card'

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

  // Get user's membership and role
  const { data: membership } = await supabase
    .from('unit_memberships')
    .select('unit_id, role, units(name)')
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) {
    redirect('/login')
  }

  const isAdmin = membership.role === 'admin'

  // Get Square credentials for this unit
  const { data: squareCredentials } = await supabase
    .from('unit_square_credentials')
    .select('*')
    .eq('unit_id', membership.unit_id)
    .eq('is_active', true)
    .single()

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
