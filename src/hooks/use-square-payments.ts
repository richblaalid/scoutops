'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createLogger } from '@/lib/logger'
import type { SquareCard, SquareTokenResult } from '@/types/square'

const log = createLogger('Square')

export interface UseSquarePaymentsOptions {
  /** Square application ID */
  applicationId: string
  /** Square location ID */
  locationId: string | null
  /** 'sandbox' or 'production' */
  environment: 'sandbox' | 'production'
  /** Container element ref for card form attachment */
  containerRef: React.RefObject<HTMLDivElement | null>
  /** Whether to auto-initialize when SDK is ready (default: true) */
  autoInitialize?: boolean
  /** Container selector string (alternative to ref-based attachment) */
  containerSelector?: string
  /** Max retry attempts for initialization (default: 3) */
  maxRetries?: number
}

export interface UseSquarePaymentsReturn {
  /** Whether the Square SDK has loaded */
  sdkReady: boolean
  /** Whether the card form is currently being initialized */
  isInitializing: boolean
  /** Whether the card form is ready for tokenization */
  cardReady: boolean
  /** Current error message, if any */
  error: string | null
  /** Reference to the card instance */
  cardRef: React.MutableRefObject<SquareCard | null>
  /** Manually initialize the card form */
  initializeCard: () => Promise<void>
  /** Tokenize the card and return the token */
  tokenize: () => Promise<SquareTokenResult | null>
  /** Destroy the card form and clean up */
  destroyCard: () => Promise<void>
  /** Clear the current error */
  clearError: () => void
}

/**
 * Hook for managing Square Web Payments SDK integration.
 *
 * Handles SDK loading, card form initialization, tokenization, and cleanup.
 * Includes mobile-friendly retry logic and IntersectionObserver support.
 *
 * @example
 * const containerRef = useRef<HTMLDivElement>(null)
 * const { cardReady, isInitializing, error, tokenize } = useSquarePayments({
 *   applicationId: 'sq0idp-...',
 *   locationId: 'L12345',
 *   environment: 'sandbox',
 *   containerRef,
 * })
 *
 * const handlePayment = async () => {
 *   const result = await tokenize()
 *   if (result?.status === 'OK' && result.token) {
 *     // Process payment with token
 *   }
 * }
 */
