import posthog from 'posthog-js'

// Helper to check if PostHog is available
function isPostHogAvailable(): boolean {
  return typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_POSTHOG_KEY
}

// User identification
export function identifyUser(
  userId: string,
  properties?: {
    email?: string
    role?: string
    unitId?: string
    unitName?: string
  }
) {
  if (!isPostHogAvailable()) return

  // Only use email domain for privacy
  const emailDomain = properties?.email?.split('@')[1]

  posthog.identify(userId, {
    ...(emailDomain && { email_domain: emailDomain }),
    ...(properties?.role && { role: properties.role }),
    ...(properties?.unitId && { unit_id: properties.unitId }),
    ...(properties?.unitName && { unit_name: properties.unitName }),
  })
}

export function resetUser() {
  if (!isPostHogAvailable()) return
  posthog.reset()
}

// Payment events
export function trackPaymentInitiated(properties: {
  amount: number
  scoutAccountId?: string
  method: 'card' | 'cash' | 'check' | 'transfer'
}) {
  if (!isPostHogAvailable()) return
  posthog.capture('payment_initiated', properties)
}

export function trackPaymentCompleted(properties: {
  amount: number
  fee?: number
  net?: number
  scoutAccountId?: string
  method: 'card' | 'cash' | 'check' | 'transfer'
}) {
  if (!isPostHogAvailable()) return
  posthog.capture('payment_completed', properties)
}

export function trackPaymentFailed(properties: {
  amount: number
  errorType: string
  scoutAccountId?: string
}) {
  if (!isPostHogAvailable()) return
  posthog.capture('payment_failed', properties)
}

// Billing events
export function trackBillingCreated(properties: {
  total: number
  scoutCount: number
  perScout: number
  billingType: 'split' | 'fixed'
}) {
  if (!isPostHogAvailable()) return
  posthog.capture('billing_created', properties)
}

// Auth events
export function trackLoginAttempted(emailDomain?: string) {
  if (!isPostHogAvailable()) return
  posthog.capture('login_attempted', {
    ...(emailDomain && { email_domain: emailDomain }),
  })
}

export function trackLoginCompleted(properties: {
  userId: string
  role?: string
}) {
  if (!isPostHogAvailable()) return
  posthog.capture('login_completed', properties)
}

// Generic event tracking
export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  if (!isPostHogAvailable()) return
  posthog.capture(eventName, properties)
}
