// Square payment processing fee constants and calculations
// Square charges: 2.6% + $0.10 per transaction

export const SQUARE_FEE_PERCENT = 0.026
export const SQUARE_FEE_FIXED_DOLLARS = 0.10
export const SQUARE_FEE_FIXED_CENTS = 10

/**
 * Calculate Square processing fee from an amount in cents
 */
export function calculateFeeCents(amountCents: number): number {
  return Math.round(amountCents * SQUARE_FEE_PERCENT + SQUARE_FEE_FIXED_CENTS)
}

/**
 * Calculate Square processing fee from an amount in dollars
 */
export function calculateFeeDollars(amountDollars: number): number {
  return amountDollars * SQUARE_FEE_PERCENT + SQUARE_FEE_FIXED_DOLLARS
}

/**
 * Calculate net amount after Square fee (in cents)
 */
export function calculateNetCents(amountCents: number): number {
  return amountCents - calculateFeeCents(amountCents)
}

/**
 * Calculate net amount after Square fee (in dollars)
 */
export function calculateNetDollars(amountDollars: number): number {
  return amountDollars - calculateFeeDollars(amountDollars)
}

/**
 * Calculate total including fee if passing to payer (in cents)
 * Uses formula: totalAmount = baseAmount + (baseAmount * feePercent) + feeFixed
 */
export function calculateTotalWithFeeCents(
  baseAmountCents: number,
  feePercent: number = SQUARE_FEE_PERCENT,
  feeFixedCents: number = SQUARE_FEE_FIXED_CENTS
): { baseAmount: number; feeAmount: number; totalAmount: number } {
  const feeAmount = Math.ceil((baseAmountCents * feePercent) + feeFixedCents)
  return {
    baseAmount: baseAmountCents,
    feeAmount,
    totalAmount: baseAmountCents + feeAmount,
  }
}
