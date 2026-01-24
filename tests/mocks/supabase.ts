import { vi } from 'vitest'

/**
 * Mock result type for Supabase queries
 */
export interface MockQueryResult<T> {
  data: T | null
  error: { message: string; code?: string } | null
}

/**
 * Creates a chainable mock query builder for Supabase
 */
export function createMockQueryBuilder<T>(result: MockQueryResult<T>) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    and: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: vi.fn((resolve) => resolve(result)),
  }

  // Make all methods return the builder for chaining
  Object.keys(builder).forEach((key) => {
    if (key !== 'single' && key !== 'maybeSingle' && key !== 'then') {
      (builder as Record<string, unknown>)[key] = vi.fn().mockReturnValue(builder)
    }
  })

  return builder
}

/**
 * Creates a mock Supabase client
 */
export function createMockSupabaseClient(overrides: {
  fromResults?: Record<string, MockQueryResult<unknown>>
  rpcResults?: Record<string, MockQueryResult<unknown>>
  authUser?: { id: string; email: string } | null
} = {}) {
  const { fromResults = {}, rpcResults = {}, authUser = null } = overrides

  const client = {
    from: vi.fn((table: string) => {
      const result = fromResults[table] || { data: null, error: null }
      return createMockQueryBuilder(result)
    }),
    rpc: vi.fn((fnName: string, params?: Record<string, unknown>) => {
      const result = rpcResults[fnName] || { data: null, error: null }
      return Promise.resolve(result)
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: authUser },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: authUser ? { user: authUser } : null },
        error: null,
      }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn(),
        download: vi.fn(),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/file' } }),
        remove: vi.fn(),
      }),
    },
  }

  return client
}

/**
 * Creates a mock service client (bypasses RLS)
 */
export function createMockServiceClient(overrides: {
  fromResults?: Record<string, MockQueryResult<unknown>>
  rpcResults?: Record<string, MockQueryResult<unknown>>
} = {}) {
  return createMockSupabaseClient(overrides)
}

/**
 * Helper to create successful query result
 */
export function mockSuccess<T>(data: T): MockQueryResult<T> {
  return { data, error: null }
}

/**
 * Helper to create error query result
 */
export function mockError(message: string, code?: string): MockQueryResult<never> {
  return { data: null, error: { message, code } }
}

/**
 * Helper to create not found result
 */
export function mockNotFound(): MockQueryResult<never> {
  return { data: null, error: { message: 'Not found', code: 'PGRST116' } }
}

// ==========================================
// ADVANCEMENT-SPECIFIC HELPERS
// ==========================================

/**
 * Common query results for advancement actions
 */
export interface AdvancementMockData {
  // Auth/profile data
  authUser?: { id: string; email: string }
  profile?: { id: string; first_name: string; last_name: string; user_id?: string }
  membership?: { role: string; unit_id: string }

  // Rank data
  ranks?: Array<{ id: string; code: string; name: string; display_order: number; requirement_version_year?: number | null }>
  rankRequirements?: Array<{
    id: string
    rank_id: string
    requirement_number: string
    description: string
    display_order: number
    version_year?: number | null
    parent_requirement_id?: string | null
  }>

  // Scout rank progress
  scoutRankProgress?: Array<{
    id: string
    scout_id: string
    rank_id: string
    status: string
    started_at?: string | null
    completed_at?: string | null
    awarded_at?: string | null
  }>
  rankRequirementProgress?: Array<{
    id: string
    scout_rank_progress_id: string
    requirement_id: string
    status: string
    completed_at?: string | null
    completed_by?: string | null
    approval_status?: string | null
  }>

  // Merit badge data
  meritBadges?: Array<{
    id: string
    code: string
    name: string
    category?: string | null
    is_eagle_required?: boolean | null
    requirement_version_year?: number | null
  }>
  scoutMeritBadgeProgress?: Array<{
    id: string
    scout_id: string
    merit_badge_id: string
    status: string
    started_at?: string | null
    completed_at?: string | null
  }>

  // Scouts
  scouts?: Array<{
    id: string
    unit_id: string
    first_name: string
    last_name: string
    is_active: boolean
    patrol_id?: string | null
  }>
}

/**
 * Creates a mock Supabase client pre-configured for advancement action tests
 *
 * Usage:
 * ```ts
 * const { client, spies } = createAdvancementMockClient({
 *   authUser: { id: 'user_1', email: 'test@example.com' },
 *   profile: { id: 'profile_1', first_name: 'Test', last_name: 'User' },
 *   membership: { role: 'leader', unit_id: 'unit_1' },
 *   ranks: [mockRankScout, mockRankTenderfoot],
 * })
 * ```
 */
