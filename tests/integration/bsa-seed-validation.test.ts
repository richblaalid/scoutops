/**
 * BSA Reference Data Seed Validation Tests
 *
 * These tests verify that the BSA reference data is seeded correctly.
 * They check for:
 * - Expected record counts
 * - Required fields are populated (image_url, category, etc.)
 * - Data integrity between related tables
 *
 * Run after `npm run db:fresh` or `npm run db:seed:bsa`
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Skip these tests if no database connection
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const shouldSkip = !supabaseUrl || !supabaseKey

describe.skipIf(shouldSkip)('BSA Reference Data Seed Validation', () => {
  let supabase: SupabaseClient<Database>

  beforeAll(() => {
    if (supabaseUrl && supabaseKey) {
      supabase = createClient<Database>(supabaseUrl, supabaseKey)
    }
  })

  describe('Merit Badges', () => {
    it('should have at least 140 merit badges', async () => {
      const { count, error } = await supabase
        .from('bsa_merit_badges')
        .select('*', { count: 'exact', head: true })

      expect(error).toBeNull()
      expect(count).toBeGreaterThanOrEqual(140)
    })

    it('should have image_url for all badges', async () => {
      const { data, error } = await supabase
        .from('bsa_merit_badges')
        .select('code, name')
        .is('image_url', null)

      expect(error).toBeNull()
      expect(data).toHaveLength(0)
    })

    it('should have category for all badges', async () => {
      const { data, error } = await supabase
        .from('bsa_merit_badges')
        .select('code, name')
        .is('category', null)

      expect(error).toBeNull()
      expect(data).toHaveLength(0)
    })

    it('should have eagle-required badges flagged', async () => {
      const { data, error } = await supabase
        .from('bsa_merit_badges')
        .select('code, name')
        .eq('is_eagle_required', true)

      expect(error).toBeNull()
      // There are approximately 13-18 eagle-required badges depending on version
      expect(data?.length).toBeGreaterThanOrEqual(10)
    })
  })

  describe('Merit Badge Requirements', () => {
    it('should have at least 10,000 requirements', async () => {
      const { count, error } = await supabase
        .from('bsa_merit_badge_requirements')
        .select('*', { count: 'exact', head: true })

      expect(error).toBeNull()
      expect(count).toBeGreaterThanOrEqual(10000)
    })

    it('should have requirements linked to badges', async () => {
      // Check that requirements are properly linked to badges
      // by verifying we can join them
      const { count, error } = await supabase
        .from('bsa_merit_badge_requirements')
        .select('id, bsa_merit_badges!inner(id)', { count: 'exact', head: true })

      expect(error).toBeNull()
      // All requirements should have a valid badge reference
      expect(count).toBeGreaterThanOrEqual(10000)
    })
  })

  describe('Ranks', () => {
    it('should have all 7 ranks', async () => {
      const { data, error } = await supabase
        .from('bsa_ranks')
        .select('code')
        .order('display_order')

      expect(error).toBeNull()
      expect(data?.map(r => r.code)).toEqual([
        'scout',
        'tenderfoot',
        'second_class',
        'first_class',
        'star',
        'life',
        'eagle',
      ])
    })
  })

  describe('Rank Requirements', () => {
    it('should have at least 140 rank requirements', async () => {
      const { count, error } = await supabase
        .from('bsa_rank_requirements')
        .select('*', { count: 'exact', head: true })

      expect(error).toBeNull()
      expect(count).toBeGreaterThanOrEqual(140)
    })

    it('should have Scout requirements 2a-2d', async () => {
      const { data: scout } = await supabase
        .from('bsa_ranks')
        .select('id')
        .eq('code', 'scout')
        .single()

      const { data: reqs, error } = await supabase
        .from('bsa_rank_requirements')
        .select('requirement_number')
        .eq('rank_id', scout!.id)
        .in('requirement_number', ['2a', '2b', '2c', '2d'])

      expect(error).toBeNull()
      expect(reqs?.map(r => r.requirement_number).sort()).toEqual(['2a', '2b', '2c', '2d'])
    })

    it('should have Scout requirements 6a-6b', async () => {
      const { data: scout } = await supabase
        .from('bsa_ranks')
        .select('id')
        .eq('code', 'scout')
        .single()

      const { data: reqs, error } = await supabase
        .from('bsa_rank_requirements')
        .select('requirement_number')
        .eq('rank_id', scout!.id)
        .in('requirement_number', ['6a', '6b'])

      expect(error).toBeNull()
      expect(reqs?.map(r => r.requirement_number).sort()).toEqual(['6a', '6b'])
    })

    it('should have Tenderfoot requirement 5d', async () => {
      const { data: tenderfoot } = await supabase
        .from('bsa_ranks')
        .select('id')
        .eq('code', 'tenderfoot')
        .single()

      const { data: reqs, error } = await supabase
        .from('bsa_rank_requirements')
        .select('requirement_number')
        .eq('rank_id', tenderfoot!.id)
        .eq('requirement_number', '5d')

      expect(error).toBeNull()
      expect(reqs).toHaveLength(1)
    })
  })

  describe('Leadership Positions', () => {
    it('should have at least 15 leadership positions', async () => {
      const { count, error } = await supabase
        .from('bsa_leadership_positions')
        .select('*', { count: 'exact', head: true })

      expect(error).toBeNull()
      expect(count).toBeGreaterThanOrEqual(15)
    })

    it('should have Senior Patrol Leader', async () => {
      const { data, error } = await supabase
        .from('bsa_leadership_positions')
        .select('name, code')
        .eq('code', 'senior_patrol_leader')
        .single()

      expect(error).toBeNull()
      expect(data?.name).toBe('Senior Patrol Leader')
    })
  })
})
