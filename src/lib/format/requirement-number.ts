/**
 * Requirement Number Format Conversion
 *
 * Converts between Scoutbook's parenthetical format and our internal DB format.
 *
 * Scoutbook Format Examples:
 * - Simple: "1", "2", "3"
 * - With letter: "1a", "1b", "4f"
 * - With parenthetical sub-requirement: "9b(2)", "5a(1)"
 * - Option A/B with nesting: "6A(a)(1)", "6B(b)(3)"
 *
 * DB Format (legacy, for display purposes):
 * - Simple: "1", "2", "3"
 * - With letter: "1a", "1b", "4f"
 * - With numbered sub: "9b2", "5a1"
 * - Option A/B with nesting: "6A1a", "6B3b"
 *
 * CANONICAL FORMAT: Scoutbook parenthetical format is now canonical.
 * These functions help with display and legacy data migration.
 */

/**
 * Convert Scoutbook format to DB format (for display/legacy compatibility)
 *
 * Examples:
 * - "6A(a)(1)" -> "6A1a" (note: flipped order for display)
 * - "9b(2)" -> "9b2"
 * - "1a" -> "1a"
 * - "1" -> "1"
 */
export function scoutbookToDisplayFormat(scoutbook: string): string {
  if (!scoutbook) return ''

  // Pattern: base + optional parenthetical groups
  // Examples: "6A", "6A(a)", "6A(a)(1)", "9b(2)"
  const match = scoutbook.match(/^(\d+[A-Za-z]?)(.*)$/)
  if (!match) return scoutbook

  const [, base, rest] = match

  if (!rest) {
    return base
  }

  // Extract all parenthetical groups
  const groups = rest.match(/\(([^)]+)\)/g)
  if (!groups) return base

  // Convert each group - remove parens and concatenate
  // Note: For Option A/B badges, Scoutbook uses (a)(1) but we display as 1a
  // This is intentional for readability
  const converted = groups.map((g) => g.replace(/[()]/g, ''))

  return base + converted.join('')
}

/**
 * Convert display/DB format to Scoutbook format
 *
 * Examples:
 * - "6A1a" -> "6A(1)(a)" (note: we can't perfectly reverse this)
 * - "9b2" -> "9b(2)"
 * - "1a" -> "1a"
 * - "1" -> "1"
 *
 * This is a best-effort conversion. For ambiguous cases like "6A1a",
 * we can't know if it should be "6A(1)(a)" or "6A(a)(1)".
 * Use the scoutbook_requirement_number column for accurate matching.
 */
export function displayToScoutbookFormat(display: string): string {
  if (!display) return ''

  // Pattern: number + optional letter + optional nested parts
  // "6A" - just option
  // "6A1" - option + sub-req number
  // "6A1a" - option + sub-req number + detail letter
  // "9b2" - base + letter + number

  // Try to match patterns from most specific to least
  // Pattern 1: Option badge with full nesting: 6A1a, 6B2c
  const optionMatch = display.match(/^(\d+)([A-Z])(\d+)([a-z])?$/)
  if (optionMatch) {
    const [, num, option, subNum, detail] = optionMatch
    if (detail) {
      return `${num}${option}(${detail})(${subNum})`
    }
    return `${num}${option}(${subNum})`
  }

  // Pattern 2: Simple with numbered sub-req: 9b2, 5a1
  const simpleSubMatch = display.match(/^(\d+)([a-z])(\d+)$/)
  if (simpleSubMatch) {
    const [, num, letter, subNum] = simpleSubMatch
    return `${num}${letter}(${subNum})`
  }

  // Pattern 3: Base with letter only: 1a, 4f, 6A
  // No conversion needed
  return display
}

/**
 * Normalize a requirement number to Scoutbook canonical format
 *
 * Handles various input formats and normalizes to Scoutbook style.
 * Useful for import matching.
 */
export function normalizeToScoutbook(input: string): string {
  if (!input) return ''

  // If already has parentheses, assume it's Scoutbook format
  if (input.includes('(')) {
    return input.trim()
  }

  // Otherwise try to convert from display format
  return displayToScoutbookFormat(input.trim())
}

/**
 * Extract the base requirement number (top-level number only)
 *
 * Examples:
 * - "6A(a)(1)" -> "6"
 * - "9b(2)" -> "9"
 * - "1a" -> "1"
 */
export function extractBaseNumber(requirementNumber: string): string {
  const match = requirementNumber.match(/^(\d+)/)
  return match ? match[1] : requirementNumber
}

/**
 * Extract the option letter if present (A, B, C for Option badges)
 *
 * Examples:
 * - "6A(a)(1)" -> "A"
 * - "6B" -> "B"
 * - "9b(2)" -> null (not an option, just a sub-requirement)
 */
