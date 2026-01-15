import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  type ParsedAdult,
  type ParsedScout,
  deriveRole,
  getScoutPosition,
} from '@/lib/import/bsa-roster-parser'

interface ImportRequest {
  adults: ParsedAdult[]
  scouts: ParsedScout[]
}

interface ImportResult {
  success: boolean
  adultsImported: number
  adultsUpdated: number
  scoutsImported: number
  scoutsUpdated: number
  guardiansLinked: number
  trainingsImported: number
  errors: string[]
}

export async function POST(request: NextRequest): Promise<NextResponse<ImportResult>> {
  const supabase = await createClient()

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { success: false, adultsImported: 0, adultsUpdated: 0, scoutsImported: 0, scoutsUpdated: 0, guardiansLinked: 0, trainingsImported: 0, errors: ['Unauthorized'] },
      { status: 401 }
    )
  }

  // Get user's unit and verify admin role
  const { data: membership, error: membershipError } = await supabase
    .from('unit_memberships')
    .select('unit_id, role')
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .single()

  if (membershipError || !membership) {
    return NextResponse.json(
      { success: false, adultsImported: 0, adultsUpdated: 0, scoutsImported: 0, scoutsUpdated: 0, guardiansLinked: 0, trainingsImported: 0, errors: ['No active unit membership'] },
      { status: 403 }
    )
  }

  if (membership.role !== 'admin' && membership.role !== 'treasurer') {
    return NextResponse.json(
      { success: false, adultsImported: 0, adultsUpdated: 0, scoutsImported: 0, scoutsUpdated: 0, guardiansLinked: 0, trainingsImported: 0, errors: ['Only admins and treasurers can import rosters'] },
      { status: 403 }
    )
  }

  const unitId = membership.unit_id

  // Parse request body
  let data: ImportRequest
  try {
    data = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, adultsImported: 0, adultsUpdated: 0, scoutsImported: 0, scoutsUpdated: 0, guardiansLinked: 0, trainingsImported: 0, errors: ['Invalid request body'] },
      { status: 400 }
    )
  }

  const { adults, scouts } = data
  const errors: string[] = []
  let adultsImported = 0
  let adultsUpdated = 0
  let scoutsImported = 0
  let scoutsUpdated = 0
  let guardiansLinked = 0
  let trainingsImported = 0

  // Use admin client for operations that might bypass RLS
  const adminSupabase = createAdminClient()

  // Map to track BSA ID -> profile ID for guardian linking
  const bsaIdToProfileId = new Map<string, string>()

  // ============================================
  // Import Adults
  // ============================================
  for (const adult of adults) {
    try {
      // Check for existing profile by email
      let profileId: string | null = null

      if (adult.email) {
        const { data: existingProfile } = await adminSupabase
          .from('profiles')
          .select('id')
          .eq('email', adult.email.toLowerCase())
          .maybeSingle()

        if (existingProfile) {
          profileId = existingProfile.id

          // Update existing profile with core fields only (new columns may not be in PostgREST cache yet)
          await adminSupabase
            .from('profiles')
            .update({
              first_name: adult.firstName,
              last_name: adult.lastName,
              full_name: `${adult.firstName} ${adult.lastName}`,
              phone_primary: adult.phone,
              address_street: adult.address,
              address_city: adult.city,
              address_state: adult.state,
              address_zip: adult.zip,
              updated_at: new Date().toISOString(),
            })
            .eq('id', profileId)

          adultsUpdated++
        }
      }

      // Track BSA ID for guardian linking
      if (adult.bsaMemberId && profileId) {
        bsaIdToProfileId.set(adult.bsaMemberId, profileId)
      }

      // Check/update unit membership if profile exists
      if (profileId) {
        const { data: existingMembership } = await adminSupabase
          .from('unit_memberships')
          .select('id')
          .eq('unit_id', unitId)
          .eq('profile_id', profileId)
          .maybeSingle()

        const role = deriveRole(adult.positions)

        if (existingMembership) {
          // Update existing membership (skip current_position - new column may not be in cache)
          await adminSupabase
            .from('unit_memberships')
            .update({ role })
            .eq('id', existingMembership.id)
        } else {
          // Create new membership (skip current_position - new column may not be in cache)
          await adminSupabase
            .from('unit_memberships')
            .insert({
              unit_id: unitId,
              profile_id: profileId,
              role,
              status: 'active',
              joined_at: new Date().toISOString(),
            })

          adultsImported++
        }

        // Skip trainings import for now - adult_trainings table may not be in schema cache yet
        // TODO: Re-enable once schema cache is refreshed
      }
    } catch (err) {
      errors.push(`Error importing adult ${adult.firstName} ${adult.lastName}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // ============================================
  // Import Scouts
  // ============================================
  for (const scout of scouts) {
    try {
      // Check for existing scout by BSA ID
      let scoutId: string | null = null

      if (scout.bsaMemberId) {
        const { data: existingScout } = await adminSupabase
          .from('scouts')
          .select('id')
          .eq('unit_id', unitId)
          .eq('bsa_member_id', scout.bsaMemberId)
          .maybeSingle()

        if (existingScout) {
          scoutId = existingScout.id

          // Update existing scout
          const scoutPosition = getScoutPosition(scout.positions)
          await adminSupabase
            .from('scouts')
            .update({
              first_name: scout.firstName,
              last_name: scout.lastName,
              rank: scout.rank,
              date_of_birth: scout.dateOfBirth,
              patrol: scout.patrol,
              current_position: scoutPosition,
              updated_at: new Date().toISOString(),
            })
            .eq('id', scoutId)

          scoutsUpdated++
        }
      }

      // Create new scout if not found
      if (!scoutId) {
        // Insert scout
        const scoutPosition = getScoutPosition(scout.positions)
        const { data: newScout, error: scoutError } = await adminSupabase
          .from('scouts')
          .insert({
            unit_id: unitId,
            first_name: scout.firstName,
            last_name: scout.lastName,
            bsa_member_id: scout.bsaMemberId,
            rank: scout.rank,
            patrol: scout.patrol,
            date_of_birth: scout.dateOfBirth,
            current_position: scoutPosition,
            is_active: true,
          })
          .select('id')
          .single()

        if (scoutError) {
          errors.push(`Error creating scout ${scout.firstName} ${scout.lastName}: ${scoutError.message}`)
          continue
        }

        scoutId = newScout.id
        scoutsImported++

        // Create scout account
        await adminSupabase
          .from('scout_accounts')
          .insert({
            scout_id: scoutId,
            unit_id: unitId,
            billing_balance: 0,
            funds_balance: 0,
          })
      }

      // Link guardians
      for (const guardian of scout.guardians) {
        let guardianProfileId: string | null = null

        // Try to find guardian by BSA ID first
        if (guardian.bsaMemberId && bsaIdToProfileId.has(guardian.bsaMemberId)) {
          guardianProfileId = bsaIdToProfileId.get(guardian.bsaMemberId)!
        }
        // Then try by email
        else if (guardian.email) {
          const { data: profile } = await adminSupabase
            .from('profiles')
            .select('id')
            .eq('email', guardian.email.toLowerCase())
            .maybeSingle()

          if (profile) {
            guardianProfileId = profile.id
          }
        }

        if (guardianProfileId && scoutId) {
          // Check if guardian link already exists
          const { data: existingLink } = await adminSupabase
            .from('scout_guardians')
            .select('id')
            .eq('scout_id', scoutId)
            .eq('profile_id', guardianProfileId)
            .maybeSingle()

          if (!existingLink) {
            const { error: guardianError } = await adminSupabase
              .from('scout_guardians')
              .insert({
                scout_id: scoutId,
                profile_id: guardianProfileId,
                relationship: guardian.relationship || 'parent',
                is_primary: scout.guardians.indexOf(guardian) === 0,
              })

            if (!guardianError) {
              guardiansLinked++
            }
          }
        }
      }
    } catch (err) {
      errors.push(`Error importing scout ${scout.firstName} ${scout.lastName}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return NextResponse.json({
    success: errors.length === 0,
    adultsImported,
    adultsUpdated,
    scoutsImported,
    scoutsUpdated,
    guardiansLinked,
    trainingsImported,
    errors,
  })
}
