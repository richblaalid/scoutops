/**
 * Test fixtures for advancement-related data structures
 * Used by advancement.ts action tests
 */

// NOTE: We define mock data inline rather than importing from index.ts
// to avoid circular dependency (index re-exports this file)

// Re-declare base fixtures we need (matches index.ts definitions)
const mockUnit = {
  id: 'unit_123',
  name: 'Troop 123',
  unit_type: 'troop' as const,
}

const mockScout = {
  id: 'scout_123',
  unit_id: mockUnit.id,
  first_name: 'Johnny',
  last_name: 'Scout',
  patrol: 'Eagle Patrol',
  rank: 'First Class',
  date_of_birth: '2010-05-15',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockProfile = {
  id: 'profile_123',
  email: 'test@example.com',
  full_name: 'Test User',
  first_name: 'Test',
  last_name: 'User',
}

// ==========================================
// BSA RANKS
// ==========================================

export const mockRankScout = {
  id: 'rank_scout',
  code: 'scout',
  name: 'Scout',
  display_order: 1,
  description: 'The first rank in Scouts BSA',
  image_url: null,
  is_eagle_required: false,
  requirement_version_year: 2024,
  created_at: '2024-01-01T00:00:00Z',
}

export const mockRankTenderfoot = {
  id: 'rank_tenderfoot',
  code: 'tenderfoot',
  name: 'Tenderfoot',
  display_order: 2,
  description: 'The second rank in Scouts BSA',
  image_url: null,
  is_eagle_required: false,
  requirement_version_year: 2024,
  created_at: '2024-01-01T00:00:00Z',
}

export const mockRankSecondClass = {
  id: 'rank_second_class',
  code: 'second_class',
  name: 'Second Class',
  display_order: 3,
  description: 'The third rank in Scouts BSA',
  image_url: null,
  is_eagle_required: false,
  requirement_version_year: 2024,
  created_at: '2024-01-01T00:00:00Z',
}

export const mockRankFirstClass = {
  id: 'rank_first_class',
  code: 'first_class',
  name: 'First Class',
  display_order: 4,
  description: 'The fourth rank in Scouts BSA',
  image_url: null,
  is_eagle_required: false,
  requirement_version_year: 2024,
  created_at: '2024-01-01T00:00:00Z',
}

export const mockRankEagle = {
  id: 'rank_eagle',
  code: 'eagle',
  name: 'Eagle Scout',
  display_order: 7,
  description: 'The highest rank in Scouts BSA',
  image_url: null,
  is_eagle_required: true,
  requirement_version_year: 2024,
  created_at: '2024-01-01T00:00:00Z',
}

export const mockAllRanks = [
  mockRankScout,
  mockRankTenderfoot,
  mockRankSecondClass,
  mockRankFirstClass,
  mockRankEagle,
]

// ==========================================
// BSA RANK REQUIREMENTS
// ==========================================

export const mockRankRequirement1 = {
  id: 'req_scout_1',
  rank_id: mockRankScout.id,
  requirement_number: '1',
  sub_requirement_letter: null,
  description: 'Repeat from memory the Scout Oath.',
  display_order: 1,
  parent_requirement_id: null,
  is_alternative: false,
  alternatives_group: null,
  version_year: 2024,
  created_at: '2024-01-01T00:00:00Z',
}

export const mockRankRequirement2 = {
  id: 'req_scout_2',
  rank_id: mockRankScout.id,
  requirement_number: '2',
  sub_requirement_letter: null,
  description: 'Repeat from memory the Scout Law.',
  display_order: 2,
  parent_requirement_id: null,
  is_alternative: false,
  alternatives_group: null,
  version_year: 2024,
  created_at: '2024-01-01T00:00:00Z',
}

export const mockRankRequirement3 = {
  id: 'req_scout_3',
  rank_id: mockRankScout.id,
  requirement_number: '3',
  sub_requirement_letter: null,
  description: 'Explain the meaning of the Scout Oath.',
  display_order: 3,
  parent_requirement_id: null,
  is_alternative: false,
  alternatives_group: null,
  version_year: 2024,
  created_at: '2024-01-01T00:00:00Z',
}

// Sub-requirements example (hierarchical)
export const mockRankRequirementWithSubs = {
  id: 'req_tenderfoot_1',
  rank_id: mockRankTenderfoot.id,
  requirement_number: '1',
  sub_requirement_letter: null,
  description: 'Present yourself to your leader, prepared for an overnight camping trip.',
  display_order: 1,
  parent_requirement_id: null,
  is_alternative: false,
  alternatives_group: null,
  version_year: 2024,
  created_at: '2024-01-01T00:00:00Z',
}

export const mockRankSubRequirement1a = {
  id: 'req_tenderfoot_1a',
  rank_id: mockRankTenderfoot.id,
  requirement_number: '1',
  sub_requirement_letter: 'a',
  description: 'Show the gear you will be taking.',
  display_order: 2,
  parent_requirement_id: mockRankRequirementWithSubs.id,
  is_alternative: false,
  alternatives_group: null,
  version_year: 2024,
  created_at: '2024-01-01T00:00:00Z',
}

export const mockRankSubRequirement1b = {
  id: 'req_tenderfoot_1b',
  rank_id: mockRankTenderfoot.id,
  requirement_number: '1',
  sub_requirement_letter: 'b',
  description: 'Show the right way to pack and carry it.',
  display_order: 3,
  parent_requirement_id: mockRankRequirementWithSubs.id,
  is_alternative: false,
  alternatives_group: null,
  version_year: 2024,
  created_at: '2024-01-01T00:00:00Z',
}

export const mockAllRankRequirements = [
  mockRankRequirement1,
  mockRankRequirement2,
  mockRankRequirement3,
  mockRankRequirementWithSubs,
  mockRankSubRequirement1a,
  mockRankSubRequirement1b,
]

// ==========================================
// SCOUT RANK PROGRESS
// ==========================================

export const mockScoutRankProgress = {
  id: 'srp_123',
  scout_id: mockScout.id,
  rank_id: mockRankScout.id,
  status: 'in_progress' as const,
  started_at: '2024-01-15T00:00:00Z',
  completed_at: null,
  approved_at: null,
  approved_by: null,
  awarded_at: null,
  awarded_by: null,
  external_status: null,
  sync_session_id: null,
  synced_at: null,
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
}

export const mockCompletedRankProgress = {
  ...mockScoutRankProgress,
  id: 'srp_completed_123',
  rank_id: mockRankTenderfoot.id,
  status: 'completed' as const,
  completed_at: '2024-03-01T00:00:00Z',
}

export const mockAwardedRankProgress = {
  ...mockScoutRankProgress,
  id: 'srp_awarded_123',
  rank_id: mockRankSecondClass.id,
  status: 'awarded' as const,
  completed_at: '2024-02-15T00:00:00Z',
  approved_at: '2024-02-20T00:00:00Z',
  approved_by: mockProfile.id,
  awarded_at: '2024-03-01T00:00:00Z',
  awarded_by: mockProfile.id,
}

// With nested data (as returned by Supabase selects)
export const mockScoutRankProgressWithRank = {
  ...mockScoutRankProgress,
  bsa_ranks: mockRankScout,
}

// ==========================================
// SCOUT RANK REQUIREMENT PROGRESS
// ==========================================

export const mockRequirementProgressNotStarted = {
  id: 'srrp_not_started',
  scout_rank_progress_id: mockScoutRankProgress.id,
  requirement_id: mockRankRequirement1.id,
  status: 'not_started' as const,
  completed_at: null,
  completed_by: null,
  notes: null,
  approval_status: null,
  submission_notes: null,
  submitted_at: null,
  submitted_by: null,
  reviewed_at: null,
  reviewed_by: null,
  denial_reason: null,
  sync_session_id: null,
  synced_at: null,
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
}

export const mockRequirementProgressCompleted = {
  ...mockRequirementProgressNotStarted,
  id: 'srrp_completed',
  requirement_id: mockRankRequirement2.id,
  status: 'completed' as const,
  completed_at: '2024-02-01T00:00:00Z',
  completed_by: mockProfile.id,
  notes: 'Great job!',
}

export const mockRequirementProgressPendingApproval = {
  ...mockRequirementProgressNotStarted,
  id: 'srrp_pending',
  requirement_id: mockRankRequirement3.id,
  status: 'in_progress' as const,
  approval_status: 'pending_approval',
  submission_notes: 'Ready for review',
  submitted_at: '2024-02-15T00:00:00Z',
  submitted_by: mockProfile.id,
}

// With nested data
export const mockRequirementProgressWithDetails = {
  ...mockRequirementProgressCompleted,
  scout_rank_progress: {
    ...mockScoutRankProgress,
    scouts: mockScout,
    bsa_ranks: mockRankScout,
  },
  bsa_rank_requirements: mockRankRequirement2,
}

// ==========================================
// BSA MERIT BADGES
// ==========================================

export const mockBadgeCamping = {
  id: 'badge_camping',
  code: 'camping',
  name: 'Camping',
  category: 'Outdoor Skills',
  description: 'Learn camping skills',
  image_url: null,
  pamphlet_url: null,
  is_active: true,
  is_eagle_required: true,
  requirement_version_year: 2024,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockBadgeFirstAid = {
  id: 'badge_first_aid',
  code: 'first_aid',
  name: 'First Aid',
  category: 'Safety',
  description: 'Learn first aid skills',
  image_url: null,
  pamphlet_url: null,
  is_active: true,
  is_eagle_required: true,
  requirement_version_year: 2024,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockBadgeSwimming = {
  id: 'badge_swimming',
  code: 'swimming',
  name: 'Swimming',
  category: 'Aquatic',
  description: 'Learn swimming skills',
  image_url: null,
  pamphlet_url: null,
  is_active: true,
  is_eagle_required: true,
  requirement_version_year: 2024,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockBadgeArchery = {
  id: 'badge_archery',
  code: 'archery',
  name: 'Archery',
  category: 'Sports',
  description: 'Learn archery skills',
  image_url: null,
  pamphlet_url: null,
  is_active: true,
  is_eagle_required: false,
  requirement_version_year: 2024,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockAllMeritBadges = [
  mockBadgeCamping,
  mockBadgeFirstAid,
  mockBadgeSwimming,
  mockBadgeArchery,
]

export const mockMeritBadgeCategories = ['Outdoor Skills', 'Safety', 'Aquatic', 'Sports']

// ==========================================
// SCOUT MERIT BADGE PROGRESS
// ==========================================

export const mockMeritBadgeProgressStarted = {
  id: 'smbp_started',
  scout_id: mockScout.id,
  merit_badge_id: mockBadgeCamping.id,
  status: 'in_progress' as const,
  started_at: '2024-01-15T00:00:00Z',
  completed_at: null,
  approved_at: null,
  approved_by: null,
  awarded_at: null,
  counselor_profile_id: null,
  counselor_name: 'John Smith',
  counselor_bsa_id: null,
  counselor_signed_at: null,
  requirement_version_year: 2024,
  sync_session_id: null,
  synced_at: null,
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
}

export const mockMeritBadgeProgressCompleted = {
  ...mockMeritBadgeProgressStarted,
  id: 'smbp_completed',
  merit_badge_id: mockBadgeFirstAid.id,
  status: 'completed' as const,
  completed_at: '2024-03-01T00:00:00Z',
  counselor_signed_at: '2024-03-01T00:00:00Z',
}

export const mockMeritBadgeProgressAwarded = {
  ...mockMeritBadgeProgressStarted,
  id: 'smbp_awarded',
  merit_badge_id: mockBadgeSwimming.id,
  status: 'awarded' as const,
  completed_at: '2024-02-15T00:00:00Z',
  approved_at: '2024-02-20T00:00:00Z',
  approved_by: mockProfile.id,
  awarded_at: '2024-03-01T00:00:00Z',
}

// With nested data
export const mockMeritBadgeProgressWithBadge = {
  ...mockMeritBadgeProgressStarted,
  bsa_merit_badges: mockBadgeCamping,
}

export const mockMeritBadgeProgressWithScout = {
  ...mockMeritBadgeProgressStarted,
  scouts: mockScout,
  bsa_merit_badges: mockBadgeCamping,
}

// ==========================================
// SUMMARY DATA (as returned by getUnitAdvancementSummary)
// ==========================================

export const mockAdvancementSummary = {
  scouts: [
    {
      id: mockScout.id,
      first_name: mockScout.first_name,
      last_name: mockScout.last_name,
      rank: mockRankScout.name,
      patrol_name: 'Eagle Patrol',
    },
  ],
  rankStats: {
    avgProgressPercent: 45,
    scoutsWorkingOnRanks: 5,
  },
  badgeStats: {
    inProgress: 12,
    earned: 28,
  },
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Create a scout with rank progress for testing
 */
export function createScoutWithProgress(overrides: {
  scoutId?: string
  firstName?: string
  lastName?: string
  rankId?: string
  rankStatus?: 'not_started' | 'in_progress' | 'completed' | 'awarded'
  completedRequirements?: number
  totalRequirements?: number
} = {}) {
  const scoutId = overrides.scoutId || `scout_${Math.random().toString(36).slice(2)}`
  const rankProgressId = `srp_${Math.random().toString(36).slice(2)}`

  return {
    scout: {
      ...mockScout,
      id: scoutId,
      first_name: overrides.firstName || mockScout.first_name,
      last_name: overrides.lastName || mockScout.last_name,
    },
    rankProgress: {
      ...mockScoutRankProgress,
      id: rankProgressId,
      scout_id: scoutId,
      rank_id: overrides.rankId || mockRankScout.id,
      status: overrides.rankStatus || 'in_progress',
    },
  }
}

/**
 * Create multiple scouts with various progress states for testing
 */
export function createTestScoutsWithProgress(count: number = 5) {
  const statuses: Array<'not_started' | 'in_progress' | 'completed' | 'awarded'> = [
    'not_started',
    'in_progress',
    'in_progress',
    'completed',
    'awarded',
  ]
  const firstNames = ['Johnny', 'Sarah', 'Mike', 'Emma', 'Jake', 'Lily', 'Tom', 'Amy']
  const lastNames = ['Smith', 'Jones', 'Wilson', 'Brown', 'Davis', 'Miller', 'Taylor', 'Anderson']

  return Array.from({ length: count }, (_, i) => {
    return createScoutWithProgress({
      firstName: firstNames[i % firstNames.length],
      lastName: lastNames[i % lastNames.length],
      rankStatus: statuses[i % statuses.length],
    })
  })
}

/**
 * Create a fresh copy of any fixture (prevents mutation between tests)
 */
export function createAdvancementFixture<T>(fixture: T): T {
  return JSON.parse(JSON.stringify(fixture))
}

/**
 * Create a fixture with overrides
 */
export function createAdvancementFixtureWith<T>(fixture: T, overrides: Partial<T>): T {
  return { ...createAdvancementFixture(fixture), ...overrides }
}
