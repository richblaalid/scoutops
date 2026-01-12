import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { hasFilteredView, isFinancialRole } from '@/lib/roles'
import { AccountsList } from '@/components/accounts/accounts-list'

interface ScoutAccount {
  id: string
  balance: number | null
  scout_id: string
  scouts: {
    id: string
    first_name: string
    last_name: string
    patrol: string | null
    is_active: boolean | null
    unit_id: string
  } | null
}

interface PageProps {
  searchParams: Promise<{ section?: string }>
}

export default async function AccountsPage({ searchParams }: PageProps) {
  const { section: sectionFilter } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get user's unit membership (include section_unit_id for leaders)
  const { data: membershipData } = await supabase
    .from('unit_memberships')
    .select('unit_id, role, section_unit_id')
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .single()

  const membership = membershipData as { unit_id: string; role: string; section_unit_id: string | null } | null

  if (!membership) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-2xl font-bold text-stone-900">No Unit Access</h1>
        <p className="mt-2 text-stone-600">
          You are not currently a member of any unit.
        </p>
      </div>
    )
  }

  const role = membership.role
  const isParent = role === 'parent'
  const isScout = role === 'scout'

  // Get sections (sub-units) for section filtering
  const { data: sectionsData } = await supabase
    .from('units')
    .select('id, name, unit_number, unit_gender')
    .eq('parent_unit_id', membership.unit_id)

  interface SectionInfo {
    id: string
    name: string
    unit_number: string
    unit_gender: 'boys' | 'girls' | null
  }

  const sections = (sectionsData || []) as SectionInfo[]
  const hasSections = sections.length > 0

  // Leaders with assigned sections can only view their section
  const isLeaderWithSection = membership.role === 'leader' && membership.section_unit_id && hasSections

  // Determine which unit IDs to filter by based on sections
  let sectionUnitIds: string[] | null = null
  if (hasSections) {
    if (isLeaderWithSection) {
      // Leaders can only see their assigned section
      sectionUnitIds = [membership.section_unit_id!]
    } else if (sectionFilter === 'boys') {
      const boysSection = sections.find(s => s.unit_gender === 'boys')
      sectionUnitIds = boysSection ? [boysSection.id] : []
    } else if (sectionFilter === 'girls') {
      const girlsSection = sections.find(s => s.unit_gender === 'girls')
      sectionUnitIds = girlsSection ? [girlsSection.id] : []
    } else {
      // 'all' or no filter - include all sections plus parent
      sectionUnitIds = [...sections.map(s => s.id), membership.unit_id]
    }
  }

  // For parents/scouts, get their linked scout IDs
  let linkedScoutIds: string[] = []

  if (isParent) {
    const { data: guardianData } = await supabase
      .from('scout_guardians')
      .select('scout_id')
      .eq('profile_id', user.id)
    linkedScoutIds = (guardianData || []).map((g) => g.scout_id)
  }

  if (isScout) {
    const { data: scoutData } = await supabase
      .from('scouts')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    if (scoutData) {
      linkedScoutIds = [scoutData.id]
    }
  }

  // Get scout accounts (filtered for parents/scouts and by section)
  // Determine which unit IDs to query - sections or parent unit
  const unitIdsToQuery = sectionUnitIds || [membership.unit_id]

  let accountsQuery = supabase
    .from('scout_accounts')
    .select(`
      id,
      balance,
      scout_id,
      scouts (
        id,
        first_name,
        last_name,
        patrol,
        is_active,
        unit_id
      )
    `)
    .in('unit_id', unitIdsToQuery)
    .order('balance', { ascending: true })

  if (hasFilteredView(role) && linkedScoutIds.length > 0) {
    accountsQuery = accountsQuery.in('scout_id', linkedScoutIds)
  } else if (hasFilteredView(role)) {
    // No linked scouts, will show empty
    accountsQuery = accountsQuery.eq('id', 'none')
  }

  const { data: accountsData } = await accountsQuery
  const accounts = (accountsData as ScoutAccount[]) || []

  // Calculate totals
  const totalOwed = accounts
    .filter((a) => (a.balance || 0) < 0)
    .reduce((sum, a) => sum + Math.abs(a.balance || 0), 0)

  const totalCredit = accounts
    .filter((a) => (a.balance || 0) > 0)
    .reduce((sum, a) => sum + (a.balance || 0), 0)

  const netBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0)

  // Section label for display
  const getSectionLabel = () => {
    if (!hasSections || !sectionFilter) return null
    if (sectionFilter === 'boys') {
      const section = sections.find(s => s.unit_gender === 'boys')
      return section ? `Troop ${section.unit_number}` : 'Boys section'
    }
    if (sectionFilter === 'girls') {
      const section = sections.find(s => s.unit_gender === 'girls')
      return section ? `Troop ${section.unit_number}` : 'Girls section'
    }
    return 'all sections'
  }
  const sectionLabel = getSectionLabel()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">
          {isScout ? 'My Account' : isParent ? 'Family Accounts' : 'Scout Accounts'}
        </h1>
        <p className="mt-1 text-stone-600">
          {isScout
            ? 'View your account balance and transactions'
            : isParent
              ? 'View your scouts\' account balances'
              : 'View and manage scout financial accounts'}
        </p>
      </div>

      {/* Summary Cards (only for management/financial roles) */}
      {isFinancialRole(role) && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Owed to Unit</CardDescription>
              <CardTitle className="text-2xl text-error">
                {formatCurrency(totalOwed)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                From {accounts.filter((a) => (a.balance || 0) < 0).length} scouts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Credit Balance</CardDescription>
              <CardTitle className="text-2xl text-success">
                {formatCurrency(totalCredit)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                From {accounts.filter((a) => (a.balance || 0) > 0).length} scouts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Net Balance</CardDescription>
              <CardTitle
                className={`text-2xl ${netBalance < 0 ? 'text-error' : 'text-success'}`}
              >
                {formatCurrency(netBalance)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {netBalance < 0 ? 'Net owed to unit' : 'Net credit available'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Accounts List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isScout ? 'Account Details' : isParent ? 'Your Scouts' : 'All Scout Accounts'}
          </CardTitle>
          <CardDescription>
            {accounts.length} account{accounts.length !== 1 ? 's' : ''}
            {sectionLabel ? ` in ${sectionLabel}` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AccountsList accounts={accounts} showPatrolFilter={!hasFilteredView(role)} />
        </CardContent>
      </Card>
    </div>
  )
}
