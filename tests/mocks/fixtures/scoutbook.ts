/**
 * Test fixtures for Scoutbook import data structures
 * Used by scoutbook-import.ts action tests
 *
 * Based on the actual Scoutbook CSV export format:
 * - Semi-structured with multiple sections
 * - Different formats per section (ranks, badges, leadership, activities)
 * - Requirement numbers in parenthetical format (e.g., 6A(a)(1))
 */

import type {
  ScoutbookScoutInfo,
  ParsedRankProgress,
  ParsedRankRequirement,
  ParsedMeritBadge,
  ParsedLeadershipPosition,
  ParsedActivities,
  ParsedScoutbookHistory,
} from '@/lib/import/scoutbook-history-parser'
import type { ImportSelections } from '@/components/import/scoutbook-history-preview'

// ==========================================
// SCOUT INFO
// ==========================================

export const mockScoutbookScoutInfo: ScoutbookScoutInfo = {
  fullName: 'Johnny Scout',
  firstName: 'Johnny',
  lastName: 'Scout',
  unit: 'Troop 123',
  birthdate: '2010-05-15',
  dateJoined: '2021-09-01',
  currentRank: 'First Class',
  currentRankDate: '2023-06-15',
  bsaId: '123456789',
  positions: ['Patrol Leader', 'Den Chief'],
}

export const mockScoutbookScoutInfoMinimal: ScoutbookScoutInfo = {
  fullName: 'Jane Doe',
  firstName: 'Jane',
  lastName: 'Doe',
  unit: 'Troop 456',
  birthdate: null,
  dateJoined: null,
  currentRank: null,
  currentRankDate: null,
  bsaId: null,
  positions: [],
}

// ==========================================
// RANK REQUIREMENTS (CSV format)
// ==========================================

export const mockParsedRankRequirement1: ParsedRankRequirement = {
  requirementNumber: '1',
  description: 'Repeat from memory the Scout Oath.',
  completedDate: '2021-09-15',
}

export const mockParsedRankRequirement2: ParsedRankRequirement = {
  requirementNumber: '2',
  description: 'Repeat from memory the Scout Law.',
  completedDate: '2021-09-15',
}

export const mockParsedRankRequirementIncomplete: ParsedRankRequirement = {
  requirementNumber: '3',
  description: 'Explain the meaning of the Scout Oath.',
  completedDate: null,
}

// Sub-requirements with parenthetical format (Scoutbook style)
export const mockParsedSubRequirement1a: ParsedRankRequirement = {
  requirementNumber: '1(a)',
  description: 'Present yourself to your leader prepared for an overnight camping trip. Show the gear you will take.',
  completedDate: '2022-01-20',
}

export const mockParsedSubRequirement1b: ParsedRankRequirement = {
  requirementNumber: '1(b)',
  description: 'Show the right way to pack and carry it.',
  completedDate: '2022-01-20',
}

// Deeply nested requirement (for Option A/B badges like Cycling)
export const mockParsedNestedRequirement: ParsedRankRequirement = {
  requirementNumber: '6A(a)(1)',
  description: 'Option A road biking - gear requirements',
  completedDate: '2023-03-10',
}

// ==========================================
// RANK PROGRESS (parsed from CSV sections)
// ==========================================

export const mockParsedScoutRankProgress: ParsedRankProgress = {
  rankCode: 'scout',
  rankName: 'Scout',
  completedDate: '2021-09-20',
  requirements: [mockParsedRankRequirement1, mockParsedRankRequirement2],
}

export const mockParsedTenderfootProgress: ParsedRankProgress = {
  rankCode: 'tenderfoot',
  rankName: 'Tenderfoot',
  completedDate: '2022-02-15',
  requirements: [mockParsedSubRequirement1a, mockParsedSubRequirement1b],
}

export const mockParsedFirstClassProgressIncomplete: ParsedRankProgress = {
  rankCode: 'first_class',
  rankName: 'First Class',
  completedDate: null,
  requirements: [mockParsedRankRequirement1, mockParsedRankRequirementIncomplete],
}

// ==========================================
// MERIT BADGES (parsed from CSV)
// ==========================================

export const mockParsedMeritBadgeComplete: ParsedMeritBadge = {
  name: 'Camping',
  normalizedName: 'camping',
  startDate: '2022-06-01',
  completedDate: '2022-08-15',
  isComplete: true,
  completedRequirements: ['1', '2', '3', '4(a)', '4(b)', '5', '6', '7', '8', '9'],
  version: '2024',
}

export const mockParsedMeritBadgePartial: ParsedMeritBadge = {
  name: 'First Aid',
  normalizedName: 'first_aid',
  startDate: '2023-01-15',
  completedDate: null,
  isComplete: false,
  completedRequirements: ['1', '2(a)', '2(b)', '3'],
  version: '2024',
}

export const mockParsedMeritBadgeWithAbbreviation: ParsedMeritBadge = {
  name: 'Cit. in Comm.',
  normalizedName: 'citizenship_in_community',
  startDate: '2023-03-01',
  completedDate: '2023-05-20',
  isComplete: true,
  completedRequirements: ['1', '2', '3', '4', '5', '6', '7', '8'],
  version: '2024',
}

