import { describe, it, expect } from 'vitest'
import {
  scoutbookToDisplayFormat,
  displayToScoutbookFormat,
  normalizeToScoutbook,
  extractBaseNumber,
  extractOptionLetter,
  isOptionRequirement,
  getParentRequirementNumber,
  calculateNestingDepth,
  compareRequirementNumbers,
  parseRequirementNumber,
} from '@/lib/format/requirement-number'

describe('requirement-number format conversion', () => {
  describe('scoutbookToDisplayFormat', () => {
    it('handles simple numbers', () => {
      expect(scoutbookToDisplayFormat('1')).toBe('1')
      expect(scoutbookToDisplayFormat('2')).toBe('2')
      expect(scoutbookToDisplayFormat('10')).toBe('10')
    })

    it('handles simple letters', () => {
      expect(scoutbookToDisplayFormat('1a')).toBe('1a')
      expect(scoutbookToDisplayFormat('4f')).toBe('4f')
    })

    it('handles Option A/B format', () => {
      expect(scoutbookToDisplayFormat('6A')).toBe('6A')
      expect(scoutbookToDisplayFormat('6B')).toBe('6B')
    })

    it('handles parenthetical sub-requirements', () => {
      expect(scoutbookToDisplayFormat('9b(2)')).toBe('9b2')
      expect(scoutbookToDisplayFormat('5a(1)')).toBe('5a1')
    })

    it('handles Option A/B with nested parentheticals', () => {
      expect(scoutbookToDisplayFormat('6A(a)')).toBe('6Aa')
      expect(scoutbookToDisplayFormat('6A(a)(1)')).toBe('6Aa1')
      expect(scoutbookToDisplayFormat('6B(b)(3)')).toBe('6Bb3')
    })

    it('handles empty/null input', () => {
      expect(scoutbookToDisplayFormat('')).toBe('')
    })
  })

  describe('displayToScoutbookFormat', () => {
    it('handles simple numbers', () => {
      expect(displayToScoutbookFormat('1')).toBe('1')
      expect(displayToScoutbookFormat('10')).toBe('10')
    })

    it('handles simple letters', () => {
      expect(displayToScoutbookFormat('1a')).toBe('1a')
      expect(displayToScoutbookFormat('4f')).toBe('4f')
    })

    it('handles Option A/B format', () => {
      expect(displayToScoutbookFormat('6A')).toBe('6A')
      expect(displayToScoutbookFormat('6B')).toBe('6B')
    })

    it('handles simple sub-requirements', () => {
      expect(displayToScoutbookFormat('9b2')).toBe('9b(2)')
      expect(displayToScoutbookFormat('5a1')).toBe('5a(1)')
    })

    it('handles Option A/B with nesting', () => {
      expect(displayToScoutbookFormat('6A1')).toBe('6A(1)')
      expect(displayToScoutbookFormat('6A1a')).toBe('6A(a)(1)')
      expect(displayToScoutbookFormat('6B3')).toBe('6B(3)')
    })
  })

  describe('extractBaseNumber', () => {
    it('extracts base number from various formats', () => {
      expect(extractBaseNumber('1')).toBe('1')
      expect(extractBaseNumber('1a')).toBe('1')
      expect(extractBaseNumber('6A')).toBe('6')
      expect(extractBaseNumber('6A(a)(1)')).toBe('6')
      expect(extractBaseNumber('9b(2)')).toBe('9')
      expect(extractBaseNumber('10')).toBe('10')
    })
  })

  describe('extractOptionLetter', () => {
    it('returns option letter for Option badges', () => {
      expect(extractOptionLetter('6A')).toBe('A')
      expect(extractOptionLetter('6B')).toBe('B')
      expect(extractOptionLetter('6A(a)(1)')).toBe('A')
    })

    it('returns null for non-Option requirements', () => {
      expect(extractOptionLetter('1')).toBeNull()
      expect(extractOptionLetter('1a')).toBeNull()
      expect(extractOptionLetter('9b(2)')).toBeNull()
    })
  })

  describe('isOptionRequirement', () => {
    it('identifies Option requirements', () => {
      expect(isOptionRequirement('6A')).toBe(true)
      expect(isOptionRequirement('6B(b)(3)')).toBe(true)
    })

    it('identifies non-Option requirements', () => {
      expect(isOptionRequirement('1')).toBe(false)
      expect(isOptionRequirement('1a')).toBe(false)
      expect(isOptionRequirement('9b(2)')).toBe(false)
    })
  })

  describe('getParentRequirementNumber', () => {
    it('returns parent for nested requirements', () => {
      expect(getParentRequirementNumber('6A(a)(1)')).toBe('6A(a)')
      expect(getParentRequirementNumber('6A(a)')).toBe('6A')
      expect(getParentRequirementNumber('6A')).toBe('6')
      expect(getParentRequirementNumber('9b(2)')).toBe('9b')
      expect(getParentRequirementNumber('9b')).toBe('9')
      expect(getParentRequirementNumber('1a')).toBe('1')
    })

    it('returns null for top-level requirements', () => {
      expect(getParentRequirementNumber('1')).toBeNull()
      expect(getParentRequirementNumber('6')).toBeNull()
    })
  })

  describe('calculateNestingDepth', () => {
    it('calculates depth correctly', () => {
      expect(calculateNestingDepth('1')).toBe(0)
      expect(calculateNestingDepth('1a')).toBe(1)
      expect(calculateNestingDepth('6A')).toBe(1)
      expect(calculateNestingDepth('6A(a)')).toBe(2)
      expect(calculateNestingDepth('6A(a)(1)')).toBe(3)
      expect(calculateNestingDepth('9b(2)')).toBe(2)
    })
  })

  describe('compareRequirementNumbers', () => {
    it('sorts by base number first', () => {
      expect(compareRequirementNumbers('1', '2')).toBeLessThan(0)
      expect(compareRequirementNumbers('2', '1')).toBeGreaterThan(0)
      expect(compareRequirementNumbers('9', '10')).toBeLessThan(0)
    })

    it('sorts options A before B', () => {
      expect(compareRequirementNumbers('6A', '6B')).toBeLessThan(0)
      expect(compareRequirementNumbers('6B', '6A')).toBeGreaterThan(0)
    })

    it('sorts nested requirements correctly', () => {
      expect(compareRequirementNumbers('6A(a)', '6A(b)')).toBeLessThan(0)
      expect(compareRequirementNumbers('6A(a)(1)', '6A(a)(2)')).toBeLessThan(0)
    })
  })

  describe('parseRequirementNumber', () => {
    it('parses simple requirements', () => {
      const result = parseRequirementNumber('1')
      expect(result.baseNumber).toBe('1')
      expect(result.optionLetter).toBeNull()
      expect(result.subRequirements).toEqual([])
      expect(result.depth).toBe(0)
    })

    it('parses simple letter requirements', () => {
      const result = parseRequirementNumber('1a')
      expect(result.baseNumber).toBe('1')
      expect(result.optionLetter).toBeNull()
      expect(result.subRequirements).toEqual(['a'])
      expect(result.depth).toBe(1)
    })

    it('parses Option requirements', () => {
      const result = parseRequirementNumber('6A')
      expect(result.baseNumber).toBe('6')
      expect(result.optionLetter).toBe('A')
      expect(result.subRequirements).toEqual([])
      expect(result.depth).toBe(1)
    })

    it('parses deeply nested Option requirements', () => {
      const result = parseRequirementNumber('6A(a)(1)')
      expect(result.baseNumber).toBe('6')
      expect(result.optionLetter).toBe('A')
      expect(result.subRequirements).toEqual(['a', '1'])
      expect(result.depth).toBe(3)
    })

    it('parses parenthetical sub-requirements', () => {
      const result = parseRequirementNumber('9b(2)')
      expect(result.baseNumber).toBe('9')
      expect(result.optionLetter).toBeNull()
      expect(result.subRequirements).toEqual(['2'])
      expect(result.depth).toBe(2)
    })
  })

  describe('normalizeToScoutbook', () => {
    it('passes through already-formatted Scoutbook numbers', () => {
      expect(normalizeToScoutbook('6A(a)(1)')).toBe('6A(a)(1)')
      expect(normalizeToScoutbook('9b(2)')).toBe('9b(2)')
    })

    it('converts display format to Scoutbook format', () => {
      expect(normalizeToScoutbook('9b2')).toBe('9b(2)')
      expect(normalizeToScoutbook('6A1')).toBe('6A(1)')
    })

    it('handles simple formats unchanged', () => {
      expect(normalizeToScoutbook('1')).toBe('1')
      expect(normalizeToScoutbook('1a')).toBe('1a')
    })

    it('trims whitespace', () => {
      expect(normalizeToScoutbook('  6A(a)(1)  ')).toBe('6A(a)(1)')
    })
  })
})
