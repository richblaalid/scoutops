import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { EditScoutButton } from '@/components/scouts/edit-scout-button'
import { ScoutGuardianAssociations } from '@/components/scouts/scout-guardian-associations'

interface ScoutPageProps {
  params: Promise<{ id: string }>
}

export default async function ScoutPage({ params }: ScoutPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get scout details
  const { data: scoutData } = await supabase
    .from('scouts')
    .select(`
      id,
      first_name,
      last_name,
      patrol_id,
      rank,
      current_position,
      current_position_2,
      is_active,
      date_of_birth,
      bsa_member_id,
      gender,
      date_joined,
      health_form_status,
      health_form_expires,
      swim_classification,
      swim_class_date,
      created_at,
      updated_at,
      unit_id,
      scout_accounts (
        id,
        billing_balance,
        funds_balance
      ),
      units (
        id,
        name,
        unit_number
      ),
      patrols (
        name
      )
    `)
    .eq('id', id)
    .single()

  if (!scoutData) {
    notFound()
  }

  // Get user's profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  // Get user's unit membership to check role
  const { data: membershipData } = profileData
    ? await supabase
        .from('unit_memberships')
        .select('unit_id, role')
        .eq('profile_id', profileData.id)
        .eq('status', 'active')
        .single()
    : { data: null }

  const membership = membershipData as { unit_id: string; role: string } | null
  const canEditScout = membership && ['admin', 'treasurer', 'leader'].includes(membership.role)
  const canEditGuardians = membership && ['admin', 'treasurer'].includes(membership.role)

  interface Scout {
    id: string
    first_name: string
    last_name: string
    patrol_id: string | null
    rank: string | null
    current_position: string | null
    current_position_2: string | null
    is_active: boolean | null
    date_of_birth: string | null
    bsa_member_id: string | null
    gender: string | null
    date_joined: string | null
    health_form_status: string | null
    health_form_expires: string | null
    swim_classification: string | null
    swim_class_date: string | null
    created_at: string | null
    updated_at: string | null
    unit_id: string
    scout_accounts: { id: string; billing_balance: number | null; funds_balance: number } | null
    units: { id: string; name: string; unit_number: string } | null
    patrols: { name: string } | null
  }

  const scout = scoutData as Scout
  const scoutAccount = scout.scout_accounts
  const billingBalance = scoutAccount?.billing_balance ?? 0
  const fundsBalance = scoutAccount?.funds_balance ?? 0

  // Get recent transactions for this scout
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
        is_posted
      )
    `)
    .eq('scout_account_id', scoutAccount?.id || '')
    .order('id', { ascending: false })
    .limit(10)

  interface Transaction {
    id: string
    debit: number | null
    credit: number | null
    memo: string | null
    journal_entries: {
      id: string
      entry_date: string
      description: string
      entry_type: string | null
      is_posted: boolean | null
    } | null
  }

  const transactions = (transactionsData as Transaction[]) || []

  // Get linked guardians for this scout
  const { data: guardiansData } = await supabase
    .from('scout_guardians')
    .select(`
      id,
      relationship,
      is_primary,
      profile_id,
      profiles (
        id,
        first_name,
        last_name,
        full_name,
        email,
        member_type,
        position,
        user_id
      )
    `)
    .eq('scout_id', id)
    .order('is_primary', { ascending: false })

  interface Guardian {
    id: string
    relationship: string | null
    is_primary: boolean | null
    profile_id: string
    profiles: {
      id: string
      first_name: string | null
      last_name: string | null
      full_name: string | null
      email: string | null
      member_type: string | null
      position: string | null
      user_id: string | null
    }
  }

  const guardians = ((guardiansData || []) as Guardian[]).filter(g => g.profiles !== null)

  // Get available profiles (adults in this unit) for adding guardians
  let availableProfiles: { id: string; first_name: string | null; last_name: string | null; full_name: string | null; email: string | null; member_type: string | null; user_id: string | null }[] = []

  if (canEditGuardians && membership) {
    // Get profile IDs from unit memberships
    const { data: membersData } = await supabase
      .from('unit_memberships')
      .select('profile_id')
      .eq('unit_id', membership.unit_id)
      .eq('status', 'active')

    const profileIds = (membersData || [])
      .map(m => m.profile_id)
      .filter((id): id is string => id !== null)

    if (profileIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, full_name, email, member_type, user_id')
        .in('id', profileIds)

      availableProfiles = (profilesData || []) as typeof availableProfiles
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/scouts"
              className="text-sm text-stone-500 hover:text-stone-700"
            >
              Scouts
            </Link>
            <span className="text-stone-400">/</span>
            <span className="text-sm text-stone-900">
              {scout.first_name} {scout.last_name}
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold text-stone-900">
            {scout.first_name} {scout.last_name}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {canEditScout && (
            <EditScoutButton
              unitId={scout.unit_id}
              scout={{
                id: scout.id,
                first_name: scout.first_name,
                last_name: scout.last_name,
                patrol_id: scout.patrol_id,
                rank: scout.rank,
                date_of_birth: scout.date_of_birth,
                bsa_member_id: scout.bsa_member_id,
                is_active: scout.is_active,
              }}
              guardians={canEditGuardians ? guardians.map(g => ({
                id: g.id,
                relationship: g.relationship,
                is_primary: g.is_primary,
                profiles: {
                  id: g.profiles.id,
                  first_name: g.profiles.first_name,
                  last_name: g.profiles.last_name,
                  email: g.profiles.email || '',
                }
              })) : []}
              availableMembers={canEditGuardians ? availableProfiles.map(p => ({
                id: p.id,
                first_name: p.first_name,
                last_name: p.last_name,
                email: p.email || '',
              })) : []}
            />
          )}
          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
              scout.is_active
                ? 'bg-success-light text-success'
                : 'bg-stone-100 text-stone-600'
            }`}
          >
            {scout.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Scout Info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Scout Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-stone-500">Patrol</p>
              <p className="font-medium">{scout.patrols?.name || 'Not assigned'}</p>
            </div>
            <div>
              <p className="text-sm text-stone-500">Rank</p>
              <p className="font-medium">{scout.rank || 'Not set'}</p>
            </div>
            {scout.current_position && (
              <div>
                <p className="text-sm text-stone-500">Position</p>
                <p className="font-medium">{scout.current_position}</p>
              </div>
            )}
            {scout.date_of_birth && (
              <div>
                <p className="text-sm text-stone-500">Date of Birth</p>
                <p className="font-medium">{scout.date_of_birth}</p>
              </div>
            )}
            {scout.bsa_member_id && (
              <div>
                <p className="text-sm text-stone-500">BSA Member ID</p>
                <p className="font-medium">{scout.bsa_member_id}</p>
              </div>
            )}
            {scout.date_joined && (
              <div>
                <p className="text-sm text-stone-500">Date Joined</p>
                <p className="font-medium">{scout.date_joined}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Balance */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Account Balance</CardTitle>
            <CardDescription>Current financial status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Scout Funds */}
              <div>
                <p className="text-sm font-medium text-stone-500">Scout Funds</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className={`text-3xl font-bold ${fundsBalance > 0 ? 'text-success' : 'text-stone-900'}`}>
                    {formatCurrency(fundsBalance)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  Available savings from fundraising
                </p>
              </div>

              {/* Money Owed */}
              <div>
                <p className="text-sm font-medium text-stone-500">Money Owed</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className={`text-3xl font-bold ${billingBalance < 0 ? 'text-error' : 'text-stone-900'}`}>
                    {billingBalance < 0 ? formatCurrency(Math.abs(billingBalance)) : '$0.00'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  {billingBalance < 0 ? 'Outstanding charges' : 'All paid up'}
                </p>
              </div>
            </div>
            {scoutAccount && (
              <Link
                href={`/accounts/${scoutAccount.id}`}
                className="mt-6 inline-block text-sm text-forest-600 hover:text-forest-800"
              >
                View full account details
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Guardians Section */}
      <ScoutGuardianAssociations
        unitId={scout.unit_id}
        scoutId={scout.id}
        scoutName={`${scout.first_name} ${scout.last_name}`}
        guardians={guardians}
        availableProfiles={availableProfiles}
        canEdit={canEditGuardians || false}
      />

      {/* Health & Safety */}
      {(scout.health_form_status || scout.swim_classification) && (
        <Card>
          <CardHeader>
            <CardTitle>Health & Safety</CardTitle>
            <CardDescription>BSA health and safety information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Health Form */}
              <div>
                <p className="text-sm font-medium text-stone-500">Health Form</p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      scout.health_form_status === 'current'
                        ? 'bg-success-light text-success'
                        : scout.health_form_status === 'expired'
                        ? 'bg-error-light text-error'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {scout.health_form_status
                      ? scout.health_form_status.charAt(0).toUpperCase() + scout.health_form_status.slice(1)
                      : 'Unknown'}
                  </span>
                  {scout.health_form_expires && (
                    <span className="text-sm text-stone-500">
                      Expires: {scout.health_form_expires}
                    </span>
                  )}
                </div>
              </div>

              {/* Swim Classification */}
              <div>
                <p className="text-sm font-medium text-stone-500">Swim Classification</p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      scout.swim_classification === 'swimmer'
                        ? 'bg-success-light text-success'
                        : scout.swim_classification === 'beginner'
                        ? 'bg-warning-light text-warning'
                        : scout.swim_classification === 'non-swimmer'
                        ? 'bg-error-light text-error'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {scout.swim_classification
                      ? scout.swim_classification.charAt(0).toUpperCase() + scout.swim_classification.slice(1).replace('-', ' ')
                      : 'Not recorded'}
                  </span>
                  {scout.swim_class_date && (
                    <span className="text-sm text-stone-500">
                      Tested: {scout.swim_class_date}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest activity on this scout&apos;s account</CardDescription>
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
                    <th className="pb-3 pr-4 text-right">Debit</th>
                    <th className="pb-3 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 text-stone-600">
                        {tx.journal_entries?.entry_date || '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-stone-900">
                          {tx.journal_entries?.description || tx.memo || '—'}
                        </p>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="rounded bg-stone-100 px-2 py-1 text-xs capitalize">
                          {tx.journal_entries?.entry_type || 'entry'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right text-error">
                        {tx.debit && tx.debit > 0 ? formatCurrency(tx.debit) : '—'}
                      </td>
                      <td className="py-3 text-right text-success">
                        {tx.credit && tx.credit > 0 ? formatCurrency(tx.credit) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-stone-500">No transactions yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
