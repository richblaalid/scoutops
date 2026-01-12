import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/settings/profile-form'
import { ContactForm } from '@/components/settings/contact-form'
import { DangerZone } from '@/components/settings/danger-zone'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { isFinancialRole } from '@/lib/roles'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get profile and membership in parallel
  const [profileResult, membershipResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('unit_memberships').select('role').eq('profile_id', user.id).eq('status', 'active').single(),
  ])

  const { data: profile, error } = profileResult
  const userRole = membershipResult.data?.role || 'parent'

  if (error || !profile) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <p className="text-stone-600">Manage your personal information and account preferences</p>
      </div>

      <div className="grid gap-6">
        <ProfileForm
          profile={{
            first_name: profile.first_name,
            last_name: profile.last_name,
            address_street: profile.address_street,
            address_city: profile.address_city,
            address_state: profile.address_state,
            address_zip: profile.address_zip,
            email_secondary: profile.email_secondary,
            phone_primary: profile.phone_primary,
            phone_secondary: profile.phone_secondary,
          }}
        />

        <ContactForm
          profile={{
            email: user.email || profile.email,
            email_secondary: profile.email_secondary,
            phone_primary: profile.phone_primary,
            phone_secondary: profile.phone_secondary,
          }}
        />

        {isFinancialRole(userRole) && (
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>
                Connect third-party services like Square for payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/settings/integrations">
                <Button variant="outline">Manage Integrations</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <DangerZone />
      </div>
    </div>
  )
}
