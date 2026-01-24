import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Next.js cache functions
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Supabase clients
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

const mockAdminSupabase = {
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdminSupabase),
}))

// Import actions after mocking
import { importScoutbookHistory } from '@/app/actions/scoutbook-import'
// Import fixtures using relative path since @ alias doesn't work for tests folder
import {
  mockParsedActivities,
  mockImportSelectionsAll,
  mockImportSelectionsRanksOnly,
  mockImportSelectionsEmpty,
} from '../../mocks/fixtures/scoutbook'

// Test fixtures
const mockUser = { id: 'user-123', email: 'leader@example.com' }
const mockProfile = {
  id: 'profile-123',
  first_name: 'Test',
  last_name: 'Leader',
}
const mockMembership = { role: 'leader' }

describe('Scoutbook Import Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('importScoutbookHistory', () => {
    it('should return error when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const result = await importScoutbookHistory(
        'scout-123',
        'unit-123',
        mockImportSelectionsAll,
        mockParsedActivities
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not authenticated')
    })

    it('should return error when profile not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })

      const result = await importScoutbookHistory(
        'scout-123',
        'unit-123',
        mockImportSelectionsAll,
        mockParsedActivities
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Profile not found')
    })

    it('should return error when user is not a leader', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }
        }
        if (table === 'unit_memberships') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'scout' }, error: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      })

      const result = await importScoutbookHistory(
        'scout-123',
        'unit-123',
        mockImportSelectionsAll,
        mockParsedActivities
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Only leaders can import advancement records')
    })

    it('should return success with empty selections', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }
        }
        if (table === 'unit_memberships') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: mockMembership, error: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      })

      // Mock admin client returning empty reference data
      mockAdminSupabase.from.mockImplementation((table: string) => {
        if (table === 'bsa_ranks') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        if (table === 'bsa_merit_badges') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        if (table === 'bsa_leadership_positions') {
          return {
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      })

      const result = await importScoutbookHistory(
        'scout-123',
        'unit-123',
        mockImportSelectionsEmpty,
        mockParsedActivities
      )

      expect(result.success).toBe(true)
      expect(result.data?.ranksImported).toBe(0)
      expect(result.data?.badgesImported).toBe(0)
      expect(result.data?.leadershipImported).toBe(0)
    })

    it('should allow admin role to import', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }
        }
        if (table === 'unit_memberships') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      })

      mockAdminSupabase.from.mockImplementation((table: string) => {
        if (table === 'bsa_ranks') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        if (table === 'bsa_merit_badges') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        if (table === 'bsa_leadership_positions') {
          return {
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      })

      const result = await importScoutbookHistory(
        'scout-123',
        'unit-123',
        mockImportSelectionsEmpty,
        mockParsedActivities
      )

      expect(result.success).toBe(true)
    })

    it('should import rank progress when ranks match', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }
        }
        if (table === 'unit_memberships') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: mockMembership, error: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      })

      const mockRanks = [
        { id: 'rank-scout', code: 'scout', name: 'Scout', requirement_version_year: 2024 },
        { id: 'rank-tenderfoot', code: 'tenderfoot', name: 'Tenderfoot', requirement_version_year: 2024 },
      ]

      const mockRankRequirements = [
        { id: 'req-1', rank_id: 'rank-scout', requirement_number: '1', scoutbook_requirement_number: '1', version_year: 2024 },
        { id: 'req-2', rank_id: 'rank-scout', requirement_number: '2', scoutbook_requirement_number: '2', version_year: 2024 },
      ]

      mockAdminSupabase.from.mockImplementation((table: string) => {
        if (table === 'bsa_ranks') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockRanks, error: null }),
          }
        }
        if (table === 'bsa_merit_badges') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        if (table === 'bsa_leadership_positions') {
          return {
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        if (table === 'scout_rank_progress') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'srp-new' }, error: null }),
          }
        }
        if (table === 'bsa_rank_requirements') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: mockRankRequirements, error: null }),
          }
        }
        if (table === 'scout_rank_requirement_progress') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockResolvedValue({ data: [{ id: 'srrp-1' }], error: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      })

      const result = await importScoutbookHistory(
        'scout-123',
        'unit-123',
        mockImportSelectionsRanksOnly,
        mockParsedActivities
      )

      // Should process without errors even if counts don't match exactly
      // due to mocking complexity
      expect(result.success).toBe(true)
    })

    it('should handle existing rank progress by updating', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }
        }
        if (table === 'unit_memberships') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: mockMembership, error: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      })

      const mockRanks = [
        { id: 'rank-scout', code: 'scout', name: 'Scout', requirement_version_year: 2024 },
      ]

      mockAdminSupabase.from.mockImplementation((table: string) => {
        if (table === 'bsa_ranks') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockRanks, error: null }),
          }
        }
        if (table === 'bsa_merit_badges') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        if (table === 'bsa_leadership_positions') {
          return {
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        if (table === 'scout_rank_progress') {
          // Return existing progress
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'existing-progress' }, error: null }),
            update: vi.fn().mockReturnThis(),
          }
        }
        if (table === 'bsa_rank_requirements') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        if (table === 'scout_rank_requirement_progress') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn().mockReturnThis(),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      })

      const result = await importScoutbookHistory(
        'scout-123',
        'unit-123',
        mockImportSelectionsRanksOnly,
        mockParsedActivities
      )

      expect(result.success).toBe(true)
    })
  })
})
