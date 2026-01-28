import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Detect --prod flag for environment switching
const isProd = process.argv.includes('--prod')
const envFile = isProd ? '.env.prod' : '.env.local'
dotenv.config({ path: envFile })

// Display which environment we're using
const envLabel = isProd ? '🔴 PRODUCTION' : '🟢 Development'
console.log(`Environment: ${envLabel}`)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function debugQueries() {
  // Get a unit ID first
  const { data: units } = await supabase.from('units').select('id, name').limit(1)
  if (!units || units.length === 0) {
    console.log('No units found')
    return
  }
  const unitId = units[0].id
  console.log('Testing with unit:', units[0].name, '(', unitId, ')')

  // Test 1: Get scouts
  console.log('\n=== Test 1: Get scouts ===')
  const { data: scouts, error: scoutsError } = await supabase
    .from('scouts')
    .select('id, first_name, last_name, rank, patrols (name)')
    .eq('unit_id', unitId)
    .eq('is_active', true)
  
  if (scoutsError) {
    console.log('ERROR:', scoutsError)
  } else {
    console.log('Found', scouts?.length, 'scouts')
    scouts?.slice(0, 3).forEach(s => console.log(' -', s.first_name, s.last_name))
  }

  const scoutIds = scouts?.map(s => s.id) || []

  // Test 2: Rank progress query (from getUnitAdvancementSummary)
  console.log('\n=== Test 2: Rank progress (in_progress only) ===')
  const { data: rankProgress, error: rpError } = await supabase
    .from('scout_rank_progress')
    .select(`
      id,
      scout_id,
      status,
      scout_rank_requirement_progress (status)
    `)
    .in('scout_id', scoutIds)
    .eq('status', 'in_progress')

  if (rpError) {
    console.log('ERROR:', rpError)
  } else {
    console.log('Found', rankProgress?.length, 'in-progress ranks')
  }

  // Test 3: Categories query
  console.log('\n=== Test 3: Merit badge categories ===')
  const { data: categories, error: catError } = await supabase
    .from('bsa_merit_badges')
    .select('category')
    .eq('is_active', true)
    .not('category', 'is', null)

  if (catError) {
    console.log('ERROR:', catError)
  } else {
    const uniqueCats = [...new Set(categories?.map(c => c.category))]
    console.log('Found', uniqueCats.length, 'categories:', uniqueCats.slice(0, 5).join(', '), '...')
  }

  // Test 4: Filtered rank requirements
  console.log('\n=== Test 4: Rank requirements (filtered by version) ===')
  const { data: ranks } = await supabase
    .from('bsa_ranks')
    .select('id, name, requirement_version_year')
  
  const versionYears = [...new Set(ranks?.map(r => r.requirement_version_year).filter(Boolean))]
  console.log('Rank version years:', versionYears)

  const { data: reqs, error: reqError } = await supabase
    .from('bsa_rank_requirements')
    .select('id')
    .in('version_year', versionYears as number[])

  if (reqError) {
    console.log('ERROR:', reqError)
  } else {
    console.log('Filtered requirements:', reqs?.length, '(vs 1000+ unfiltered)')
  }

  // Test 5: All rank requirements (old way)
  const { data: allReqs } = await supabase
    .from('bsa_rank_requirements')
    .select('id')
  console.log('All requirements (old way):', allReqs?.length)
}

debugQueries()
