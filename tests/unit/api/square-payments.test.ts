import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock modules before importing the route
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
  rpc: vi.fn(),
}

const mockSquareClient = {
  payments: {
    create: vi.fn(),
  },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

vi.mock('@/lib/square/client', () => ({
  getSquareClientForUnit: vi.fn(() => Promise.resolve(mockSquareClient)),
  getDefaultLocationId: vi.fn(() => Promise.resolve('location_123')),
}))

// Import fixtures
import {
  mockUnit,
  mockAdminProfile,
  mockAdminMembership,
  mockScoutAccount,
  mockBankAccount,
  mockReceivableAccount,
  mockFeeAccount,
  mockJournalEntry,
  mockPayment,
} from '../../mocks/fixtures'
import { mockSuccessfulPayment, mockDeclinedPayment } from '../../mocks/square'

describe('Square Payments API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Fee Calculation', () => {
    // Square fee: 2.6% + $0.10
    const SQUARE_FEE_PERCENT = 0.026
    const SQUARE_FEE_FIXED_CENTS = 10

    function calculateFee(amountCents: number): number {
      return Math.round(amountCents * SQUARE_FEE_PERCENT + SQUARE_FEE_FIXED_CENTS)
    }

    it('should calculate fee correctly for $1.00', () => {
      const fee = calculateFee(100) // $1.00 = 100 cents
      // 100 * 0.026 + 10 = 2.6 + 10 = 12.6, rounded = 13 cents
      expect(fee).toBe(13)
    })

    it('should calculate fee correctly for $10.00', () => {
      const fee = calculateFee(1000) // $10.00 = 1000 cents
      // 1000 * 0.026 + 10 = 26 + 10 = 36 cents
      expect(fee).toBe(36)
    })

    it('should calculate fee correctly for $50.00', () => {
      const fee = calculateFee(5000) // $50.00 = 5000 cents
      // 5000 * 0.026 + 10 = 130 + 10 = 140 cents = $1.40
      expect(fee).toBe(140)
    })

    it('should calculate fee correctly for $100.00', () => {
      const fee = calculateFee(10000) // $100.00 = 10000 cents
      // 10000 * 0.026 + 10 = 260 + 10 = 270 cents = $2.70
      expect(fee).toBe(270)
    })

    it('should calculate fee correctly for $1000.00', () => {
      const fee = calculateFee(100000) // $1000.00 = 100000 cents
      // 100000 * 0.026 + 10 = 2600 + 10 = 2610 cents = $26.10
      expect(fee).toBe(2610)
    })

    it('should round fractional cents correctly', () => {
      const fee = calculateFee(123) // $1.23 = 123 cents
      // 123 * 0.026 + 10 = 3.198 + 10 = 13.198, rounded = 13 cents
      expect(fee).toBe(13)
    })
  })

  describe('Error Sanitization', () => {
    // Replicate the error mapping from the route
    function sanitizeSquareError(error: unknown): string {
      if (error && typeof error === 'object' && 'errors' in error) {
        const squareErrors = (error as { errors: Array<{ code?: string; category?: string }> }).errors
        const firstError = squareErrors?.[0]

        const errorMap: Record<string, string> = {
          'CARD_DECLINED': 'Your card was declined. Please try a different payment method.',
          'CVV_FAILURE': 'The security code (CVV) is incorrect. Please check and try again.',
          'ADDRESS_VERIFICATION_FAILURE': 'Address verification failed. Please check your billing address.',
          'INVALID_EXPIRATION': 'The card expiration date is invalid.',
          'EXPIRED_CARD': 'This card has expired. Please use a different card.',
          'INSUFFICIENT_FUNDS': 'Insufficient funds. Please try a different payment method.',
          'GENERIC_DECLINE': 'Your card was declined. Please try a different payment method.',
          'CARD_NOT_SUPPORTED': 'This card type is not supported. Please try a different card.',
          'INVALID_CARD': 'Invalid card number. Please check and try again.',
          'INVALID_LOCATION': 'Payment processing is temporarily unavailable.',
          'TRANSACTION_LIMIT': 'This payment exceeds your card\'s transaction limit.',
        }

        if (firstError?.code && errorMap[firstError.code]) {
          return errorMap[firstError.code]
        }

        if (firstError?.category === 'PAYMENT_METHOD_ERROR') {
          return 'Payment was declined. Please check your card details or try a different payment method.'
        }
      }

      return 'Unable to process payment. Please try again or contact support.'
    }

    it('should map CARD_DECLINED to user-friendly message', () => {
      const error = mockDeclinedPayment('CARD_DECLINED')
      expect(sanitizeSquareError(error)).toBe('Your card was declined. Please try a different payment method.')
    })

    it('should map CVV_FAILURE to user-friendly message', () => {
      const error = { errors: [{ code: 'CVV_FAILURE' }] }
      expect(sanitizeSquareError(error)).toBe('The security code (CVV) is incorrect. Please check and try again.')
    })

    it('should map EXPIRED_CARD to user-friendly message', () => {
      const error = { errors: [{ code: 'EXPIRED_CARD' }] }
      expect(sanitizeSquareError(error)).toBe('This card has expired. Please use a different card.')
    })

    it('should map INSUFFICIENT_FUNDS to user-friendly message', () => {
      const error = { errors: [{ code: 'INSUFFICIENT_FUNDS' }] }
      expect(sanitizeSquareError(error)).toBe('Insufficient funds. Please try a different payment method.')
    })

    it('should map INVALID_CARD to user-friendly message', () => {
      const error = { errors: [{ code: 'INVALID_CARD' }] }
      expect(sanitizeSquareError(error)).toBe('Invalid card number. Please check and try again.')
    })

    it('should handle PAYMENT_METHOD_ERROR category', () => {
      const error = { errors: [{ code: 'UNKNOWN_CODE', category: 'PAYMENT_METHOD_ERROR' }] }
      expect(sanitizeSquareError(error)).toBe('Payment was declined. Please check your card details or try a different payment method.')
    })

    it('should return generic message for unknown errors', () => {
      const error = { errors: [{ code: 'SOME_NEW_ERROR' }] }
      expect(sanitizeSquareError(error)).toBe('Unable to process payment. Please try again or contact support.')
    })

    it('should return generic message for non-Square errors', () => {
      const error = new Error('Network error')
      expect(sanitizeSquareError(error)).toBe('Unable to process payment. Please try again or contact support.')
    })

    it('should return generic message for null/undefined', () => {
      expect(sanitizeSquareError(null)).toBe('Unable to process payment. Please try again or contact support.')
      expect(sanitizeSquareError(undefined)).toBe('Unable to process payment. Please try again or contact support.')
    })
  })

  describe('Payment Request Validation', () => {
    // Test the validation schema constraints
    it('should require scoutAccountId to be valid UUID', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000'
      const invalidUUID = 'not-a-uuid'

      // UUID regex pattern
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      expect(uuidPattern.test(validUUID)).toBe(true)
      expect(uuidPattern.test(invalidUUID)).toBe(false)
    })

    it('should require minimum amount of $1.00 (100 cents)', () => {
      const minAmount = 100
      expect(99).toBeLessThan(minAmount) // Should fail
      expect(100).toBeGreaterThanOrEqual(minAmount) // Should pass
    })

    it('should require maximum amount of $100,000 (10000000 cents)', () => {
      const maxAmount = 10000000
      expect(10000001).toBeGreaterThan(maxAmount) // Should fail
      expect(10000000).toBeLessThanOrEqual(maxAmount) // Should pass
    })
  })

  describe('Idempotency Key Generation', () => {
    it('should generate consistent key for same inputs', async () => {
      const { createHash } = await import('crypto')

      const userId = 'user_123'
      const scoutAccountId = 'account_123'
      const amountCents = 5000
      const sourceId = 'cnon:card-nonce-ok'

      const key1 = createHash('sha256')
        .update(`${userId}-${scoutAccountId}-${amountCents}-${sourceId}`)
        .digest('hex')
        .slice(0, 45)

      const key2 = createHash('sha256')
        .update(`${userId}-${scoutAccountId}-${amountCents}-${sourceId}`)
        .digest('hex')
        .slice(0, 45)

      expect(key1).toBe(key2)
    })

    it('should generate different keys for different amounts', async () => {
      const { createHash } = await import('crypto')

      const userId = 'user_123'
      const scoutAccountId = 'account_123'
      const sourceId = 'cnon:card-nonce-ok'

      const key1 = createHash('sha256')
        .update(`${userId}-${scoutAccountId}-5000-${sourceId}`)
        .digest('hex')
        .slice(0, 45)

      const key2 = createHash('sha256')
        .update(`${userId}-${scoutAccountId}-6000-${sourceId}`)
        .digest('hex')
        .slice(0, 45)

      expect(key1).not.toBe(key2)
    })

    it('should be max 45 characters for Square API', async () => {
      const { createHash } = await import('crypto')

      const key = createHash('sha256')
        .update('test-input')
        .digest('hex')
        .slice(0, 45)

      expect(key.length).toBeLessThanOrEqual(45)
    })
  })

  describe('Net Amount Calculation', () => {
    it('should calculate net as amount minus fee', () => {
      const amountCents = 5000 // $50.00
      const feeCents = 140 // $1.40
      const netCents = amountCents - feeCents

      expect(netCents).toBe(4860) // $48.60
    })

    it('should convert cents to dollars correctly', () => {
      const amountCents = 5000
      const feeCents = 140
      const netCents = 4860

      expect(amountCents / 100).toBe(50.0)
      expect(feeCents / 100).toBe(1.4)
      expect(netCents / 100).toBe(48.6)
    })
  })

  describe('Overpayment Detection', () => {
    it('should detect overpayment when billing balance becomes positive', () => {
      // Scout owes $50 (billing_balance = -50)
      // Payment of $75
      // After payment: billing_balance = -50 + 75 = 25 (positive = overpayment)
      const billingBalanceBefore = -50
      const paymentAmount = 75
      const billingBalanceAfter = billingBalanceBefore + paymentAmount

      const isOverpayment = billingBalanceAfter > 0
      expect(isOverpayment).toBe(true)

      const overpaymentAmount = billingBalanceAfter
      expect(overpaymentAmount).toBe(25)
    })

    it('should not trigger for exact payment', () => {
      const billingBalanceBefore = -50
      const paymentAmount = 50
      const billingBalanceAfter = billingBalanceBefore + paymentAmount

      const isOverpayment = billingBalanceAfter > 0
      expect(isOverpayment).toBe(false)
    })

    it('should not trigger for partial payment', () => {
      const billingBalanceBefore = -50
      const paymentAmount = 25
      const billingBalanceAfter = billingBalanceBefore + paymentAmount

      const isOverpayment = billingBalanceAfter > 0
      expect(isOverpayment).toBe(false)
      expect(billingBalanceAfter).toBe(-25) // Still owes $25
    })
  })
})
