#!/usr/bin/env npx tsx

/**
 * Fix requirement versions - migrate requirements from inactive 2026 version to active 2025 version
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const OLD_VERSION = '4c14c2f2-5e37-4126-8bc0-e8daf9e20a37' // 2026 inactive
const NEW_VERSION = 'c354e8d1-9279-469c-b3f2-48ce0bb4c468' // 2025 active

async function getAllBadgeIdsInVersion(versionId: string): Promise<Set<string>> {
  const ids = new Set<string>()
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data } = await supabase
      .from('bsa_merit_badge_requirements')
      .select('merit_badge_id')
      .eq('version_id', versionId)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (!data || data.length === 0) break

    data.forEach((r) => ids.add(r.merit_badge_id))
    page++

    if (data.length < pageSize) break
  }

  return ids
}

async function migrate() {
  console.log('=== FIXING REQUIREMENT VERSIONS ===')
  console.log('')

  // Get all badges in each version with pagination
  const oldBadgeIds = await getAllBadgeIdsInVersion(OLD_VERSION)
  const newBadgeIds = await getAllBadgeIdsInVersion(NEW_VERSION)

  console.log('Badges in OLD (2026) version:', oldBadgeIds.size)
  console.log('Badges in NEW (2025) version:', newBadgeIds.size)

  // Find badges only in old version
  const toMigrate: string[] = []
  oldBadgeIds.forEach((id) => {
    if (!newBadgeIds.has(id)) {
      toMigrate.push(id)
    }
  })

  console.log('Badges to migrate:', toMigrate.length)
  console.log('')

  if (toMigrate.length === 0) {
    console.log('Nothing to migrate!')
    return
  }

  // Get badge names
  const { data: badges } = await supabase
    .from('bsa_merit_badges')
    .select('id, name')
    .in('id', toMigrate)

  console.log('Badges to migrate:')
  badges?.forEach((b) => console.log('  -', b.name))
  console.log('')

  // Migrate each badge
  let migrated = 0
  let errors = 0

  for (const badgeId of toMigrate) {
    const { data: reqs } = await supabase
      .from('bsa_merit_badge_requirements')
      .select('*')
      .eq('version_id', OLD_VERSION)
      .eq('merit_badge_id', badgeId)
      .order('display_order')

    if (!reqs || reqs.length === 0) continue

    const newRequirements = reqs.map((r) => ({
      version_id: NEW_VERSION,
      merit_badge_id: r.merit_badge_id,
      requirement_number: r.requirement_number,
      parent_requirement_id: null,
      sub_requirement_letter: r.sub_requirement_letter,
      description: r.description,
      display_order: r.display_order,
    }))

    const { error } = await supabase
      .from('bsa_merit_badge_requirements')
      .insert(newRequirements)

    const badge = badges?.find((b) => b.id === badgeId)
    if (error) {
      console.log('❌', badge?.name, '-', error.message)
      errors++
    } else {
      console.log('✅', badge?.name, '-', reqs.length, 'requirements')
      migrated++
    }
  }

  console.log('')
  console.log('=== COMPLETE ===')
  console.log('✅ Migrated:', migrated)
  console.log('❌ Errors:', errors)

  // Verify Animal Science
  console.log('')
  console.log('=== VERIFYING ANIMAL SCIENCE ===')
  const { count } = await supabase
    .from('bsa_merit_badge_requirements')
    .select('*', { count: 'exact', head: true })
    .eq('version_id', NEW_VERSION)
    .eq('merit_badge_id', '7c448aa8-4580-44e4-8e56-332ad122b146')

  console.log('Animal Science requirements in NEW version:', count)
}

migrate().catch(console.error)