export function createAdvancementMockClient(data: AdvancementMockData = {}) {
  const fromResults: Record<string, MockQueryResult<unknown>> = {}

  // Set up profile query
  if (data.profile) {
    fromResults['profiles'] = mockSuccess(data.profile)
  }

  // Set up membership query
  if (data.membership) {
    fromResults['unit_memberships'] = mockSuccess(data.membership)
  }

  // Set up ranks query
  if (data.ranks) {
    fromResults['bsa_ranks'] = mockSuccess(data.ranks)
  }

  // Set up rank requirements query
  if (data.rankRequirements) {
    fromResults['bsa_rank_requirements'] = mockSuccess(data.rankRequirements)
  }

  // Set up scout rank progress query
  if (data.scoutRankProgress) {
    fromResults['scout_rank_progress'] = mockSuccess(data.scoutRankProgress)
  }

  // Set up rank requirement progress query
  if (data.rankRequirementProgress) {
    fromResults['scout_rank_requirement_progress'] = mockSuccess(data.rankRequirementProgress)
  }

  // Set up merit badges query
  if (data.meritBadges) {
    fromResults['bsa_merit_badges'] = mockSuccess(data.meritBadges)
  }

  // Set up scout merit badge progress query
  if (data.scoutMeritBadgeProgress) {
    fromResults['scout_merit_badge_progress'] = mockSuccess(data.scoutMeritBadgeProgress)
  }

  // Set up scouts query
  if (data.scouts) {
    fromResults['scouts'] = mockSuccess(data.scouts)
  }

  const client = createMockSupabaseClient({
    fromResults,
    authUser: data.authUser || null,
  })

  return {
    client,
    // Return individual spies for assertions
    spies: {
      from: client.from,
      auth: client.auth,
    },
  }
}

/**
 * Mock authenticated user with leader role
 * Shorthand for common test setup
 */
export function mockLeaderAuth() {
  return {
    authUser: { id: 'user_leader_123', email: 'leader@example.com' },
    profile: { id: 'profile_leader_123', first_name: 'Test', last_name: 'Leader', user_id: 'user_leader_123' },
    membership: { role: 'leader', unit_id: 'unit_123' },
  }
}

/**
 * Mock authenticated user with parent role
 */
export function mockParentAuth() {
  return {
    authUser: { id: 'user_parent_123', email: 'parent@example.com' },
    profile: { id: 'profile_parent_123', first_name: 'Test', last_name: 'Parent', user_id: 'user_parent_123' },
    membership: { role: 'parent', unit_id: 'unit_123' },
  }
}

/**
 * Mock authenticated user with admin role
 */
export function mockAdminAuth() {
  return {
    authUser: { id: 'user_admin_123', email: 'admin@example.com' },
    profile: { id: 'profile_admin_123', first_name: 'Test', last_name: 'Admin', user_id: 'user_admin_123' },
    membership: { role: 'admin', unit_id: 'unit_123' },
  }
}

/**
 * Mock unauthenticated state
 */
export function mockUnauthenticated() {
  return {
    authUser: undefined,
    profile: undefined,
    membership: undefined,
  }
}

/**
 * Creates mock data for verifyLeaderRole helper
 * Returns fromResults map for profiles and unit_memberships
 */
export function mockVerifyLeaderRoleSuccess(options: {
  profileId?: string
  firstName?: string
  lastName?: string
  role?: 'admin' | 'treasurer' | 'leader'
  unitId?: string
} = {}) {
  const profileId = options.profileId || 'profile_123'
  const firstName = options.firstName || 'Test'
  const lastName = options.lastName || 'Leader'
  const role = options.role || 'leader'
  const unitId = options.unitId || 'unit_123'

  return {
    profiles: mockSuccess({
      id: profileId,
      first_name: firstName,
      last_name: lastName,
    }),
    unit_memberships: mockSuccess({
      role,
      unit_id: unitId,
    }),
  }
}

/**
 * Creates mock data for verifyLeaderRole failure (not a leader)
 */
export function mockVerifyLeaderRoleFailure() {
  return {
    profiles: mockSuccess({
      id: 'profile_123',
      first_name: 'Test',
      last_name: 'Parent',
    }),
    unit_memberships: mockSuccess({
      role: 'parent',
      unit_id: 'unit_123',
    }),
  }
}
