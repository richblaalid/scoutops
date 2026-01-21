/**
 * ScoutBook History CSV Parser
 *
 * Parses the semi-structured "Scouts BSA History Report" CSV export from ScoutBook.
 * This is NOT a standard CSV - it has multiple sections with different formats.
 *
 * Sections:
 * - Header (lines 1-5): Report metadata, scout name, BSA ID, rank, positions
 * - Rank sections: Scout, Tenderfoot, Second Class, First Class, Star, Life, Eagle
 *   Each has requirements with completion dates or "__________" for incomplete
 * - Completed Merit Badges: Badge name + completion date
 * - Leadership: Position name, start date, end date
 * - Order of the Arrow: Member info (usually empty)
 * - Activities: Service hours, hiking miles, camping nights
 * - Training Courses Completed
 * - Awards
 * - Partial Merit Badges: In-progress badges with completed requirements + version info
 */

// ============================================
// Types
// ============================================

export interface ScoutbookScoutInfo {
  fullName: string
  firstName: string
  lastName: string
  unit: string
  birthdate: string | null
  dateJoined: string | null
  currentRank: string | null
  currentRankDate: string | null
  bsaId: string | null
  positions: string[]
}

export interface ParsedRankProgress {
  rankCode: string
  rankName: string
  completedDate: string | null
  requirements: ParsedRankRequirement[]
}

export interface ParsedRankRequirement {
  requirementNumber: string
  description: string
  completedDate: string | null
}

export interface ParsedMeritBadge {
  name: string
  normalizedName: string
  startDate: string | null
  completedDate: string | null
  isComplete: boolean
  completedRequirements: string[]
  version: string | null
}

export interface ParsedLeadershipPosition {
  name: string
  patrol: string | null
  startDate: string | null
  endDate: string | null
}

export interface ParsedActivities {
  serviceHours: number
  hikingMiles: number
  campingNights: number
}

export interface ParsedScoutbookHistory {
  scout: ScoutbookScoutInfo
  rankProgress: ParsedRankProgress[]
  completedMeritBadges: ParsedMeritBadge[]
  partialMeritBadges: ParsedMeritBadge[]
  leadershipHistory: ParsedLeadershipPosition[]
  activities: ParsedActivities
  errors: string[]
}

// ============================================
// Constants
// ============================================

// Rank codes for matching section headers
const RANK_ORDER = ['scout', 'tenderfoot', 'second_class', 'first_class', 'star', 'life', 'eagle'] as const

type RankCode = (typeof RANK_ORDER)[number]

const RANK_NAME_TO_CODE: Record<string, RankCode> = {
  scout: 'scout',
  tenderfoot: 'tenderfoot',
  'second class': 'second_class',
  'first class': 'first_class',
  star: 'star',
  life: 'life',
  eagle: 'eagle',
}

// Badge name normalization map - handles ScoutBook abbreviations
const BADGE_NAME_MAP: Record<string, string> = {
  // Common abbreviations in ScoutBook
  'enviro. science': 'environmental_science',
  'enviro. science #': 'environmental_science',
  'environmental science #': 'environmental_science',
  'environmental science': 'environmental_science',
  'cit. in comm.': 'citizenship_in_community',
  'cit. in comm. #': 'citizenship_in_community',
  'citizenship in community #': 'citizenship_in_community',
  'citizenship in community': 'citizenship_in_community',
  'cit. in nation': 'citizenship_in_nation',
  'cit. in nation #': 'citizenship_in_nation',
  'citizenship in nation #': 'citizenship_in_nation',
  'citizenship in nation': 'citizenship_in_nation',
  'cit. in world': 'citizenship_in_world',
  'cit. in world #': 'citizenship_in_world',
  'citizenship in world #': 'citizenship_in_world',
  'citizenship in world': 'citizenship_in_world',
  'citizenship in society #': 'citizenship_in_society',
  'citizenship in society': 'citizenship_in_society',
  'pers. fitness': 'personal_fitness',
  'pers. fitness #': 'personal_fitness',
  'personal fitness #': 'personal_fitness',
  'personal fitness': 'personal_fitness',
  'personal mgmt.': 'personal_management',
  'personal mgmt. #': 'personal_management',
  'personal management #': 'personal_management',
  'personal management': 'personal_management',
  'first aid': 'first_aid',
  'first aid #': 'first_aid',
  communication: 'communication',
  'communication #': 'communication',
  cooking: 'cooking',
  'cooking #': 'cooking',
  camping: 'camping',
  'camping #': 'camping',
  'family life': 'family_life',
  'family life #': 'family_life',
  swimming: 'swimming',
  'swimming #': 'swimming',
  hiking: 'hiking',
  'hiking #': 'hiking',
  'emergency preparedness': 'emergency_preparedness',
  'emergency preparedness #': 'emergency_preparedness',
  lifesaving: 'lifesaving',
  'lifesaving #': 'lifesaving',
  fingerprinting: 'fingerprinting',
  nature: 'nature',
  geocaching: 'geocaching',
  cycling: 'cycling',
  'cycling #': 'cycling',
}

