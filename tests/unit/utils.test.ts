import { describe, it, expect } from 'vitest'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names', () => {
      expect(cn('px-2', 'py-1')).toBe('px-2 py-1')
    })

    it('should handle conflicting tailwind classes', () => {
      expect(cn('px-2', 'px-4')).toBe('px-4')
    })

    it('should handle conditional classes', () => {
      expect(cn('base', false && 'hidden', true && 'visible')).toBe('base visible')
    })

    it('should handle undefined and null', () => {
      expect(cn('base', undefined, null)).toBe('base')
    })
  })

  describe('formatCurrency', () => {
    it('should format positive amounts', () => {
      expect(formatCurrency(100)).toBe('$100.00')
    })

    it('should format negative amounts', () => {
      expect(formatCurrency(-50.5)).toBe('-$50.50')
    })

    it('should format zero', () => {
      expect(formatCurrency(0)).toBe('$0.00')
    })

    it('should handle decimal amounts', () => {
      expect(formatCurrency(123.456)).toBe('$123.46')
    })

    it('should handle large amounts with commas', () => {
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89')
    })
  })

  describe('formatDate', () => {
    it('should format date string with time component', () => {
      // Use ISO string with time to avoid timezone issues
      const result = formatDate('2024-01-15T12:00:00')
      expect(result).toBe('Jan 15, 2024')
    })

    it('should format Date object', () => {
      // Using Date constructor with year, month, day creates local time
      const date = new Date(2024, 5, 20) // June 20, 2024
      const result = formatDate(date)
      expect(result).toBe('Jun 20, 2024')
    })

    it('should handle ISO date strings', () => {
      const result = formatDate('2024-06-20T00:00:00')
      expect(result).toBe('Jun 20, 2024')
    })
  })
})
