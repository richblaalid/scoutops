'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/ui/logo'

function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Handle URL parameters for redirect messages
  useEffect(() => {
    const error = searchParams.get('error')
    const urlMessage = searchParams.get('message')

    if (error === 'account_deactivated') {
      setMessage({
        type: 'error',
        text: 'Your account has been deactivated. Contact a unit administrator if you need to regain access.',
      })
    } else if (urlMessage === 'account_deleted') {
      setMessage({
        type: 'success',
        text: 'Your account has been deleted successfully.',
      })
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
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
    <div className="rounded-xl border border-cream-400 bg-white px-8 py-8 shadow-lg">
      <p className="mb-6 text-center text-sm text-stone-600">Sign in with your email to continue</p>

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-stone-700">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1 block w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20"
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
          className="flex w-full items-center justify-center rounded-lg bg-forest-800 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-forest-700 hover:shadow-forest hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-forest-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream-300 px-4 py-12">
      {/* Hero branding section */}
      <div className="mb-8 flex flex-col items-center text-center">
        <Logo variant="icon" size="lg" className="mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-forest-800">Chuck </span>
          <span className="text-tan-500">Box</span>
        </h1>
        <p className="mt-2 text-lg font-medium text-forest-600 italic">
          Your unit, organized.
        </p>
        <p className="mt-4 max-w-sm text-sm text-stone-500">
          The all-in-one platform for Scout unit finances, billing, and operations.
        </p>
        <div className="mt-4">
          <span className="inline-flex items-center rounded-full bg-tan-500/10 px-3 py-1 text-xs font-medium text-tan-600">
            Private Beta — Invited Users Only
          </span>
        </div>
      </div>

      <div className="w-full max-w-md">
        <Suspense fallback={
          <div className="rounded-xl border border-stone-200 bg-white px-8 py-10 shadow-md">
            <div className="flex flex-col items-center text-center">
              <p className="text-sm text-stone-500">Loading...</p>
            </div>
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-sm text-stone-500">
          Don&apos;t have access?{' '}
          <a href="/" className="font-medium text-forest-600 hover:text-forest-700">
            Request an invite
          </a>
        </p>
        <p className="mt-2 text-xs text-stone-400">
          chuckbox.app
        </p>
      </div>
    </div>
  )
}