// Parser state machine states
type ParserSection =
  | 'header'
  | 'rank_scout'
  | 'rank_tenderfoot'
  | 'rank_second_class'
  | 'rank_first_class'
  | 'rank_star'
  | 'rank_life'
  | 'rank_eagle'
  | 'completed_badges'
  | 'leadership'
  | 'order_of_arrow'
  | 'activities'
  | 'training'
  | 'awards'
  | 'partial_badges'
  | 'unknown'

// ============================================
// Parsing Utilities
// ============================================

/**
 * Parse a CSV line handling quoted fields with commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

/**
 * Parse date from MM/DD/YYYY format to YYYY-MM-DD
 */
function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.includes('__')) return null

  // Match MM/DD/YYYY pattern
  const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!match) return null

  const [, month, day, year] = match
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

/**
 * Extract date from a string that may contain other text
 * e.g., "Tenderfoot(12/01/2025)" -> "2025-12-01"
 */
function extractDate(str: string): string | null {
  if (!str) return null
  const match = str.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)
  return match ? parseDate(match[1]) : null
}

/**
 * Normalize badge name to a consistent format
 */
function normalizeBadgeName(name: string): string {
  const cleaned = name.toLowerCase().trim()
  return BADGE_NAME_MAP[cleaned] || cleaned.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

/**
 * Parse rank name from a line that looks like "Scout,,"04/14/2025""
 */
function parseRankHeader(line: string): { name: string; date: string | null } | null {
  const parts = parseCSVLine(line)
  if (parts.length < 1) return null

  const name = parts[0].toLowerCase().trim()
  // Date is typically in the 3rd column
  const date = parts.length > 2 ? parseDate(parts[2]) : null

  if (Object.keys(RANK_NAME_TO_CODE).includes(name)) {
    return { name, date }
  }
  return null
}

/**
 * Detect which section a line belongs to based on its content
 */
function detectSection(line: string, currentSection: ParserSection): ParserSection {
  const lower = line.toLowerCase()
  const parts = parseCSVLine(line)
  const firstPart = parts[0]?.toLowerCase() || ''

  // Check for rank section headers
  if (firstPart === 'scout' && !lower.includes('scouts bsa')) {
    return 'rank_scout'
  }
  if (firstPart === 'tenderfoot') {
    return 'rank_tenderfoot'
  }
  if (firstPart === 'second class') {
    return 'rank_second_class'
  }
  if (firstPart === 'first class') {
    return 'rank_first_class'
  }
  if (firstPart === 'star') {
    return 'rank_star'
  }
  if (firstPart === 'life') {
    return 'rank_life'
  }
  if (firstPart === 'eagle') {
    return 'rank_eagle'
  }

  // Check for other sections
  if (lower.includes('completed merit badges')) {
    return 'completed_badges'
  }
  if (lower.includes('leadership') && lower.includes('start date')) {
    return 'leadership'
  }
  if (lower.includes('order of the arrow')) {
    return 'order_of_arrow'
  }
  if (lower.includes('activities')) {
    return 'activities'
  }
  if (lower.includes('training courses')) {
    return 'training'
  }
  if (lower.includes('awards')) {
    return 'awards'
  }
  if (lower.includes('partial merit badges')) {
    return 'partial_badges'
  }

  return currentSection
}

// ============================================
// Main Parser
// ============================================

/**
 * Parse ScoutBook history CSV content
 */
export function parseScoutbookHistory(content: string): ParsedScoutbookHistory {
  const lines = content.split('\n').map((l) => l.trim())
  const errors: string[] = []

  // Initialize result
  const result: ParsedScoutbookHistory = {
    scout: {
      fullName: '',
      firstName: '',
      lastName: '',
      unit: '',
      birthdate: null,
      dateJoined: null,
      currentRank: null,
      currentRankDate: null,
      bsaId: null,
      positions: [],
    },
    rankProgress: [],
    completedMeritBadges: [],
    partialMeritBadges: [],
    leadershipHistory: [],
    activities: {
      serviceHours: 0,
      hikingMiles: 0,
      campingNights: 0,
    },
    errors,
  }

  let currentSection: ParserSection = 'header'
  let currentRankProgress: ParsedRankProgress | null = null
  let currentPartialBadge: ParsedMeritBadge | null = null
  let lineIndex = 0

  // Helper to save current rank progress
  const saveCurrentRank = () => {
    if (currentRankProgress) {
      result.rankProgress.push(currentRankProgress)
      currentRankProgress = null
    }
  }

  // Helper to save current partial badge
  const saveCurrentPartialBadge = () => {
    if (currentPartialBadge) {
      result.partialMeritBadges.push(currentPartialBadge)
      currentPartialBadge = null
    }
  }

  for (const line of lines) {
    lineIndex++

    // Skip empty lines
    if (!line || line === ',' || line === ',,' || line === '""') {
      continue
    }

    // Detect section changes
    const newSection = detectSection(line, currentSection)
    if (newSection !== currentSection) {
      // Save any pending data before switching sections
      saveCurrentRank()
      saveCurrentPartialBadge()
      currentSection = newSection
    }

    try {
      switch (currentSection) {
        case 'header':
          parseHeaderLine(line, lineIndex, result.scout)
          break

        case 'rank_scout':
        case 'rank_tenderfoot':
        case 'rank_second_class':
        case 'rank_first_class':
        case 'rank_star':
        case 'rank_life':
        case 'rank_eagle': {
          const rankCode = currentSection.replace('rank_', '') as RankCode
          const parsed = parseRankLine(line, rankCode, currentRankProgress)
          if (parsed.isHeader) {
            // This is the rank header line
            currentRankProgress = {
              rankCode,
              rankName: parsed.rankName || rankCode,
              completedDate: parsed.completedDate || null,
              requirements: [],
            }
          } else if (parsed.requirement && currentRankProgress) {
            currentRankProgress.requirements.push(parsed.requirement)
          }
          break
        }

        case 'completed_badges':
          if (!line.toLowerCase().includes('completed merit badges')) {
            const badge = parseCompletedBadgeLine(line)
            if (badge) {
              result.completedMeritBadges.push(badge)
            }
          }
          break

        case 'leadership':
          if (!line.toLowerCase().includes('start date')) {
            const position = parseLeadershipLine(line)
            if (position) {
              result.leadershipHistory.push(position)
            }
          }
          break

        case 'activities':
          parseActivityLine(line, result.activities)
          break

        case 'partial_badges':
          if (!line.toLowerCase().includes('partial merit badges')) {
            const partialResult = parsePartialBadgeLine(line, currentPartialBadge)
            if (partialResult.isNewBadge) {
              saveCurrentPartialBadge()
              currentPartialBadge = partialResult.badge || null
            } else if (partialResult.requirements && currentPartialBadge) {
              currentPartialBadge.completedRequirements = partialResult.requirements
              currentPartialBadge.version = partialResult.version || null
            }
          }
          break

        default:
          // Skip unknown sections
          break
      }
    } catch (err) {
      errors.push(`Error parsing line ${lineIndex}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Save any pending data
  saveCurrentRank()
  saveCurrentPartialBadge()

  return result
}

// ============================================
// Section Parsers
// ============================================

/**
 * Parse header section lines (first ~5 lines)
 */
function parseHeaderLine(line: string, lineIndex: number, scout: ScoutbookScoutInfo): void {
  const parts = parseCSVLine(line)

  // Line 3: Scout name and unit - "Ben Blaalid Troop 9297 BOYS"
  if (lineIndex === 3) {
    const nameMatch = line.match(/"([^"]+)"/) || [null, line]
    const fullText = nameMatch[1] || line

    // Extract unit info (Troop/Pack/Crew followed by number)
    const unitMatch = fullText.match(/(Troop|Pack|Crew|Ship)\s+(\d+[A-Z]?)\s*(BOYS|GIRLS)?/i)
    if (unitMatch) {
      scout.unit = `${unitMatch[1]} ${unitMatch[2]}${unitMatch[3] ? ' ' + unitMatch[3] : ''}`
      // Name is everything before the unit
      const namePart = fullText.substring(0, fullText.indexOf(unitMatch[0])).trim()
      scout.fullName = namePart
      const nameParts = namePart.split(/\s+/)
      scout.firstName = nameParts[0] || ''
      scout.lastName = nameParts.slice(1).join(' ') || ''
    } else {
      scout.fullName = fullText
      const nameParts = fullText.split(/\s+/)
      scout.firstName = nameParts[0] || ''
      scout.lastName = nameParts.slice(1).join(' ') || ''
    }
  }

  // Line 4: Birthdate, Date Joined, Rank
  if (lineIndex === 4) {
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].toLowerCase()
      const nextPart = parts[i + 1]

      if (part === 'birthdate:' && nextPart) {
        scout.birthdate = parseDate(nextPart)
      }
      if (part === 'date joined scouts bsa:' && nextPart) {
        scout.dateJoined = parseDate(nextPart)
      }
      if (part === 'rank:' && nextPart) {
        // Rank format: "Tenderfoot(12/01/2025)"
        const rankMatch = nextPart.match(/^([^(]+)(?:\(([^)]+)\))?/)
        if (rankMatch) {
          scout.currentRank = rankMatch[1].trim()
          scout.currentRankDate = rankMatch[2] ? parseDate(rankMatch[2]) : null
        }
      }
    }
  }

  // Line 5: BSA ID, Position
  if (lineIndex === 5) {
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].toLowerCase()
      const nextPart = parts[i + 1]

      if (part === 'bsa id:' && nextPart) {
        scout.bsaId = nextPart.trim()
      }
      if (part === 'position:' && nextPart) {
        // Positions are concatenated with dates, e.g. "Patrol Leader09/08/2025 Den Chief09/08/2025"
        const positionMatches = nextPart.match(/([A-Za-z\s]+?)(?:\d{2}\/\d{2}\/\d{4})/g)
        if (positionMatches) {
          scout.positions = positionMatches.map((p) => p.replace(/\d{2}\/\d{2}\/\d{4}/, '').trim())
        }
      }
    }
  }
}

interface RankLineResult {
  isHeader: boolean
  rankName?: string
  completedDate?: string | null
  requirement?: ParsedRankRequirement
}

/**
 * Parse a line in a rank section
 */
function parseRankLine(line: string, rankCode: string, currentProgress: ParsedRankProgress | null): RankLineResult {
  const parts = parseCSVLine(line)
  const firstPart = parts[0]?.toLowerCase() || ''

  // Check if this is a rank header line (e.g., "Scout,,"04/14/2025"")
  if (Object.keys(RANK_NAME_TO_CODE).includes(firstPart)) {
    return {
      isHeader: true,
      rankName: parts[0],
      completedDate: parts.length > 2 ? parseDate(parts[2]) : null,
    }
  }

  // Otherwise it's a requirement line
  // Format: "1a","Scout Oath & Law","03/18/2025"
  // Or for merit badge slots in Star/Life/Eagle: "","Fingerprinting","07/04/2025"
  if (parts.length >= 2) {
    const reqNumber = parts[0]
    const description = parts[1]
    const dateStr = parts[2] || ''
    const completedDate = parseDate(dateStr)

    // Skip empty requirement numbers unless it's a merit badge slot (Star/Life/Eagle)
    if (!reqNumber && !['star', 'life', 'eagle'].includes(rankCode)) {
      return { isHeader: false }
    }

    // Skip if description is "__________" (placeholder for empty merit badge slot)
    if (description === '__________') {
      return { isHeader: false }
    }

    return {
      isHeader: false,
      requirement: {
        requirementNumber: reqNumber || 'MB',
        description,
        completedDate,
      },
    }
  }

  return { isHeader: false }
}

/**
 * Parse a completed merit badge line
 * Format: "Environmental Science #","07/04/2025"
 */
function parseCompletedBadgeLine(line: string): ParsedMeritBadge | null {
  const parts = parseCSVLine(line)

  if (parts.length < 2 || !parts[0]) return null

  const name = parts[0].trim()
  const completedDate = parseDate(parts[1])

  // Skip empty or placeholder lines
  if (!name || name === '__________') return null

  return {
    name,
    normalizedName: normalizeBadgeName(name),
    startDate: null,
    completedDate,
    isComplete: true,
    completedRequirements: [],
    version: null,
  }
}

/**
 * Parse a leadership position line
 * Format: "Assistant Patrol Leader (Blazing Bulls)","03/17/2025","09/07/2025"
 */
function parseLeadershipLine(line: string): ParsedLeadershipPosition | null {
  const parts = parseCSVLine(line)

  if (parts.length < 2 || !parts[0]) return null

  const fullName = parts[0]
  const startDate = parseDate(parts[1])
  const endDate = parts.length > 2 ? parseDate(parts[2]) : null

  // Skip header line
  if (fullName.toLowerCase() === 'leadership') return null

  // Extract patrol name if present: "Patrol Leader (Blazing Bulls)"
  const patrolMatch = fullName.match(/\(([^)]+)\)/)
  const patrol = patrolMatch ? patrolMatch[1] : null
  const name = fullName.replace(/\s*\([^)]+\)\s*$/, '').trim()

  return {
    name,
    patrol,
    startDate,
    endDate,
  }
}

/**
 * Parse an activity line
 * Format: "Total Service Hours","2.50"
 */
function parseActivityLine(line: string, activities: ParsedActivities): void {
  const parts = parseCSVLine(line)
  if (parts.length < 2) return

  const label = parts[0].toLowerCase()
  const value = parseFloat(parts[1]) || 0

  if (label.includes('service hours')) {
    activities.serviceHours = value
  } else if (label.includes('hiking miles')) {
    activities.hikingMiles = value
  } else if (label.includes('camping nights')) {
    activities.campingNights = value
  }
}

interface PartialBadgeResult {
  isNewBadge: boolean
  badge?: ParsedMeritBadge
  requirements?: string[]
  version?: string | null
}

/**
 * Parse a partial merit badge line
 * Two formats:
 * 1. Badge header: "Camping #","10/11/2025"
 * 2. Completed requirements: "Completed Requirements: 9b(2)(2024 Version)"
 */
function parsePartialBadgeLine(line: string, current: ParsedMeritBadge | null): PartialBadgeResult {
  const lower = line.toLowerCase()

  // Check if this is a "Completed Requirements:" line
  if (lower.includes('completed requirements:')) {
    const match = line.match(/Completed Requirements:\s*(.+)$/i)
    if (match) {
      const reqsText = match[1]
      // Extract version if present: "9b(2)(2024 Version)"
      const versionMatch = reqsText.match(/\((\d{4})\s+Version\)/i)
      const version = versionMatch ? versionMatch[1] : null

      // Remove version info and parse requirements
      const cleanedReqs = reqsText.replace(/\(\d{4}\s+Version\)/gi, '')
      const requirements = cleanedReqs.split(/[,\s]+/).filter((r) => r && r !== '(' && r !== ')')

      return {
        isNewBadge: false,
        requirements,
        version,
      }
    }
    return { isNewBadge: false }
  }

  // Otherwise it's a badge header line
  const parts = parseCSVLine(line)
  if (parts.length < 1 || !parts[0]) return { isNewBadge: false }

  const name = parts[0].trim()
  const startDate = parts.length > 1 ? parseDate(parts[1]) : null

  // Skip empty or header lines
  if (!name || name === '__________' || lower.includes('partial merit badges')) {
    return { isNewBadge: false }
  }

  return {
    isNewBadge: true,
    badge: {
      name,
      normalizedName: normalizeBadgeName(name),
      startDate,
      completedDate: null,
      isComplete: false,
      completedRequirements: [],
      version: null,
    },
  }
}

// ============================================
// Validation
// ============================================

/**
 * Validate parsed ScoutBook history data
 */
export function validateScoutbookHistory(data: ParsedScoutbookHistory): string[] {
  const errors: string[] = [...data.errors]

  // Check required scout info
  if (!data.scout.fullName) {
    errors.push('Scout name not found')
  }

  // Check for at least some advancement data
  const hasRankProgress = data.rankProgress.some((r) => r.requirements.length > 0)
  const hasBadges = data.completedMeritBadges.length > 0 || data.partialMeritBadges.length > 0
  const hasLeadership = data.leadershipHistory.length > 0

  if (!hasRankProgress && !hasBadges && !hasLeadership) {
    errors.push('No advancement data found in file')
  }

  return errors
}

/**
 * Get a summary of parsed data for preview
 */
export function getScoutbookHistorySummary(data: ParsedScoutbookHistory): {
  scoutName: string
  currentRank: string | null
  completedRanks: number
  inProgressRanks: number
  completedBadges: number
  inProgressBadges: number
  leadershipPositions: number
  activities: {
    campingNights: number
    serviceHours: number
    hikingMiles: number
  }
} {
  const completedRanks = data.rankProgress.filter((r) => r.completedDate !== null).length
  const inProgressRanks = data.rankProgress.filter(
    (r) => r.completedDate === null && r.requirements.some((req) => req.completedDate !== null)
  ).length

  return {
    scoutName: data.scout.fullName,
    currentRank: data.scout.currentRank,
    completedRanks,
    inProgressRanks,
    completedBadges: data.completedMeritBadges.length,
    inProgressBadges: data.partialMeritBadges.length,
    leadershipPositions: data.leadershipHistory.length,
    activities: {
      campingNights: data.activities.campingNights,
      serviceHours: data.activities.serviceHours,
      hikingMiles: data.activities.hikingMiles,
    },
  }
}
