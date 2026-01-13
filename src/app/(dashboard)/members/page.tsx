import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AccessDenied } from '@/components/ui/access-denied'
import { canAccessPage, isAdmin } from '@/lib/roles'
import { MembersList } from '@/components/members/members-list'
import { InviteMemberButton } from '@/components/members/invite-member-button'

interface Member {
  id: string
  role: string
  status: string
  email: string | null
  joined_at: string | null
  invited_at: string | null
  expires_at: string | null
  scout_ids: string[] | null
  profiles: {
    id: string
    email: string
    full_name: string | null
  } | null
  invited_by_profile: {
    full_name: string | null
  } | null
}

interface Scout {
  id: string
  first_name: string
  last_name: string
}

export default async function MembersPage() {
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
    .eq('status', 'active')
    .single()

  const membership = membershipData as { unit_id: string; role: string } | null

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

  // Check role-based access
  if (!canAccessPage(membership.role, 'members')) {
    return <AccessDenied message="Only administrators can manage members." />
  }

  const userIsAdmin = isAdmin(membership.role)

  // Get all members for this unit (both active and invited)
  const { data: membersData } = await supabase
    .from('unit_memberships')
    .select(`
      id,
      role,
      status,
      email,
      joined_at,
      invited_at,
      expires_at,
      scout_ids,
      profiles!unit_memberships_profile_id_fkey (
        id,
        email,
        full_name
      ),
      invited_by_profile:profiles!unit_memberships_invited_by_fkey (
        full_name
      )
    `)
    .eq('unit_id', membership.unit_id)
    .in('status', ['active', 'invited'])
    .order('status', { ascending: true }) // 'active' comes before 'invited'
    .order('joined_at', { ascending: true, nullsFirst: false })

  const allMembers = (membersData as unknown as Member[]) || []

  // Separate active members and pending invites
  const activeMembers = allMembers.filter(m => m.status === 'active')
  const pendingInvites = allMembers.filter(m => m.status === 'invited')

  // Get all active scouts for this unit (for invite form)
  const { data: scoutsData } = await supabase
    .from('scouts')
    .select('id, first_name, last_name')
    .eq('unit_id', membership.unit_id)
    .eq('is_active', true)
    .order('last_name', { ascending: true })

  const scouts = (scoutsData as Scout[]) || []

  // Get unit info
  const { data: unitData } = await supabase
    .from('units')
    .select('name, unit_number')
    .eq('id', membership.unit_id)
    .single()

  const unit = unitData as { name: string; unit_number: string } | null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Members</h1>
          <p className="mt-1 text-stone-600">
            Manage members of {unit?.name || 'your unit'}
          </p>
        </div>
        {userIsAdmin && <InviteMemberButton unitId={membership.unit_id} scouts={scouts} />}
      </div>

      {/* Pending Invites (Admin only) */}
      {userIsAdmin && pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invites</CardTitle>
            <CardDescription>
              {pendingInvites.length} pending invitation{pendingInvites.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvites.map((invite) => {
                // Get scout names for parent invites
                const linkedScouts = invite.scout_ids
                  ? scouts.filter(s => invite.scout_ids?.includes(s.id))
                  : []

                return (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium text-stone-900">{invite.email}</p>
                      <p className="text-sm text-stone-500">
                        Role: <span className="capitalize">{invite.role}</span>
                        {invite.expires_at && (
                          <>
                            {' • '}
                            Expires: {new Date(invite.expires_at).toLocaleDateString()}
                          </>
                        )}
                      </p>
                      {linkedScouts.length > 0 && (
                        <p className="text-sm text-stone-500">
                          Scouts: {linkedScouts.map(s => `${s.first_name} ${s.last_name}`).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <form action={async () => {
                        'use server'
                        const { resendInvite } = await import('@/app/actions/members')
                        await resendInvite(invite.id)
                      }}>
                        <button
                          type="submit"
                          className="text-sm text-forest-600 hover:text-forest-800"
                        >
                          Resend
                        </button>
                      </form>
                      <form action={async () => {
                        'use server'
                        const { removeMember } = await import('@/app/actions/members')
                        await removeMember(membership.unit_id, invite.id)
                      }}>
                        <button
                          type="submit"
                          className="text-sm text-error hover:text-error/80"
                        >
                          Cancel
                        </button>
                      </form>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Members */}
      <Card>
        <CardHeader>
          <CardTitle>Unit Members</CardTitle>
          <CardDescription>
            {activeMembers.length} active member{activeMembers.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MembersList
            members={activeMembers}
            isAdmin={userIsAdmin}
            currentUserId={user.id}
            unitId={membership.unit_id}
          />
        </CardContent>
      </Card>

      {/* Role Descriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-stone-600">
          <ul className="list-disc pl-4 space-y-2">
            <li><strong>Admin</strong> – Full access: manage members, billing, payments, scouts, and settings</li>
            <li><strong>Treasurer</strong> – Financial access: manage billing, payments, and scout accounts</li>
            <li><strong>Leader</strong> – Unit access: manage scouts, events, and view accounts</li>
            <li><strong>Parent</strong> – Family access: view and manage their own scouts&apos; accounts</li>
            <li><strong>Scout</strong> – View only: view events and their own account</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
