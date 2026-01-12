import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/logo'

interface HomeProps {
  searchParams: Promise<{ code?: string; error?: string; error_description?: string }>
}

const features = [
  {
    title: 'Scout Accounts',
    description: 'Track individual scout balances with double-entry accounting. Know exactly where every dollar goes.',
    icon: '💰',
  },
  {
    title: 'Fair Share Billing',
    description: 'Automatically calculate and distribute costs across your unit. No more spreadsheet headaches.',
    icon: '📊',
  },
  {
    title: 'Payment Collection',
    description: 'Accept payments online with Square integration. Parents pay easily, you reconcile automatically.',
    icon: '💳',
  },
  {
    title: 'Financial Reports',
    description: 'Generate treasurer reports, account statements, and audit trails with one click.',
    icon: '📋',
  },
]

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams

  // If there's an auth code, redirect to the confirm page to handle it
  if (params.code) {
    const confirmUrl = `/auth/confirm?code=${params.code}`
    redirect(confirmUrl)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If user exists, redirect to dashboard
  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-cream-300">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24 lg:px-8">
          <div className="text-center">
            <Logo variant="icon" size="lg" className="mx-auto mb-6" />
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
              <span className="text-forest-800">Chuck</span>
              <span className="text-tan-500">Box</span>
            </h1>
            <p className="mt-3 text-xl font-medium text-forest-600 italic">
              Your unit, organized.
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-stone-600">
              The all-in-one financial management platform built for Scout units.
              Track accounts, collect payments, manage billing, and generate reports—so
              you can focus on the program, not the paperwork.
            </p>

            {/* Coming Soon Badge */}
            <div className="mt-10">
              <span className="inline-flex items-center rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white">
                Coming Soon — Currently in Private Beta
              </span>
            </div>

            {/* Waitlist CTA */}
            <div className="mt-8">
              <Link
                href="/early-access"
                className="inline-flex items-center rounded-lg bg-tan-500 px-6 py-3 text-base font-semibold text-white shadow-sm transition-all hover:bg-tan-400 hover:shadow-tan hover:-translate-y-0.5"
              >
                Request Early Access
              </Link>
              <p className="mt-3 text-sm text-stone-500">
                Interested in ChuckBox for your unit? Tell us about your needs.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-forest-800">
              Everything your unit treasurer needs
            </h2>
            <p className="mt-2 text-stone-600">
              Built by Scout volunteers, for Scout volunteers.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-cream-400 bg-cream-100 p-6 transition-shadow hover:shadow-md"
              >
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-forest-800">{feature.title}</h3>
                <p className="mt-2 text-sm text-stone-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quote Section */}
      <div className="bg-forest-800 py-12">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <blockquote className="text-xl font-medium text-white italic">
            &ldquo;Scoutbook is for the Council. ChuckBox is for the Unit.&rdquo;
          </blockquote>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-cream-300 py-8">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <Logo variant="full" size="sm" className="mx-auto mb-4" />
          <p className="text-sm text-stone-500">
            &copy; {new Date().getFullYear()} ChuckBox. Built for Scouting America units.
          </p>
        </div>
      </footer>
    </main>
  )
}
