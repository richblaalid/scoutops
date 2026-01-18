import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/logo'
import { Wallet, Receipt, CreditCard, BarChart3 } from 'lucide-react'

interface HomeProps {
  searchParams: Promise<{ code?: string; error?: string; error_description?: string }>
}

const features = [
  {
    title: 'Scout Accounts',
    description: 'Track individual balances with double-entry accounting.',
    icon: Wallet,
  },
  {
    title: 'Fair Share Billing',
    description: 'Automatically calculate and distribute costs.',
    icon: Receipt,
  },
  {
    title: 'Payment Collection',
    description: 'Accept online payments with Square integration.',
    icon: CreditCard,
  },
  {
    title: 'Financial Reports',
    description: 'Generate reports and audit trails with one click.',
    icon: BarChart3,
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
    <main className="min-h-screen bg-cream-300 dark:bg-stone-900 flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col justify-center mx-auto max-w-6xl px-6 py-12 lg:py-16">
        {/* Logo & Tagline - Full Width Header */}
        <div className="text-center mb-12">
          <Logo variant="full" size="lg" className="mx-auto mb-4 scale-125" />
          <p className="text-2xl font-medium text-forest-600 dark:text-forest-400 italic">
            Your unit, organized.
          </p>
        </div>

        {/* 2 Column Layout */}
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-start">
          {/* Left Column - Value Prop & CTA */}
          <div className="text-center">
            <h2 className="text-2xl lg:text-3xl font-bold text-forest-800 dark:text-forest-200 leading-tight">
              Financial management built for Scout units
            </h2>
            <p className="mt-4 text-lg text-stone-600 dark:text-stone-300">
              Stop wrestling with spreadsheets. Track accounts, collect payments,
              and generate reports—so you can focus on the program, not the paperwork.
            </p>

            {/* CTA Section */}
            <div className="mt-8">
              <span className="inline-flex items-center rounded-full bg-forest-800/10 dark:bg-forest-400/20 px-4 py-1.5 text-sm font-medium text-forest-800 dark:text-forest-300 mb-4">
                Currently in Private Beta
              </span>
              <div>
                <Link
                  href="/early-access"
                  className="inline-flex items-center rounded-lg bg-tan-500 px-8 py-3.5 text-lg font-semibold text-white shadow-sm transition-all hover:bg-tan-400 hover:shadow-tan hover:-translate-y-0.5"
                >
                  Request Early Access
                </Link>
              </div>
              <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
                Join the waitlist for your unit.
              </p>
            </div>
          </div>

          {/* Right Column - Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="rounded-xl border border-cream-400 dark:border-stone-700 bg-white dark:bg-stone-800 p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest-800/10 dark:bg-forest-400/20 mb-3">
                    <Icon className="h-5 w-5 text-forest-800 dark:text-forest-300" />
                  </div>
                  <h3 className="text-base font-semibold text-forest-800 dark:text-forest-200">{feature.title}</h3>
                  <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Quote Section - Full Width */}
      <div className="bg-forest-800 dark:bg-forest-900 py-10">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <blockquote className="text-xl font-medium text-white italic">
            &ldquo;Scoutbook is for the Council. ChuckBox is for the Unit.&rdquo;
          </blockquote>
        </div>
      </div>

      {/* Footer - Full Width */}
      <footer className="bg-cream-300 dark:bg-stone-900 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <Logo variant="full" size="sm" className="mx-auto mb-4" />
          <p className="text-sm text-stone-500 dark:text-stone-400">
            &copy; {new Date().getFullYear()} ChuckBox. Built for Scouting America units.
          </p>
        </div>
      </footer>
    </main>
  )
}
