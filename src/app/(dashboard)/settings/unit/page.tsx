import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { PatrolList } from '@/components/settings/patrol-list'
import { LogoUpload } from '@/components/settings/logo-upload'

export default async function UnitSettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's membership and unit info
  const { data: membership } = await supabase
    .from('unit_memberships')
    .select(
      `unit_id, role, units(
        id,
        name,
        unit_number,
        unit_type,
        logo_url
      )`
    )
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) {
    redirect('/login')
  }

  // Only admin can access unit settings
  if (membership.role !== 'admin') {
    redirect('/settings')
  }

  const unit = membership.units as {
    id: string
    name: string
    unit_number: string
    unit_type: string
    logo_url: string | null
  } | null

  if (!unit) {
    redirect('/settings')
  }

  // Get patrols for this unit
  const { data: patrols } = await supabase
    .from('patrols')
    .select('*')
    .eq('unit_id', membership.unit_id)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Unit Settings</h1>
          <p className="text-stone-600">
            Configure {unit.unit_type.charAt(0).toUpperCase() + unit.unit_type.slice(1)} {unit.unit_number} settings
          </p>
        </div>
        <Link href="/settings">
          <Button variant="outline">Back to Settings</Button>
        </Link>
      </div>

      <div className="grid gap-6">
        <PatrolList
          unitId={membership.unit_id}
          patrols={patrols || []}
        />

        <LogoUpload
          unitId={membership.unit_id}
          currentLogoUrl={unit.logo_url}
        />
      </div>
    </div>
  )
}