export function useSquarePayments({
  applicationId,
  locationId,
  environment,
  containerRef,
  autoInitialize = true,
  containerSelector,
  maxRetries = 3,
}: UseSquarePaymentsOptions): UseSquarePaymentsReturn {
  const cardRef = useRef<SquareCard | null>(null)
  const initAttemptRef = useRef(0)
  const initInProgressRef = useRef(false)

  const [sdkReady, setSdkReady] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [cardReady, setCardReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEnabled = !!locationId && !!applicationId

  // Load Square Web Payments SDK
  useEffect(() => {
    if (!isEnabled) return

    const sdkUrl =
      environment === 'production'
        ? 'https://web.squarecdn.com/v1/square.js'
        : 'https://sandbox.web.squarecdn.com/v1/square.js'

    // Check if already loaded
    if (window.Square) {
      log.debug('SDK already loaded')
      setSdkReady(true)
      return
    }

    log.debug('Loading SDK', { environment })
    const script = document.createElement('script')
    script.src = sdkUrl
    script.async = true
    script.onload = () => {
      log.debug('SDK loaded successfully')
      setSdkReady(true)
    }
    script.onerror = () => {
      log.error('Failed to load SDK')
      setError('Failed to load payment SDK. Please refresh the page.')
    }
    document.body.appendChild(script)

    return () => {
      const existingScript = document.querySelector(`script[src="${sdkUrl}"]`)
      if (existingScript) {
        existingScript.remove()
      }
    }
  }, [environment, isEnabled])

  // Initialize card payment form
  const initializeCard = useCallback(async () => {
    // Prevent concurrent initialization
    if (initInProgressRef.current) {
      log.debug('initializeCard skipped - already in progress')
      return
    }

    // Skip if already initialized
    if (cardRef.current) {
      log.debug('initializeCard skipped - card already exists')
      setCardReady(true)
      setIsInitializing(false)
      return
    }

    if (!window.Square) {
      log.error('Square SDK not loaded')
      setError('Payment system not available. Please refresh the page.')
      return
    }

    const container = containerRef.current
    if (!container) {
      log.error('Card container ref not available')
      return
    }

    if (!locationId || !applicationId) {
      log.error('Missing locationId or applicationId')
      setError('Payment configuration error. Please contact support.')
      return
    }

    // Check container has dimensions (mobile fix)
    const rect = container.getBoundingClientRect()
    log.debug('Container dimensions', { width: rect.width, height: rect.height })

    if (rect.width === 0 || rect.height === 0) {
      // Container not ready, retry
      if (initAttemptRef.current < 10) {
        initAttemptRef.current++
        setTimeout(() => initializeCard(), 100)
      } else {
        setError('Unable to display payment form. Please refresh the page.')
      }
      return
    }

    // Mark initialization as in progress
    initInProgressRef.current = true

    try {
      setIsInitializing(true)
      setError(null)

      log.debug('Creating Square payments instance')
      const payments = await window.Square.payments(applicationId, locationId)

      log.debug('Creating card')
      const card = await payments.card()

      log.debug('Attaching card to container')
      if (containerSelector) {
        await card.attach(containerSelector)
      } else {
        await card.attach(container)
      }

      log.debug('Card initialized successfully')
      cardRef.current = card
      setCardReady(true)
      setIsInitializing(false)
      initAttemptRef.current = 0
    } catch (err) {
      log.error('Failed to initialize card', err)

      // Retry on failure (mobile can be slow)
      if (initAttemptRef.current < maxRetries) {
        initAttemptRef.current++
        initInProgressRef.current = false
        setTimeout(() => initializeCard(), 500)
        return
      }

      setError('Failed to initialize payment form. Please refresh and try again.')
      setIsInitializing(false)
    } finally {
      initInProgressRef.current = false
    }
  }, [applicationId, locationId, containerRef, containerSelector, maxRetries])

  // Auto-initialize when SDK is ready and autoInitialize is true
  useEffect(() => {
    if (!autoInitialize || !sdkReady || cardReady || !isEnabled) {
      return
    }

    log.debug('Auto-initializing card', { sdkReady, cardReady, isEnabled })
    setIsInitializing(true)

    let cancelled = false

    const doInit = () => {
      if (!cancelled) {
        initializeCard()
      }
    }

    // Use IntersectionObserver to wait for container to be visible
    const container = containerRef.current
    if (container && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0]
          if (entry && entry.isIntersecting && entry.intersectionRatio > 0) {
            log.debug('Container is visible, initializing card')
            observer.disconnect()
            setTimeout(doInit, 100)
          }
        },
        { threshold: 0.1 }
      )
      observer.observe(container)

      // Fallback: try anyway after 500ms if observer doesn't fire
      const fallbackTimer = setTimeout(() => {
        log.debug('Fallback initialization after timeout')
        observer.disconnect()
        doInit()
      }, 500)

      return () => {
        cancelled = true
        observer.disconnect()
        clearTimeout(fallbackTimer)
      }
    } else {
      // Fallback for browsers without IntersectionObserver
      const timer = setTimeout(doInit, 100)
      return () => {
        cancelled = true
        clearTimeout(timer)
      }
    }
  }, [sdkReady, cardReady, isEnabled, autoInitialize, initializeCard, containerRef])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cardRef.current) {
        log.debug('Unmounting, destroying card')
        cardRef.current.destroy().catch((err) => log.error('Error destroying card', err))
        cardRef.current = null
      }
    }
  }, [])

  // Tokenize the card
  const tokenize = useCallback(async (): Promise<SquareTokenResult | null> => {
    if (!cardRef.current) {
      log.error('Cannot tokenize - card not initialized')
      setError('Payment form not ready')
      return null
    }

    try {
      log.debug('Tokenizing card')
      const result = await cardRef.current.tokenize()

      if (result.status === 'OK') {
        log.debug('Tokenization successful')
      } else {
        log.warn('Tokenization failed', result.errors)
        const errorMessage = result.errors?.[0]?.message || 'Card validation failed'
        setError(errorMessage)
      }

      return result
    } catch (err) {
      log.error('Tokenization error', err)
      setError('Failed to process card. Please try again.')
      return null
    }
  }, [])

  // Destroy the card form
  const destroyCard = useCallback(async () => {
    if (cardRef.current) {
      log.debug('Destroying card')
      try {
        await cardRef.current.destroy()
      } catch (err) {
        log.error('Error destroying card', err)
      }
      cardRef.current = null
      setCardReady(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    sdkReady,
    isInitializing,
    cardReady,
    error,
    cardRef,
    initializeCard,
    tokenize,
    destroyCard,
    clearError,
  }
}
