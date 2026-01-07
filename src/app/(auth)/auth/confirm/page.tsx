'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function AuthConfirmContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const exchangeAttempted = useRef(false)

  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (exchangeAttempted.current) return
    exchangeAttempted.current = true

    const handleAuth = async () => {
      const code = searchParams.get('code')
      const next = searchParams.get('next') ?? '/scouts'

      const supabase = createClient()

      // First check if we already have a session (code might already be exchanged)
      const { data: { session: existingSession } } = await supabase.auth.getSession()
      if (existingSession) {
        router.push(next)
        router.refresh()
        return
      }

      if (!code) {
        setError('No authentication code provided. Please request a new magic link.')
        return
      }

      // Exchange the code for a session
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        // Check if we actually have a session despite the error (code already used)
        const { data: { session: checkSession } } = await supabase.auth.getSession()
        if (checkSession) {
          router.push(next)
          router.refresh()
          return
        }

        console.error('Code exchange error:', exchangeError.message)
        if (exchangeError.message.includes('code verifier')) {
          setError('Please open the magic link in the same browser where you requested it.')
        } else {
          setError(exchangeError.message)
        }
        return
      }

      if (!data.session) {
        setError('Authentication failed. Please try again.')
        return
      }

      // Session is set - redirect to dashboard
      router.push(next)
      router.refresh()
    }

    handleAuth()
  }, [searchParams, router])

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg border bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-red-600">Authentication Failed</h1>
          <p className="mt-2 text-gray-600">{error}</p>
          <a
            href="/login"
            className="mt-4 block w-full rounded-md bg-primary px-4 py-2 text-center text-white hover:bg-primary/90"
          >
            Back to Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border bg-white p-8 shadow-sm text-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  )
}

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
          <div className="w-full max-w-md rounded-lg border bg-white p-8 shadow-sm text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthConfirmContent />
    </Suspense>
  )
}
