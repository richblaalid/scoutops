import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/logo'
import Link from 'next/link'

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // Verify authentication
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-cream-300 dark:bg-stone-900">
      {/* Minimal header */}
      <header className="border-b border-cream-400 dark:border-stone-700 bg-white dark:bg-stone-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Logo variant="full" size="sm" />
          <Link
            href="/dashboard"
            className="text-sm text-stone-500 dark:text-stone-400 hover:text-forest-600 dark:hover:text-forest-400"
          >
            Skip to dashboard
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
