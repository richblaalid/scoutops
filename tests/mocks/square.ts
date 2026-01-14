import { vi } from 'vitest'

/**
 * Mock Square payment result
 */
export interface MockSquarePayment {
  id: string
  status: 'COMPLETED' | 'FAILED' | 'PENDING' | 'CANCELED'
  amountMoney?: {
    amount: bigint
    currency: string
  }
  receiptUrl?: string
  orderId?: string
  cardDetails?: {
    card?: {
      cardBrand?: string
      last4?: string
      cardholderName?: string
    }
  }
  buyerEmailAddress?: string
}

/**
 * Mock Square error
 */
export interface MockSquareError {
  errors: Array<{
    code: string
    detail?: string
    category?: string
  }>
}

/**
 * Creates a mock Square client
 */
export function createMockSquareClient(overrides: {
  paymentResult?: MockSquarePayment | null
  paymentError?: MockSquareError | null
  refundResult?: { refund: { id: string; status: string } } | null
} = {}) {
  const { paymentResult, paymentError, refundResult } = overrides

  return {
    payments: {
      create: vi.fn().mockImplementation(async () => {
        if (paymentError) {
          throw paymentError
        }
        return { payment: paymentResult }
      }),
      get: vi.fn().mockImplementation(async () => {
        return { payment: paymentResult }
      }),
    },
    refunds: {
      create: vi.fn().mockImplementation(async () => {
        return refundResult
      }),
      get: vi.fn().mockImplementation(async () => {
        return refundResult
      }),
    },
    orders: {
      create: vi.fn(),
      get: vi.fn(),
    },
  }
}

/**
 * Creates a successful payment result
 */
export function mockSuccessfulPayment(overrides: Partial<MockSquarePayment> = {}): MockSquarePayment {
  return {
    id: 'sq_payment_123',
    status: 'COMPLETED',
    amountMoney: {
      amount: BigInt(1000),
      currency: 'USD',
    },
    receiptUrl: 'https://squareup.com/receipt/123',
    orderId: 'order_123',
    cardDetails: {
      card: {
        cardBrand: 'VISA',
        last4: '1234',
        cardholderName: 'Test User',
      },
    },
    ...overrides,
  }
}

/**
 * Creates a declined payment error
 */
export function mockDeclinedPayment(code = 'CARD_DECLINED'): MockSquareError {
  return {
    errors: [
      {
        code,
        detail: 'Card was declined',
        category: 'PAYMENT_METHOD_ERROR',
      },
    ],
  }
}

/**
 * Creates a generic Square error
 */
export function mockSquareError(code: string, detail: string, category = 'API_ERROR'): MockSquareError {
  return {
    errors: [{ code, detail, category }],
  }
}

/**
 * Mock Square Web Payments SDK card tokenize result
 */
export interface MockTokenizeResult {
  status: 'OK' | 'ERROR'
  token?: string
  errors?: Array<{ message: string }>
}

/**
 * Creates a mock Square Web SDK card element
 */
export function createMockSquareCard(tokenizeResult: MockTokenizeResult = { status: 'OK', token: 'cnon:card-nonce-ok' }) {
  return {
    attach: vi.fn().mockResolvedValue(undefined),
    tokenize: vi.fn().mockResolvedValue(tokenizeResult),
    destroy: vi.fn().mockResolvedValue(undefined),
  }
}

/**
 * Creates a mock Square Web SDK payments instance
 */
export function createMockSquarePayments(card = createMockSquareCard()) {
  return {
    card: vi.fn().mockResolvedValue(card),
  }
}

/**
 * Creates a mock window.Square global
 */
export function createMockSquareSDK(payments = createMockSquarePayments()) {
  return {
    payments: vi.fn().mockResolvedValue(payments),
  }
}
