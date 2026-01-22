import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  // Only allow in development environment
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      return NextResponse.json({ error: 'Auth error', details: authError.message })
    }

    if (!user) {
      return NextResponse.json({ error: 'Not logged in' })
    }

    // Get profile (profile_id is separate from auth user id)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const profileId = profile?.id

    // Try to get membership (simple)
    const { data: membershipSimple, error: membershipSimpleError } = profileId ? await supabase
      .from('unit_memberships')
      .select('*')
      .eq('profile_id', profileId) : { data: null, error: { message: 'No profile found' } }

    // Try to get membership WITH units join (this is what layout uses)
    const { data: membershipWithUnits, error: membershipWithUnitsError } = profileId ? await supabase
      .from('unit_memberships')
      .select('role, unit_id, units:units!unit_memberships_unit_id_fkey(id, name, unit_number, unit_type)')
      .eq('profile_id', profileId)
      .eq('status', 'active') : { data: null, error: { message: 'No profile found' } }

    // Try to get units directly
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('*')

    return NextResponse.json({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      user: { id: user.id, email: user.email },
      profile: profile || profileError?.message,
      membershipSimple: membershipSimple || membershipSimpleError?.message,
      membershipWithUnits: membershipWithUnits || membershipWithUnitsError?.message,
      membershipWithUnitsError: membershipWithUnitsError?.message || null,
      units: units || unitsError?.message,
      unitsError: unitsError?.message || null,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Unexpected error', details: String(error) })
  }
}
