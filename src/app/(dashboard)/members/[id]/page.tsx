import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

  // Get current user's membership
  const { data: currentMembership } = await supabase
    .from('unit_memberships')
    .select('unit_id, role')
    .eq('profile_id', user.id)
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
      section_unit_id,
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

  // Get sections (sub-units) for this unit
  const { data: sectionsData } = await supabase
    .from('units')
    .select('id, name, unit_number, unit_gender')
    .eq('parent_unit_id', currentMembership.unit_id)

  interface Section {
    id: string
    name: string
    unit_number: string
    unit_gender: 'boys' | 'girls' | null
  }

  const sections = (sectionsData || []) as Section[]

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
  // Use service client to bypass RLS for viewing other profiles' guardianships
  const { data: guardianships } = await serviceClient
    .from('scout_guardians')
    .select(`
      id,
      relationship,
      is_primary,
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
    isPrimary: g.is_primary,
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
  const isCurrentUser = profile.id === user.id

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <Link href="/members" className="hover:text-stone-900">
          Members
        </Link>
        <span className="text-stone-400">/</span>
        <span className="text-stone-900">{displayName}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">{displayName}</h1>
          <p className="mt-1 text-stone-600">
            <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-1 text-xs font-medium capitalize text-stone-700">
              {memberMembership.role}
            </span>
            {memberMembership.joined_at && (
              <span className="ml-2 text-sm">
                Member since {formatDate(memberMembership.joined_at)}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Contact Information */}
      <MemberContactForm
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
        profileId={profile.id}
        linkedScouts={linkedScouts}
        availableScouts={availableScouts}
      />

      {/* Member Status */}
      <Card>
        <CardHeader>
          <CardTitle>Membership Status</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-stone-500">Status</dt>
              <dd className="mt-1 capitalize text-stone-900">{memberMembership.status}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-stone-500">Role</dt>
              <dd className="mt-1">
                <MemberRoleEditor
                  membershipId={memberMembership.id}
                  unitId={currentMembership.unit_id}
                  currentRole={memberMembership.role}
                  currentSectionId={memberMembership.section_unit_id as string | null}
                  sections={sections}
                  isCurrentUser={isCurrentUser}
                />
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-stone-500">Primary Email</dt>
              <dd className="mt-1 text-stone-900">{profile.email}</dd>
            </div>
            {memberMembership.joined_at && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Joined</dt>
                <dd className="mt-1 text-stone-900">{formatDate(memberMembership.joined_at)}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