export function extractOptionLetter(requirementNumber: string): string | null {
  // Option letters are uppercase immediately after the number
  const match = requirementNumber.match(/^\d+([A-Z])/)
  return match ? match[1] : null
}

/**
 * Check if a requirement number indicates an Option A/B style requirement
 */
export function isOptionRequirement(requirementNumber: string): boolean {
  return extractOptionLetter(requirementNumber) !== null
}

/**
 * Get the parent requirement number for a sub-requirement
 *
 * Examples:
 * - "6A(a)(1)" -> "6A(a)"
 * - "6A(a)" -> "6A"
 * - "6A" -> "6"
 * - "9b(2)" -> "9b"
 * - "9b" -> "9"
 * - "1a" -> "1"
 * - "1" -> null
 */
export function getParentRequirementNumber(requirementNumber: string): string | null {
  if (!requirementNumber) return null

  // If has parenthetical groups, remove the last one
  const lastParenMatch = requirementNumber.match(/^(.+)\([^)]+\)$/)
  if (lastParenMatch) {
    return lastParenMatch[1]
  }

  // If ends with lowercase letter after a number (like "9b" or "1a")
  const lowerLetterMatch = requirementNumber.match(/^(\d+)[a-z]$/)
  if (lowerLetterMatch) {
    return lowerLetterMatch[1]
  }

  // If ends with lowercase letter after uppercase (like "6Aa" in display format)
  const optionWithLetterMatch = requirementNumber.match(/^(.+[0-9A-Z])([a-z])$/)
  if (optionWithLetterMatch) {
    return optionWithLetterMatch[1]
  }

  // If ends with uppercase letter (Option), parent is the number
  const optionMatch = requirementNumber.match(/^(\d+)[A-Z]$/)
  if (optionMatch) {
    return optionMatch[1]
  }

  // If it's just a number, no parent
  if (/^\d+$/.test(requirementNumber)) {
    return null
  }

  return null
}

/**
 * Calculate nesting depth for a requirement number
 *
 * Examples:
 * - "1" -> 0
 * - "1a" -> 1
 * - "6A" -> 1
 * - "6A(a)" -> 2
 * - "6A(a)(1)" -> 3
 * - "9b(2)" -> 2
 */
export function calculateNestingDepth(requirementNumber: string): number {
  if (!requirementNumber) return 0

  let depth = 0

  // Count base number as depth 0
  // Each subsequent component adds depth

  // Check for Option letter (A, B, C)
  if (/^\d+[A-Z]/.test(requirementNumber)) {
    depth++
  } else if (/^\d+[a-z]/.test(requirementNumber)) {
    // Check for simple letter suffix (1a, 1b)
    depth++
  }

  // Count parenthetical groups
  const parenGroups = requirementNumber.match(/\([^)]+\)/g)
  if (parenGroups) {
    depth += parenGroups.length
  }

  return depth
}

/**
 * Compare two requirement numbers for sorting
 * Returns negative if a comes before b, positive if after, 0 if equal
 */
export function compareRequirementNumbers(a: string, b: string): number {
  // Extract components for comparison
  const parseReq = (r: string) => {
    const base = parseInt(extractBaseNumber(r), 10) || 0
    const option = extractOptionLetter(r) || ''
    // For sorting, we want to compare the full string after the base
    const rest = r.replace(/^\d+/, '')
    return { base, option, rest, full: r }
  }

  const pa = parseReq(a)
  const pb = parseReq(b)

  // Compare base numbers first
  if (pa.base !== pb.base) {
    return pa.base - pb.base
  }

  // Then compare options (A before B, etc.)
  if (pa.option !== pb.option) {
    return pa.option.localeCompare(pb.option)
  }

  // Finally compare the rest lexically
  return pa.rest.localeCompare(pb.rest)
}

/**
 * Parse a Scoutbook requirement number into its components
 *
 * Useful for building parent relationships and understanding structure.
 */
export interface RequirementComponents {
  baseNumber: string
  optionLetter: string | null
  subRequirements: string[]
  depth: number
  original: string
}

export function parseRequirementNumber(requirementNumber: string): RequirementComponents {
  const baseNumber = extractBaseNumber(requirementNumber)
  const optionLetter = extractOptionLetter(requirementNumber)

  // Extract sub-requirements from parenthetical groups
  const subRequirements: string[] = []
  const parenMatches = requirementNumber.match(/\(([^)]+)\)/g)
  if (parenMatches) {
    parenMatches.forEach((m) => {
      subRequirements.push(m.replace(/[()]/g, ''))
    })
  } else {
    // Check for simple letter suffix that's not an option
    const simpleMatch = requirementNumber.match(/^\d+([a-z])$/)
    if (simpleMatch) {
      subRequirements.push(simpleMatch[1])
    }
  }

  return {
    baseNumber,
    optionLetter,
    subRequirements,
    depth: calculateNestingDepth(requirementNumber),
    original: requirementNumber,
  }
}
