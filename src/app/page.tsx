import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

interface HomeProps {
  searchParams: Promise<{ code?: string; error?: string; error_description?: string }>
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams

  // If there's an auth code, redirect to the confirm page to handle it
  if (params.code) {
    const confirmUrl = `/auth/confirm?code=${params.code}`
    redirect(confirmUrl)
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // If user exists, redirect to scouts (main dashboard)
  if (user) {
    redirect('/scouts')
  }

  // Show error if auth failed
  const authError = params.error_description

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          ScoutOps
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600">
          Unit management platform for Scouting America troops
        </p>
        {authError && (
          <div className="mt-6 rounded-md bg-red-50 p-4 text-sm text-red-600">
            {decodeURIComponent(authError.replace(/\+/g, ' '))}
          </div>
        )}
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/login"
            className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  )
}
