import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

/**
 * Get the current user's profile from the database.
 * Since profiles.id is now separate from auth.users.id,
 * this helper looks up the profile by user_id.
 */
export async function getCurrentProfile(
  supabase: SupabaseClient<Database>
): Promise<{ id: string } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  return profile
}

/**
 * Get the current user's profile and unit membership.
 * Returns null if the user is not authenticated or has no active membership.
 */
export async function getCurrentMembership(
  supabase: SupabaseClient<Database>
): Promise<{ profile_id: string; unit_id: string; role: string } | null> {
  const profile = await getCurrentProfile(supabase)
  if (!profile) return null

  const { data: membership } = await supabase
    .from('unit_memberships')
    .select('unit_id, role')
    .eq('profile_id', profile.id)
    .eq('status', 'active')
    .single()

  if (!membership) return null

  return {
    profile_id: profile.id,
    unit_id: membership.unit_id,
    role: membership.role,
  }
}