export const mockParsedMeritBadgeOptionAB: ParsedMeritBadge = {
  name: 'Cycling',
  normalizedName: 'cycling',
  startDate: '2023-02-01',
  completedDate: null,
  isComplete: false,
  completedRequirements: ['1', '2', '3', '4', '5', '6A(a)(1)', '6A(a)(2)', '6A(b)'],
  version: '2024',
}

export const mockParsedMeritBadgeOldVersion: ParsedMeritBadge = {
  name: 'Swimming',
  normalizedName: 'swimming',
  startDate: '2020-06-01',
  completedDate: '2020-07-15',
  isComplete: true,
  completedRequirements: ['1', '2', '3', '4', '5', '6', '7', '8'],
  version: '2019',
}

// ==========================================
// LEADERSHIP POSITIONS
// ==========================================

export const mockParsedLeadershipPatrolLeader: ParsedLeadershipPosition = {
  name: 'Patrol Leader',
  patrol: 'Eagle Patrol',
  startDate: '2023-01-01',
  endDate: '2023-07-01',
}

export const mockParsedLeadershipDenChief: ParsedLeadershipPosition = {
  name: 'Den Chief',
  patrol: null,
  startDate: '2023-02-15',
  endDate: null, // Current position
}

export const mockParsedLeadershipSPL: ParsedLeadershipPosition = {
  name: 'Senior Patrol Leader',
  patrol: null,
  startDate: '2023-07-01',
  endDate: '2024-01-01',
}

// ==========================================
// ACTIVITIES
// ==========================================

export const mockParsedActivities: ParsedActivities = {
  serviceHours: 45,
  hikingMiles: 120,
  campingNights: 32,
}

export const mockParsedActivitiesEmpty: ParsedActivities = {
  serviceHours: 0,
  hikingMiles: 0,
  campingNights: 0,
}

// ==========================================
// FULL PARSED HISTORY (complete import data)
// ==========================================

export const mockParsedScoutbookHistory: ParsedScoutbookHistory = {
  scout: mockScoutbookScoutInfo,
  rankProgress: [mockParsedScoutRankProgress, mockParsedTenderfootProgress, mockParsedFirstClassProgressIncomplete],
  completedMeritBadges: [mockParsedMeritBadgeComplete, mockParsedMeritBadgeWithAbbreviation],
  partialMeritBadges: [mockParsedMeritBadgePartial, mockParsedMeritBadgeOptionAB],
  leadershipHistory: [mockParsedLeadershipPatrolLeader, mockParsedLeadershipDenChief],
  activities: mockParsedActivities,
  errors: [],
}

export const mockParsedScoutbookHistoryWithErrors: ParsedScoutbookHistory = {
  ...mockParsedScoutbookHistory,
  errors: ['Could not parse line 45: invalid date format', 'Unknown rank section header: "Advanced Scout"'],
}

export const mockParsedScoutbookHistoryMinimal: ParsedScoutbookHistory = {
  scout: mockScoutbookScoutInfoMinimal,
  rankProgress: [mockParsedScoutRankProgress],
  completedMeritBadges: [],
  partialMeritBadges: [],
  leadershipHistory: [],
  activities: mockParsedActivitiesEmpty,
  errors: [],
}

// ==========================================
// IMPORT SELECTIONS (user selections for import)
// ==========================================

export const mockImportSelectionsAll: ImportSelections = {
  rankProgress: [mockParsedScoutRankProgress, mockParsedTenderfootProgress],
  completedMeritBadges: [mockParsedMeritBadgeComplete],
  partialMeritBadges: [mockParsedMeritBadgePartial],
  leadershipHistory: [mockParsedLeadershipPatrolLeader],
  includeActivities: true,
}

export const mockImportSelectionsRanksOnly: ImportSelections = {
  rankProgress: [mockParsedScoutRankProgress],
  completedMeritBadges: [],
  partialMeritBadges: [],
  leadershipHistory: [],
  includeActivities: false,
}

export const mockImportSelectionsBadgesOnly: ImportSelections = {
  rankProgress: [],
  completedMeritBadges: [mockParsedMeritBadgeComplete, mockParsedMeritBadgeWithAbbreviation],
  partialMeritBadges: [],
  leadershipHistory: [],
  includeActivities: false,
}

export const mockImportSelectionsEmpty: ImportSelections = {
  rankProgress: [],
  completedMeritBadges: [],
  partialMeritBadges: [],
  leadershipHistory: [],
  includeActivities: false,
}

// ==========================================
// RAW CSV DATA (for parser tests)
// ==========================================

export const mockScoutbookCsvHeader = `Scouts BSA History Report
01/15/2024
Johnny Scout
Unit: Troop 123
BSA ID: 123456789`

export const mockScoutbookCsvRankSection = `Scout
1,Repeat from memory the Scout Oath.,09/15/2021
2,Repeat from memory the Scout Law.,09/15/2021
3,Explain the meaning of the Scout Oath.,__________`

