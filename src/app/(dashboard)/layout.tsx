import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardNav } from '@/components/dashboard/nav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's unit membership
  const { data: membershipData } = await supabase
    .from('unit_memberships')
    .select('*, units(*)')
    .eq('profile_id', user.id)
    .eq('is_active', true)
    .single()

  const membership = membershipData as {
    role: string
    units: { name: string; unit_number: string } | null
  } | null

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav user={user} membership={membership} />
      <main className="flex-1 bg-gray-50">
        <div className="container mx-auto px-4 py-8">{children}</div>
      </main>
    </div>
  )
}
