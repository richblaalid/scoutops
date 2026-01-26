/**
 * Types for Scoutbook Troop Advancement Import
 *
 * These types represent the parsed and staged data from a Scoutbook
 * "Troop Advancement" CSV export.
 */

// ============================================
// Parsed CSV Types
// ============================================

/**
 * A single row parsed from the CSV
 */
export interface ParsedAdvancementRow {
  bsaMemberId: string
  firstName: string
  middleName: string
  lastName: string
  advancementType: string
  advancement: string // The requirement number or item name
  version: string
  awarded: boolean // Column 9: "1" = awarded
  dateCompleted: string | null
  approved: boolean
  markedCompletedDate: string | null
  awardedDate: string | null
}

/**
 * Classification of advancement type from the CSV
 */
export type AdvancementCategory =
  | 'rank' // "Rank" type - rank completion
  | 'merit_badge' // "Merit Badges" type - badge completion
  | 'rank_requirement' // "[Rank Name] Rank Requirements" - rank req
  | 'merit_badge_requirement' // "[Badge] Merit Badge Requirements" - badge req
  | 'other' // Awards, palms, etc. - not imported

/**
 * Parsed rank data for a scout
 */
export interface ParsedScoutRank {
  rankName: string // e.g., "Tenderfoot Rank"
  rankCode: string // e.g., "tenderfoot"
  version: string
  awarded: boolean
  awardedDate: string | null
}

/**
 * Parsed rank requirement
 */
export interface ParsedScoutRankRequirement {
  rankCode: string
  requirementNumber: string // e.g., "1a", "2b", "3"
  version: string
  completed: boolean
  completedDate: string | null
}

/**
 * Parsed merit badge data for a scout
 */
export interface ParsedScoutMeritBadge {
  badgeName: string // e.g., "Camping MB"
  normalizedName: string // e.g., "camping"
  version: string
  awarded: boolean
  awardedDate: string | null
}

/**
 * Parsed merit badge requirement
 */
export interface ParsedScoutMeritBadgeRequirement {
  badgeName: string // Original badge name from CSV
  normalizedName: string
  requirementNumber: string // e.g., "1a", "2b", "3"
  version: string
  completed: boolean
  completedDate: string | null
}

/**
 * All parsed advancement data for a single scout
 */
export interface ParsedScoutAdvancement {
  bsaMemberId: string
  firstName: string
  middleName: string
  lastName: string
  ranks: ParsedScoutRank[]
  rankRequirements: ParsedScoutRankRequirement[]
  meritBadges: ParsedScoutMeritBadge[]
  meritBadgeRequirements: ParsedScoutMeritBadgeRequirement[]
}

/**
 * Result of parsing the entire CSV file
 */
export interface ParsedTroopAdvancement {
  scouts: Map<string, ParsedScoutAdvancement>
  summary: {
    totalRows: number
    scoutCount: number
    rankCount: number
    rankRequirementCount: number
    badgeCount: number
    badgeRequirementCount: number
    skippedRows: number
  }
  errors: string[]
}

// ============================================
// Staged Import Types
// ============================================

/**
 * A staged change ready to be imported
 */
export interface StagedChange {
  type: 'rank' | 'rank_requirement' | 'merit_badge' | 'merit_badge_requirement'
  name: string // Display name
  code: string // Normalized code/name for matching
  requirementNumber?: string
  version: string
  date: string | null
  status: 'new' | 'duplicate' | 'update'
  existingId?: string // ID if already exists
}

/**
 * Staged advancement data for a single scout
 */
export interface StagedScoutAdvancement {
  bsaMemberId: string
  firstName: string
  lastName: string
  fullName: string
  scoutId: string | null // null if unmatched
  matchStatus: 'matched' | 'unmatched'
  ranks: StagedChange[]
  rankRequirements: StagedChange[]
  meritBadges: StagedChange[]
  meritBadgeRequirements: StagedChange[]
  summary: {
    newItems: number
    duplicates: number
    updates: number
  }
}

/**
 * Complete staged data for the import
 */
export interface StagedTroopAdvancement {
  scouts: StagedScoutAdvancement[]
  summary: {
    totalScouts: number
    matchedScouts: number
    unmatchedScouts: number
    newRanks: number
    newRankRequirements: number
    newMeritBadges: number
    newMeritBadgeRequirements: number
    duplicates: number
    updates: number
  }
  errors: string[]
  warnings: string[]
}

// ============================================
// Import Result Types
// ============================================

export interface ImportWarning {
  type: 'version_fallback' | 'requirement_not_found' | 'version_mismatch' | 'scout_not_found'
  scout?: string
  badge?: string
  rank?: string
  requirement?: string
  message: string
  requestedVersion?: number
  usedVersion?: number
}

export interface TroopAdvancementImportResult {
  scoutsCreated: number
  ranksImported: number
  rankRequirementsImported: number
  badgesImported: number
  badgeRequirementsImported: number
  duplicatesSkipped: number
  warnings: ImportWarning[]
}
