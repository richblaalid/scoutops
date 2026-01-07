'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function AuthConfirmContent() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuth = async () => {
      const token_hash = searchParams.get('token_hash')
      const type = searchParams.get('type')
      const code = searchParams.get('code')
      const next = searchParams.get('next') ?? '/'

      const supabase = createClient()

      // Check if we already have a session
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        window.location.href = next
        return
      }

      // Prefer token_hash flow (doesn't require PKCE verifier)
      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as 'email' | 'magiclink',
        })

        if (error) {
          setError(error.message)
          return
        }

        window.location.href = next
        return
      }

      // Fallback: try code exchange (requires PKCE verifier from same browser)
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
          if (error.message.includes('PKCE') || error.message.includes('code verifier')) {
            setError('Please open the magic link in the same browser where you requested it.')
          } else {
            setError(error.message)
          }
          return
        }

        window.location.href = next
        return
      }

      setError('No authentication token provided. Please request a new magic link.')
    }

    handleAuth()
  }, [searchParams])

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
