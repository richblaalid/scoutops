import { useState, useCallback } from 'react'

export interface FormState<TSuccess = boolean> {
  isLoading: boolean
  error: string | null
  success: TSuccess
}

export interface FormStateActions<TSuccess = boolean> {
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSuccess: (success: TSuccess) => void
  reset: () => void
  startLoading: () => void
  handleError: (error: unknown) => void
  handleSuccess: (success?: TSuccess) => void
}

export type UseFormStateReturn<TSuccess = boolean> = FormState<TSuccess> & FormStateActions<TSuccess>

/**
 * A reusable hook for managing form state (loading, error, success).
 *
 * @param initialSuccess - Initial success value (default: false for boolean, null for string)
 * @returns Form state and actions to manipulate it
 *
 * @example
 * // Basic usage with boolean success
 * const { isLoading, error, success, startLoading, handleError, handleSuccess } = useFormState()
 *
 * @example
 * // With string success message
 * const form = useFormState<string | null>(null)
 * form.handleSuccess('Changes saved!')
 *
 * @example
 * // In an async handler
 * const handleSubmit = async () => {
 *   startLoading()
 *   try {
 *     await saveData()
 *     handleSuccess()
 *   } catch (err) {
 *     handleError(err)
 *   }
 * }
 */
export function useFormState<TSuccess = boolean>(
  initialSuccess: TSuccess = false as TSuccess
): UseFormStateReturn<TSuccess> {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<TSuccess>(initialSuccess)

  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
    setSuccess(initialSuccess)
  }, [initialSuccess])

  const startLoading = useCallback(() => {
    setIsLoading(true)
    setError(null)
    setSuccess(initialSuccess)
  }, [initialSuccess])

  const handleError = useCallback((err: unknown) => {
    setIsLoading(false)
    if (err instanceof Error) {
      setError(err.message)
    } else if (typeof err === 'string') {
      setError(err)
    } else {
      setError('An unexpected error occurred')
    }
    setSuccess(initialSuccess)
  }, [initialSuccess])

  const handleSuccess = useCallback((successValue?: TSuccess) => {
    setIsLoading(false)
    setError(null)
    // If no value provided and TSuccess is boolean, default to true
    if (successValue === undefined) {
      setSuccess(true as TSuccess)
    } else {
      setSuccess(successValue)
    }
  }, [])

  return {
    isLoading,
    error,
    success,
    setLoading: setIsLoading,
    setError,
    setSuccess,
    reset,
    startLoading,
    handleError,
    handleSuccess,
  }
}

/**
 * Hook for forms that need to track both submission and data loading states separately.
 */
export function useFormStateWithFetch<TSuccess = boolean>(
  initialSuccess: TSuccess = false as TSuccess
) {
  const form = useFormState<TSuccess>(initialSuccess)
  const [isFetching, setIsFetching] = useState(false)

  const startFetching = useCallback(() => {
    setIsFetching(true)
    form.setError(null)
  }, [form])

  const stopFetching = useCallback(() => {
    setIsFetching(false)
  }, [])

  return {
    ...form,
    isFetching,
    setFetching: setIsFetching,
    startFetching,
    stopFetching,
  }
}
