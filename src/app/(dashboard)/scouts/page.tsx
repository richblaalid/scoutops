import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScoutsList } from '@/components/scouts/scouts-list'
import { AddScoutButton } from '@/components/scouts/add-scout-button'

export default async function ScoutsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get user's unit membership
  const { data: membershipData } = await supabase
    .from('unit_memberships')
    .select('unit_id, role')
    .eq('profile_id', user.id)
    .eq('is_active', true)
    .single()

  const membership = membershipData as { unit_id: string; role: string } | null

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

  // Get scouts for this unit
  const { data: scoutsData } = await supabase
    .from('scouts')
    .select(`
      id,
      first_name,
      last_name,
      patrol,
      rank,
      is_active,
      date_of_birth,
      bsa_member_id,
      scout_accounts (
        id,
        balance
      )
    `)
    .eq('unit_id', membership.unit_id)
    .order('last_name', { ascending: true })

  interface ScoutWithAccount {
    id: string
    first_name: string
    last_name: string
    patrol: string | null
    rank: string | null
    is_active: boolean | null
    date_of_birth: string | null
    bsa_member_id: string | null
    scout_accounts: { id: string; balance: number | null } | null
  }

  const scouts = (scoutsData as ScoutWithAccount[]) || []

  const canManageScouts = ['admin', 'treasurer', 'leader'].includes(membership.role)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Scouts</h1>
          <p className="mt-1 text-gray-600">Manage your unit&apos;s scout roster</p>
        </div>
        {canManageScouts && <AddScoutButton unitId={membership.unit_id} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scout Roster</CardTitle>
          <CardDescription>
            {scouts.length} scout{scouts.length !== 1 ? 's' : ''} in your unit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScoutsList scouts={scouts} canManage={canManageScouts} unitId={membership.unit_id} />
        </CardContent>
      </Card>
    </div>
  )
}
