'use client'

import { useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/ui/logo'
import { trackLoginAttempted } from '@/lib/analytics'

function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  // Compute initial message from URL parameters
  const initialMessage = useMemo(() => {
    const error = searchParams.get('error')
    const urlMessage = searchParams.get('message')

    if (error === 'account_deactivated') {
      return {
        type: 'error' as const,
        text: 'Your account has been deactivated. Contact a unit administrator if you need to regain access.',
      }
    } else if (urlMessage === 'account_deleted') {
      return {
        type: 'success' as const,
        text: 'Your account has been deleted successfully.',
      }
    }
    return null
  }, [searchParams])

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(initialMessage)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const supabase = createClient()

    // Check for redirect parameter to pass through auth flow
    const redirectTo = searchParams.get('redirect')
    const callbackUrl = new URL('/auth/callback', window.location.origin)
    if (redirectTo) {
      callbackUrl.searchParams.set('next', redirectTo)
    }

    // Track login attempt (email domain only for privacy)
    const emailDomain = email.split('@')[1]
    trackLoginAttempted(emailDomain)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl.toString(),
        shouldCreateUser: true,
      },
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({
        type: 'success',
        text: 'Check your email for the login link!',
      })
    }

    setLoading(false)
  }

  return (
    <div className="rounded-xl border border-cream-400 dark:border-stone-700 bg-white dark:bg-stone-800 px-8 py-8 shadow-lg">
      <p className="mb-6 text-center text-sm text-stone-600 dark:text-stone-300">Sign in with your email to continue</p>

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-stone-700 dark:text-stone-200">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1 block w-full rounded-lg border border-stone-300 dark:border-stone-600 px-4 py-2.5 text-stone-900 dark:text-stone-50 bg-white dark:bg-stone-900 shadow-sm placeholder:text-stone-400 focus:border-forest-600 dark:focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-600/20 dark:focus:ring-forest-500/30"
          />
        </div>

        {message && (
          <div
            className={`rounded-lg p-4 ${
              message.type === 'error'
                ? 'bg-error-light text-error-dark'
                : 'bg-success-light text-success-dark'
            }`}
          >
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-lg bg-forest-800 dark:bg-forest-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-forest-700 dark:hover:bg-forest-600 hover:shadow-forest hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-forest-600 focus:ring-offset-2 dark:focus:ring-offset-stone-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
        >
          {loading ? (
            <svg
              className="h-5 w-5 animate-spin text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <>
              <svg
                className="mr-2 h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              Send Magic Link
            </>
          )}
        </button>
      </form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-cream-300 dark:bg-stone-900 px-4 py-12">
      {/* Main content - centered */}
      <div className="flex flex-1 flex-col items-center justify-center">
        {/* Hero branding section */}
        <div className="mb-10 flex flex-col items-center text-center">
          <Logo variant="full" size="lg" className="mb-4 scale-125" />
          <p className="text-2xl font-medium text-forest-600 dark:text-forest-400 italic">
            Your unit, organized.
          </p>
          <p className="mt-6 max-w-md text-lg text-stone-600 dark:text-stone-300">
            The all-in-one platform for Scout unit finances, billing, and operations.
          </p>
          <div className="mt-5">
            <span className="inline-flex items-center rounded-full bg-forest-800/10 dark:bg-forest-400/20 px-4 py-1.5 text-sm font-medium text-forest-800 dark:text-forest-300">
              Private Beta — Invited Users Only
            </span>
          </div>
        </div>

        <div className="w-full max-w-md">
          <Suspense fallback={
            <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-8 py-10 shadow-md">
              <div className="flex flex-col items-center text-center">
                <p className="text-sm text-stone-500 dark:text-stone-400">Loading...</p>
              </div>
            </div>
          }>
            <LoginForm />
          </Suspense>
        </div>

        {/* Request access link */}
        <div className="mt-8 text-center">
          <p className="text-base text-stone-600 dark:text-stone-300">
            Don&apos;t have access?{' '}
            <a href="/early-access" className="font-semibold text-forest-600 hover:text-forest-700 dark:text-forest-400 dark:hover:text-forest-300">
              Request an invite
            </a>
          </p>
        </div>
      </div>

      {/* Footer - pushed to bottom */}
      <div className="text-center pt-8">
        <Logo variant="full" size="sm" className="mx-auto mb-3" />
        <p className="text-sm text-stone-500 dark:text-stone-400">
          chuckbox.app
        </p>
      </div>
    </div>
  )
}
