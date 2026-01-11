// Square Web Payments SDK types
// These types are for the client-side Square Web Payments SDK

declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => Promise<SquarePayments>
    }
  }
}

export interface SquarePayments {
  card: () => Promise<SquareCard>
}

export interface SquareCard {
  attach: (selector: string) => Promise<void>
  tokenize: () => Promise<SquareTokenResult>
  destroy: () => Promise<void>
}

export interface SquareTokenResult {
  status: 'OK' | 'ERROR'
  token?: string
  errors?: Array<{ message: string }>
}

// Re-export for backwards compatibility
export type Payments = SquarePayments
export type Card = SquareCard
export type TokenResult = SquareTokenResult
