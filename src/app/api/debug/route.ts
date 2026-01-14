import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
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

    // Try to get membership (simple)
    const { data: membershipSimple, error: membershipSimpleError } = await supabase
      .from('unit_memberships')
      .select('*')
      .eq('profile_id', user.id)

    // Try to get membership WITH units join (this is what layout uses)
    const { data: membershipWithUnits, error: membershipWithUnitsError } = await supabase
      .from('unit_memberships')
      .select('role, unit_id, units:units!unit_memberships_unit_id_fkey(id, name, unit_number, unit_type)')
      .eq('profile_id', user.id)
      .eq('status', 'active')

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)

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
