import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardNav } from '@/components/dashboard/nav'
import { PostHogIdentify } from '@/components/providers/posthog-identify'

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

  // Get user's unit membership
  const { data: membershipData } = await supabase
    .from('unit_memberships')
    .select('*, units(*)')
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .single()

  const membership = membershipData as {
    role: string
    unit_id: string
    units: { name: string; unit_number: string } | null
  } | null

  return (
    <div className="flex min-h-screen flex-col">
      <PostHogIdentify
        userId={user.id}
        email={user.email}
        role={membership?.role}
        unitId={membership?.unit_id}
        unitName={membership?.units?.name}
      />
      <DashboardNav user={user} userName={userName} membership={membership} />
      <main className="flex-1 bg-stone-50">
        <div className="container mx-auto px-4 py-8">{children}</div>
      </main>
    </div>
  )
}
