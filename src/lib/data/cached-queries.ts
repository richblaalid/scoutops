/**
 * React.cache() wrappers for server-side data fetching.
 *
 * These wrappers provide per-request memoization, ensuring that
 * the same query is only executed once per request even if called
 * from multiple components or server actions.
 *
 * IMPORTANT: These are for Server Components and Server Actions only.
 * For Client Components, use React Query or SWR instead.
 */
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * Get the current authenticated user.
 * Cached per-request to avoid multiple auth checks.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) return null
  return user
})

/**
 * Get the current user's profile.
 * Returns the profile linked to the authenticated user.
 */
export const getCurrentProfile = cache(async () => {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .eq('user_id', user.id)
    .single()

  return profile
})

/**
 * Get the current user's active unit membership.
 * Returns unit_id, role, and profile_id.
 */
export const getCurrentMembership = cache(async () => {
  const profile = await getCurrentProfile()
  if (!profile) return null

  const supabase = await createClient()
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
})

/**
 * Get the current user's unit with basic info.
 * Builds on getCurrentMembership for efficiency.
 */
export const getCurrentUnit = cache(async () => {
  const membership = await getCurrentMembership()
  if (!membership) return null

  const supabase = await createClient()
  const { data: unit } = await supabase
    .from('units')
    .select('id, name, unit_number, unit_type')
    .eq('id', membership.unit_id)
    .single()

  return unit
})

/**
 * Get the active BSA requirement version.
 * Used across advancement pages.
 */
export const getActiveRequirementVersion = cache(async () => {
  const supabase = await createClient()
  const { data: version } = await supabase
    .from('bsa_requirement_versions')
    .select('id, name, effective_date')
    .eq('is_active', true)
    .order('effective_date', { ascending: false })
    .limit(1)
    .single()

  return version
})

/**
 * Get scouts for the current user's unit.
 * Optionally filter by active status.
 */
export const getUnitScouts = cache(async (activeOnly: boolean = true) => {
  const membership = await getCurrentMembership()
  if (!membership) return []

  const supabase = await createClient()
  let query = supabase
    .from('scouts')
    .select('id, first_name, last_name, rank, is_active')
    .eq('unit_id', membership.unit_id)
    .order('last_name')

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data: scouts } = await query
  return scouts || []
})
