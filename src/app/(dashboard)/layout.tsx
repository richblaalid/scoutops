import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'

// Force dynamic rendering - disable caching for this layout
export const dynamic = 'force-dynamic'
import { Sidebar } from '@/components/dashboard/sidebar'
import { MobileNav } from '@/components/dashboard/mobile-nav'
import { MainContent } from '@/components/dashboard/main-content'
import { PostHogIdentify } from '@/components/providers/posthog-identify'
import { UnitProvider, UnitMembership, UnitGroup } from '@/components/providers/unit-context'
import { SidebarProvider } from '@/components/providers/sidebar-context'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // Use getUser() to validate the session with Supabase servers
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Get user's profile to check if active and get their name
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, full_name, is_active, email')
    .eq('id', user.id)
    .single()

  // Check if user is inactive (soft deleted)
  if (profile && profile.is_active === false) {
    // Sign out the user and redirect to login
    await supabase.auth.signOut()
    redirect('/login?error=account_deactivated')
  }

  // Sync auth email to profile if they differ (happens after email change)
  if (profile && user.email && profile.email !== user.email) {
    await supabase
      .from('profiles')
      .update({ email: user.email, updated_at: new Date().toISOString() })
      .eq('id', user.id)
  }

  // Get display name (prefer first + last, fall back to full_name)
  const userName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile?.full_name || null

  // Get all user's unit memberships
  const { data: membershipsData } = await supabase
    .from('unit_memberships')
    .select('role, unit_id, units:units!unit_memberships_unit_id_fkey(id, name, unit_number, unit_type, logo_url)')
    .eq('profile_id', user.id)
    .eq('status', 'active')

  const memberships: UnitMembership[] = (membershipsData || []).map(m => ({
    role: m.role,
    unit_id: m.unit_id,
    units: m.units as UnitMembership['units']
  }))

  // Get group memberships (for linked troop committee access)
  const { data: groupMembershipsData } = await supabase
    .from('group_memberships')
    .select(`
      role,
      unit_groups(
        id,
        name,
        base_unit_number,
        units(id, name, unit_number, unit_type, logo_url)
      )
    `)
    .eq('profile_id', user.id)
    .eq('is_active', true)

  const groupMemberships = (groupMembershipsData || []).map(gm => ({
    role: gm.role,
    unit_groups: gm.unit_groups as UnitGroup | null
  }))

  // Determine primary unit for PostHog (first direct membership or first from group)
  const primaryMembership = memberships[0]
  const primaryUnit = primaryMembership?.units || groupMemberships[0]?.unit_groups?.units?.[0]

  return (
    <div className="min-h-screen">
      <PostHogIdentify
        userId={user.id}
        email={user.email}
        role={primaryMembership?.role || groupMemberships[0]?.role}
        unitId={primaryUnit?.id}
        unitName={primaryUnit?.name}
      />
      <Suspense fallback={null}>
        <SidebarProvider>
          <UnitProvider
            memberships={memberships}
            groupMemberships={groupMemberships}
            initialUnitId={primaryUnit?.id}
          >
            {/* Desktop Sidebar - hidden on mobile */}
            <Sidebar user={user} userName={userName} className="hidden md:flex" />

            {/* Mobile Header - hidden on desktop */}
            <MobileNav user={user} userName={userName} className="md:hidden" />

            {/* Main Content - offset on desktop for sidebar */}
            <MainContent>{children}</MainContent>
          </UnitProvider>
        </SidebarProvider>
      </Suspense>
    </div>
  )
}