export const mockScoutbookCsvMeritBadgeSection = `Completed Merit Badges
Camping,08/15/2022
First Aid,03/20/2023
Cit. in Comm.,05/20/2023`

export const mockScoutbookCsvPartialMeritBadgeSection = `Partial Merit Badges
Cycling,Version: 2024
  1,__________
  2,02/15/2023
  3,02/20/2023
  6A(a)(1),03/10/2023
Swimming,Version: 2024
  1,01/10/2024
  2,__________`

export const mockScoutbookCsvLeadershipSection = `Leadership
Patrol Leader,Eagle Patrol,01/01/2023,07/01/2023
Den Chief,,02/15/2023,`

export const mockScoutbookCsvActivitiesSection = `Activities
Service Hours: 45
Hiking Miles: 120
Camping Nights: 32`

// Complete CSV file (simplified version for testing)
export const mockScoutbookCsvComplete = `Scouts BSA History Report
01/15/2024
Johnny Scout
Unit: Troop 123
BSA ID: 123456789

Scout
1,Repeat from memory the Scout Oath.,09/15/2021
2,Repeat from memory the Scout Law.,09/15/2021

Tenderfoot
1(a),Present yourself to your leader prepared for camping.,01/20/2022
1(b),Show the right way to pack and carry it.,01/20/2022

Completed Merit Badges
Camping,08/15/2022

Partial Merit Badges
First Aid,Version: 2024
  1,01/15/2023
  2(a),01/20/2023

Leadership
Patrol Leader,Eagle Patrol,01/01/2023,07/01/2023

Activities
Service Hours: 45
Hiking Miles: 120
Camping Nights: 32`

// Malformed CSV data (for error handling tests)
export const mockScoutbookCsvMalformed = `Scouts BSA History Report
01/15/2024
Johnny Scout

Invalid Section Header Here

Merit Badge with bad date,not-a-date
Leadership missing fields`

export const mockScoutbookCsvEmpty = `Scouts BSA History Report
01/15/2024
Unknown Scout
Unit: Unknown
BSA ID:`

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Create a parsed rank progress with custom requirements
 */
export function createParsedRankProgress(
  rankCode: string,
  rankName: string,
  options: {
    completedDate?: string | null
    completedRequirements?: number
    totalRequirements?: number
  } = {}
): ParsedRankProgress {
  const total = options.totalRequirements || 5
  const completed = options.completedRequirements || 0

  const requirements: ParsedRankRequirement[] = Array.from({ length: total }, (_, i) => ({
    requirementNumber: String(i + 1),
    description: `Requirement ${i + 1} description`,
    completedDate: i < completed ? `2024-0${(i % 9) + 1}-15` : null,
  }))

  return {
    rankCode,
    rankName,
    completedDate: options.completedDate ?? null,
    requirements,
  }
}

/**
 * Create a parsed merit badge with custom state
 */
export function createParsedMeritBadge(
  name: string,
  options: {
    isComplete?: boolean
    completedRequirements?: string[]
    version?: string
  } = {}
): ParsedMeritBadge {
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  const isComplete = options.isComplete ?? false

  return {
    name,
    normalizedName,
    startDate: '2024-01-01',
    completedDate: isComplete ? '2024-03-15' : null,
    isComplete,
    completedRequirements: options.completedRequirements || [],
    version: options.version || '2024',
  }
}

/**
 * Create a complete import selections object
 */
export function createImportSelections(
  options: {
    rankCount?: number
    badgeCount?: number
    leadershipCount?: number
    includeActivities?: boolean
  } = {}
): ImportSelections {
  const ranks = Array.from({ length: options.rankCount || 0 }, (_, i) =>
    createParsedRankProgress(`rank_${i}`, `Rank ${i}`, { completedDate: '2024-01-15' })
  )

  const completedBadges = Array.from({ length: options.badgeCount || 0 }, (_, i) =>
    createParsedMeritBadge(`Badge ${i}`, { isComplete: true })
  )

  const leadershipHistory: ParsedLeadershipPosition[] = Array.from({ length: options.leadershipCount || 0 }, (_, i) => ({
    name: `Position ${i}`,
    patrol: i % 2 === 0 ? `Patrol ${i}` : null,
    startDate: '2024-01-01',
    endDate: i % 2 === 0 ? '2024-06-01' : null,
  }))

  return {
    rankProgress: ranks,
    completedMeritBadges: completedBadges,
    partialMeritBadges: [],
    leadershipHistory,
    includeActivities: options.includeActivities ?? false,
  }
}

/**
 * Create a fresh copy of any scoutbook fixture
 */
export function createScoutbookFixture<T>(fixture: T): T {
  return JSON.parse(JSON.stringify(fixture))
}

/**
 * Create a fixture with overrides
 */
export function createScoutbookFixtureWith<T>(fixture: T, overrides: Partial<T>): T {
  return { ...createScoutbookFixture(fixture), ...overrides }
}
