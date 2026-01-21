import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canAccessPage } from '@/lib/roles'

export default async function FinancesOverviewPage() {
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

  // Get user's unit membership
  const { data: membershipData } = await supabase
    .from('unit_memberships')
    .select('unit_id, role')
    .eq('profile_id', profile.id)
    .eq('status', 'active')
    .single()

  const membership = membershipData as { unit_id: string; role: string } | null

  if (!membership) {
    redirect('/login')
  }

  // Parents and scouts should go directly to accounts
  if (membership.role === 'parent' || membership.role === 'scout') {
    redirect('/finances/accounts')
  }

  // Check role-based access for overview (admin, treasurer, leader)
  if (!canAccessPage(membership.role, 'reports')) {
    redirect('/finances/accounts')
  }

  // Placeholder - will be implemented in Phase 1
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Finances</h1>
        <p className="mt-1 text-stone-600">
          Financial overview and management
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-stone-500">
        <p>Overview dashboard coming soon...</p>
        <p className="mt-2 text-sm">
          For now, use the navigation to access Accounts, Billing, or Payments.
        </p>
      </div>
    </div>
  )
}
