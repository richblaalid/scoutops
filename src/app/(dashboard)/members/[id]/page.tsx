import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AccessDenied } from '@/components/ui/access-denied'
import { isAdmin } from '@/lib/roles'
import { formatDate } from '@/lib/utils'
import { MemberContactForm } from '@/components/members/member-contact-form'
import { MemberScoutAssociations } from '@/components/members/member-scout-associations'
import { MemberRoleEditor } from '@/components/members/member-role-editor'

interface MemberDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function MemberDetailPage({ params }: MemberDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's profile (profile_id is now separate from auth user id)
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!currentProfile) {
    redirect('/login')
  }

  // Get current user's membership
  const { data: currentMembership } = await supabase
    .from('unit_memberships')
    .select('unit_id, role')
    .eq('profile_id', currentProfile.id)
    .eq('status', 'active')
    .single()

  if (!currentMembership) {
    redirect('/login')
  }

  // Only admins can view member details
  if (!isAdmin(currentMembership.role)) {
    return <AccessDenied message="Only administrators can view member details." />
  }

  // Use service client to bypass RLS for admin access to other profiles
  const serviceClient = await createServiceClient()

  // Get the member's membership record
  const { data: memberMembership } = await serviceClient
    .from('unit_memberships')
    .select(`
      id,
      role,
      status,
      joined_at,
      profile_id,
      profiles!unit_memberships_profile_id_fkey (
        id,
        email,
        full_name,
        first_name,
        last_name,
        gender,
        phone_primary,
        phone_secondary,
        email_secondary,
        address_street,
        address_city,
        address_state,
        address_zip
      )
    `)
    .eq('id', id)
    .eq('unit_id', currentMembership.unit_id)
    .single()

  if (!memberMembership || !memberMembership.profiles) {
    notFound()
  }

  const profile = memberMembership.profiles as {
    id: string
    email: string
    full_name: string | null
    first_name: string | null
    last_name: string | null
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null
    phone_primary: string | null
    phone_secondary: string | null
    email_secondary: string | null
    address_street: string | null
    address_city: string | null
    address_state: string | null
    address_zip: string | null
  }

  // Get scouts associated with this member (via scout_guardians)
  const { data: guardianships } = await serviceClient
    .from('scout_guardians')
    .select(`
      id,
      relationship,
      scouts (
        id,
        first_name,
        last_name,
        is_active
      )
    `)
    .eq('profile_id', profile.id)

  const linkedScouts = (guardianships || []).map(g => ({
    guardianshipId: g.id,
    relationship: g.relationship,
    scout: g.scouts as { id: string; first_name: string; last_name: string; is_active: boolean | null }
  }))

  // Get all active scouts in the unit (for adding new associations)
  const { data: allScouts } = await supabase
    .from('scouts')
    .select('id, first_name, last_name')
    .eq('unit_id', currentMembership.unit_id)
    .eq('is_active', true)
    .order('last_name')

  const availableScouts = (allScouts || []).filter(
    scout => !linkedScouts.some(ls => ls.scout.id === scout.id)
  )

  const displayName = profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
  const isCurrentUser = profile.id === currentProfile.id

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <Link href="/members" className="hover:text-stone-900">
          Members
        </Link>
        <span className="text-stone-400">/</span>
        <span className="text-stone-900">{displayName}</span>
      </div>

      {/* Header with Role Editor */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{displayName}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-stone-600">
            <span className="capitalize">{memberMembership.status}</span>
            {memberMembership.joined_at && (
              <>
                <span className="text-stone-300">|</span>
                <span>Joined {formatDate(memberMembership.joined_at)}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-stone-500">Role:</span>
          <MemberRoleEditor
            membershipId={memberMembership.id}
            unitId={currentMembership.unit_id}
            currentRole={memberMembership.role}
            isCurrentUser={isCurrentUser}
          />
        </div>
      </div>

      {/* Contact Information */}
      <MemberContactForm
        unitId={currentMembership.unit_id}
        membershipId={memberMembership.id}
        profile={{
          id: profile.id,
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          gender: profile.gender,
          phone_primary: profile.phone_primary,
          phone_secondary: profile.phone_secondary,
          email_secondary: profile.email_secondary,
          address_street: profile.address_street,
          address_city: profile.address_city,
          address_state: profile.address_state,
          address_zip: profile.address_zip,
        }}
      />

      {/* Scout Associations */}
      <MemberScoutAssociations
        unitId={currentMembership.unit_id}
        profileId={profile.id}
        linkedScouts={linkedScouts}
        availableScouts={availableScouts}
      />
    </div>
  )
}
