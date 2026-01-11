import { describe, it, expect } from 'vitest'
import {
  SQUARE_FEE_PERCENT,
  SQUARE_FEE_FIXED_DOLLARS,
  SQUARE_FEE_FIXED_CENTS,
  calculateFeeCents,
  calculateFeeDollars,
  calculateNetCents,
  calculateNetDollars,
  calculateTotalWithFeeCents,
} from '@/lib/billing'

describe('billing', () => {
  describe('constants', () => {
    it('should have correct Square fee constants', () => {
      expect(SQUARE_FEE_PERCENT).toBe(0.026)
      expect(SQUARE_FEE_FIXED_DOLLARS).toBe(0.10)
      expect(SQUARE_FEE_FIXED_CENTS).toBe(10)
    })
  })

  describe('calculateFeeCents', () => {
    it('should calculate fee for $10 (1000 cents)', () => {
      // $10 * 2.6% + $0.10 = $0.26 + $0.10 = $0.36 = 36 cents
      expect(calculateFeeCents(1000)).toBe(36)
    })

    it('should calculate fee for $100 (10000 cents)', () => {
      // $100 * 2.6% + $0.10 = $2.60 + $0.10 = $2.70 = 270 cents
      expect(calculateFeeCents(10000)).toBe(270)
    })

    it('should calculate fee for $1 (100 cents)', () => {
      // $1 * 2.6% + $0.10 = $0.026 + $0.10 = $0.126 = 13 cents (rounded)
      expect(calculateFeeCents(100)).toBe(13)
    })

    it('should calculate fee for $50 (5000 cents)', () => {
      // $50 * 2.6% + $0.10 = $1.30 + $0.10 = $1.40 = 140 cents
      expect(calculateFeeCents(5000)).toBe(140)
    })

    it('should round to nearest cent', () => {
      // $25 * 2.6% + $0.10 = $0.65 + $0.10 = $0.75 = 75 cents
      expect(calculateFeeCents(2500)).toBe(75)
    })

    it('should handle zero amount', () => {
      // $0 * 2.6% + $0.10 = $0.10 = 10 cents
      expect(calculateFeeCents(0)).toBe(10)
    })
  })

  describe('calculateFeeDollars', () => {
    it('should calculate fee for $10', () => {
      // $10 * 2.6% + $0.10 = $0.26 + $0.10 = $0.36
      expect(calculateFeeDollars(10)).toBeCloseTo(0.36)
    })

    it('should calculate fee for $100', () => {
      // $100 * 2.6% + $0.10 = $2.60 + $0.10 = $2.70
      expect(calculateFeeDollars(100)).toBeCloseTo(2.70)
    })

    it('should calculate fee for $50', () => {
      // $50 * 2.6% + $0.10 = $1.30 + $0.10 = $1.40
      expect(calculateFeeDollars(50)).toBeCloseTo(1.40)
    })
  })

  describe('calculateNetCents', () => {
    it('should calculate net for $10 (1000 cents)', () => {
      // $10 - $0.36 fee = $9.64 = 964 cents
      expect(calculateNetCents(1000)).toBe(964)
    })

    it('should calculate net for $100 (10000 cents)', () => {
      // $100 - $2.70 fee = $97.30 = 9730 cents
      expect(calculateNetCents(10000)).toBe(9730)
    })

    it('should calculate net for $50 (5000 cents)', () => {
      // $50 - $1.40 fee = $48.60 = 4860 cents
      expect(calculateNetCents(5000)).toBe(4860)
    })
  })

  describe('calculateNetDollars', () => {
    it('should calculate net for $10', () => {
      // $10 - $0.36 fee = $9.64
      expect(calculateNetDollars(10)).toBeCloseTo(9.64)
    })

    it('should calculate net for $100', () => {
      // $100 - $2.70 fee = $97.30
      expect(calculateNetDollars(100)).toBeCloseTo(97.30)
    })
  })

  describe('calculateTotalWithFeeCents', () => {
    it('should calculate total with fee passed to payer for $10', () => {
      const result = calculateTotalWithFeeCents(1000)
      expect(result.baseAmount).toBe(1000)
      // Fee: ceil(1000 * 0.026 + 10) = ceil(36) = 36
      expect(result.feeAmount).toBe(36)
      expect(result.totalAmount).toBe(1036)
    })

    it('should calculate total with fee passed to payer for $100', () => {
      const result = calculateTotalWithFeeCents(10000)
      expect(result.baseAmount).toBe(10000)
      // Fee: ceil(10000 * 0.026 + 10) = ceil(270) = 270
      expect(result.feeAmount).toBe(270)
      expect(result.totalAmount).toBe(10270)
    })

    it('should calculate total with fee passed to payer for $25', () => {
      const result = calculateTotalWithFeeCents(2500)
      expect(result.baseAmount).toBe(2500)
      // Fee: ceil(2500 * 0.026 + 10) = ceil(75) = 75
      expect(result.feeAmount).toBe(75)
      expect(result.totalAmount).toBe(2575)
    })

    it('should use custom fee percent and fixed amount', () => {
      // Custom: 3% + 15 cents
      const result = calculateTotalWithFeeCents(1000, 0.03, 15)
      expect(result.baseAmount).toBe(1000)
      // Fee: ceil(1000 * 0.03 + 15) = ceil(45) = 45
      expect(result.feeAmount).toBe(45)
      expect(result.totalAmount).toBe(1045)
    })

    it('should ceil fractional fees', () => {
      // $1 = 100 cents: ceil(100 * 0.026 + 10) = ceil(12.6) = 13
      const result = calculateTotalWithFeeCents(100)
      expect(result.feeAmount).toBe(13)
      expect(result.totalAmount).toBe(113)
    })

    it('should handle zero base amount', () => {
      const result = calculateTotalWithFeeCents(0)
      expect(result.baseAmount).toBe(0)
      // Fee: ceil(0 * 0.026 + 10) = 10
      expect(result.feeAmount).toBe(10)
      expect(result.totalAmount).toBe(10)
    })
  })

  describe('fee calculations consistency', () => {
    it('cents and dollars calculations should be consistent', () => {
      const amounts = [1000, 2500, 5000, 10000, 25000]

      amounts.forEach(cents => {
        const dollars = cents / 100
        const feeCents = calculateFeeCents(cents)
        const feeDollars = calculateFeeDollars(dollars)

        // Allow for small floating point differences
        expect(feeCents).toBeCloseTo(feeDollars * 100, 0)
      })
    })

    it('net + fee should equal original amount', () => {
      const amounts = [1000, 2500, 5000, 10000]

      amounts.forEach(cents => {
        const net = calculateNetCents(cents)
        const fee = calculateFeeCents(cents)
        expect(net + fee).toBe(cents)
      })
    })
  })
})
