import { describe, it, expect } from 'vitest'
import {
  MONTHS,
  SCOUT_RANKS,
  PAYMENT_METHODS,
  GUARDIAN_RELATIONSHIPS,
  MEMBER_ROLE_OPTIONS,
  SQUARE,
  parseDateParts,
  formatDateParts,
  getYearOptions,
  getDaysInMonth,
} from '@/lib/constants'

describe('constants', () => {
  describe('MONTHS', () => {
    it('should have 12 months', () => {
      expect(MONTHS).toHaveLength(12)
    })

    it('should have January as first month with value 01', () => {
      expect(MONTHS[0]).toEqual({ value: '01', label: 'January' })
    })

    it('should have December as last month with value 12', () => {
      expect(MONTHS[11]).toEqual({ value: '12', label: 'December' })
    })

    it('should have properly formatted two-digit values', () => {
      MONTHS.forEach((month, index) => {
        const expected = String(index + 1).padStart(2, '0')
        expect(month.value).toBe(expected)
      })
    })
  })

  describe('SCOUT_RANKS', () => {
    it('should have 8 ranks in order of progression', () => {
      expect(SCOUT_RANKS).toHaveLength(8)
      expect(SCOUT_RANKS[0]).toBe('New Scout')
      expect(SCOUT_RANKS[7]).toBe('Eagle')
    })

    it('should have correct rank order', () => {
      expect(SCOUT_RANKS).toEqual([
        'New Scout',
        'Scout',
        'Tenderfoot',
        'Second Class',
        'First Class',
        'Star',
        'Life',
        'Eagle',
      ])
    })
  })

  describe('PAYMENT_METHODS', () => {
    it('should have 4 payment methods', () => {
      expect(PAYMENT_METHODS).toHaveLength(4)
    })

    it('should include cash, check, card, and transfer', () => {
      const values = PAYMENT_METHODS.map(m => m.value)
      expect(values).toContain('cash')
      expect(values).toContain('check')
      expect(values).toContain('card')
      expect(values).toContain('transfer')
    })
  })

  describe('GUARDIAN_RELATIONSHIPS', () => {
    it('should have 4 relationship types', () => {
      expect(GUARDIAN_RELATIONSHIPS).toHaveLength(4)
    })

    it('should include parent, guardian, grandparent, and other', () => {
      const values = GUARDIAN_RELATIONSHIPS.map(r => r.value)
      expect(values).toContain('parent')
      expect(values).toContain('guardian')
      expect(values).toContain('grandparent')
      expect(values).toContain('other')
    })
  })

  describe('MEMBER_ROLE_OPTIONS', () => {
    it('should have 4 role options', () => {
      expect(MEMBER_ROLE_OPTIONS).toHaveLength(4)
    })

    it('should have admin, treasurer, leader, and parent roles', () => {
      const values = MEMBER_ROLE_OPTIONS.map(r => r.value)
      expect(values).toEqual(['admin', 'treasurer', 'leader', 'parent'])
    })

    it('should have descriptions for each role', () => {
      MEMBER_ROLE_OPTIONS.forEach(role => {
        expect(role.description).toBeDefined()
        expect(role.description.length).toBeGreaterThan(0)
      })
    })
  })

  describe('SQUARE', () => {
    it('should have correct fee percentage (2.6%)', () => {
      expect(SQUARE.FEE_PERCENT).toBe(0.026)
    })

    it('should have correct fixed fee (10 cents)', () => {
      expect(SQUARE.FEE_FIXED_CENTS).toBe(10)
    })

    it('should have $1.00 minimum payment', () => {
      expect(SQUARE.MIN_PAYMENT_CENTS).toBe(100)
    })

    it('should have $100,000 maximum payment', () => {
      expect(SQUARE.MAX_PAYMENT_CENTS).toBe(10000000)
    })
  })

  describe('parseDateParts', () => {
    it('should parse valid date string', () => {
      const result = parseDateParts('2024-03-15')
      expect(result).toEqual({ year: '2024', month: '03', day: '15' })
    })

    it('should handle null input', () => {
      const result = parseDateParts(null)
      expect(result).toEqual({ year: '', month: '', day: '' })
    })

    it('should handle undefined input', () => {
      const result = parseDateParts(undefined)
      expect(result).toEqual({ year: '', month: '', day: '' })
    })

    it('should handle empty string', () => {
      const result = parseDateParts('')
      expect(result).toEqual({ year: '', month: '', day: '' })
    })

    it('should handle partial date string (only year)', () => {
      const result = parseDateParts('2024')
      expect(result).toEqual({ year: '2024', month: '', day: '' })
    })

    it('should handle partial date string (year and month)', () => {
      const result = parseDateParts('2024-03')
      expect(result).toEqual({ year: '2024', month: '03', day: '' })
    })

    it('should handle date with single digit month and day', () => {
      const result = parseDateParts('2024-1-5')
      expect(result).toEqual({ year: '2024', month: '1', day: '5' })
    })
  })

  describe('formatDateParts', () => {
    it('should format valid date parts', () => {
      const result = formatDateParts('2024', '3', '15')
      expect(result).toBe('2024-03-15')
    })

    it('should pad single digit month', () => {
      const result = formatDateParts('2024', '3', '15')
      expect(result).toBe('2024-03-15')
    })

    it('should pad single digit day', () => {
      const result = formatDateParts('2024', '12', '5')
      expect(result).toBe('2024-12-05')
    })

    it('should return null if year is empty', () => {
      const result = formatDateParts('', '03', '15')
      expect(result).toBeNull()
    })

    it('should return null if month is empty', () => {
      const result = formatDateParts('2024', '', '15')
      expect(result).toBeNull()
    })

    it('should return null if day is empty', () => {
      const result = formatDateParts('2024', '03', '')
      expect(result).toBeNull()
    })

    it('should return null if all parts are empty', () => {
      const result = formatDateParts('', '', '')
      expect(result).toBeNull()
    })

    it('should handle already padded values', () => {
      const result = formatDateParts('2024', '03', '05')
      expect(result).toBe('2024-03-05')
    })
  })

  describe('getYearOptions', () => {
    it('should return 100 years by default', () => {
      const result = getYearOptions()
      expect(result).toHaveLength(100)
    })

    it('should return specified number of years', () => {
      const result = getYearOptions(50)
      expect(result).toHaveLength(50)
    })

    it('should start with current year', () => {
      const result = getYearOptions()
      const currentYear = new Date().getFullYear()
      expect(result[0]).toBe(currentYear)
    })

    it('should go backwards in time', () => {
      const result = getYearOptions(10)
      const currentYear = new Date().getFullYear()
      expect(result[0]).toBe(currentYear)
      expect(result[9]).toBe(currentYear - 9)
    })

    it('should have all years in descending order', () => {
      const result = getYearOptions(10)
      for (let i = 1; i < result.length; i++) {
        expect(result[i]).toBe(result[i - 1] - 1)
      }
    })
  })

  describe('getDaysInMonth', () => {
    it('should return 31 days for January', () => {
      const result = getDaysInMonth('01', '2024')
      expect(result).toHaveLength(31)
      expect(result[0]).toBe(1)
      expect(result[30]).toBe(31)
    })

    it('should return 28 days for February in non-leap year', () => {
      const result = getDaysInMonth('02', '2023')
      expect(result).toHaveLength(28)
    })

    it('should return 29 days for February in leap year', () => {
      const result = getDaysInMonth('02', '2024')
      expect(result).toHaveLength(29)
    })

    it('should return 30 days for April', () => {
      const result = getDaysInMonth('04', '2024')
      expect(result).toHaveLength(30)
    })

    it('should return 31 days for December', () => {
      const result = getDaysInMonth('12', '2024')
      expect(result).toHaveLength(31)
    })

    it('should return 31 days when month is empty', () => {
      const result = getDaysInMonth('', '2024')
      expect(result).toHaveLength(31)
    })

    it('should return 31 days when year is empty', () => {
      const result = getDaysInMonth('02', '')
      expect(result).toHaveLength(31)
    })

    it('should return 31 days when both are empty', () => {
      const result = getDaysInMonth('', '')
      expect(result).toHaveLength(31)
    })

    it('should handle century leap year (2000)', () => {
      const result = getDaysInMonth('02', '2000')
      expect(result).toHaveLength(29)
    })

    it('should handle century non-leap year (1900)', () => {
      const result = getDaysInMonth('02', '1900')
      expect(result).toHaveLength(28)
    })
  })
})
