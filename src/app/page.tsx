import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Wallet, Receipt, CreditCard, BarChart3, ArrowRight, Check } from 'lucide-react'

interface HomeProps {
  searchParams: Promise<{ code?: string; error?: string; error_description?: string }>
}

// Logo component with amber accent
function Logo({
  variant = 'default',
  size = 'md'
}: {
  variant?: 'default' | 'amber'
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const sizes = { sm: 32, md: 40, lg: 48, xl: 64 }
  const textSizes = { sm: 'text-2xl', md: 'text-3xl', lg: 'text-4xl', xl: 'text-5xl' }
  const iconSize = sizes[size]

  const boxBody = '#14532d'  // Deep pine
  const compartments = '#166534'  // Forest green
  const accent = variant === 'amber' ? '#b45309' : '#ea580c'

  return (
    <div className="inline-flex items-center gap-2">
      <svg
        viewBox="0 0 72 66"
        width={iconSize}
        height={Math.round(iconSize * 66 / 72)}
        className="shrink-0"
      >
        <path d="M60.1818 10H11.8182C9.70946 10 8 11.7349 8 13.875V37.125C8 39.2651 9.70946 41 11.8182 41H60.1818C62.2905 41 64 39.2651 64 37.125V13.875C64 11.7349 62.2905 10 60.1818 10Z" fill={boxBody}/>
        <path d="M15.6924 40.6155L5.53857 60.9232" stroke={boxBody} strokeWidth="5.07692" strokeLinecap="round"/>
        <path d="M56.3076 40.6155L66.4615 60.9232" stroke={boxBody} strokeWidth="5.07692" strokeLinecap="round"/>
        <path d="M62.0195 43.1538H9.98099C8.92953 43.1538 8.07715 44.0062 8.07715 45.0577V48.8653C8.07715 49.9168 8.92953 50.7692 9.98099 50.7692H62.0195C63.0709 50.7692 63.9233 49.9168 63.9233 48.8653V45.0577C63.9233 44.0062 63.0709 43.1538 62.0195 43.1538Z" fill={accent}/>
        <path d="M57.9643 14H43.0357C41.9114 14 41 14.6716 41 15.5V22.5C41 23.3284 41.9114 24 57.9643 24H57.9643C59.0886 24 60 23.3284 60 22.5V15.5C60 14.6716 59.0886 14 57.9643 14Z" fill={compartments}/>
        <path d="M57.9643 28H43.0357C41.9114 28 41 28.6044 41 29.35V35.65C41 36.3956 41.9114 37 43.0357 37H57.9643C59.0886 37 60 36.3956 60 35.65V29.35C60 28.6044 59.0886 28 57.9643 28Z" fill={compartments}/>
        <path d="M34.3214 14H14.6786C13.1992 14 12 15.5446 12 17.45V33.55C12 35.4554 13.1992 37 14.6786 37H34.3214C35.8008 37 37 35.4554 37 33.55V17.45C37 15.5446 35.8008 14 34.3214 14Z" fill={compartments}/>
        <path d="M36 11V40" stroke={compartments} strokeWidth="2.53846"/>
      </svg>
      <span className={`font-bold tracking-tight ${textSizes[size]}`}>
        <span className="text-green-800">Chuck</span>
        <span style={{ color: accent }}>Box</span>
      </span>
    </div>
  )
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

  // If user exists, redirect to dashboard
  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-[#FEFCF8]">
      {/* Navigation - Clean, minimal */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FEFCF8]/80 backdrop-blur-md border-b border-stone-200/60">
        <div className="mx-auto max-w-6xl px-6 h-20 flex items-center justify-between">
          <Logo variant="amber" size="lg" />
          <Link
            href="/login"
            className="text-lg font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* Hero - Light, editorial, asymmetric */}
      <section className="pt-32 pb-20 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: Content */}
            <div>
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-sm font-medium mb-6">
                <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                Now in Private Beta
              </div>

              {/* Headline - Bold, geometric feel */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-800 leading-[1.1] tracking-tight">
                The treasurer&apos;s
                <br />
                <span className="text-amber-700">toolkit</span> for
                <br />
                Scout units
              </h1>

              {/* Subheadline */}
              <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-lg">
                Stop wrestling with spreadsheets. Track accounts, collect payments,
                and generate reports—so you can focus on the program.
              </p>

              {/* CTA */}
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/early-access"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-green-800 text-white font-semibold rounded-lg hover:bg-green-900 transition-all hover:shadow-lg hover:shadow-green-900/25 hover:-translate-y-0.5"
                >
                  Request Early Access
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-stone-700 font-medium rounded-lg border border-stone-300 hover:border-stone-400 hover:bg-stone-50 transition-all"
                >
                  See how it works
                </Link>
              </div>
            </div>

            {/* Right: Visual element - Real screenshot */}
            <div className="relative">
              {/* Main screenshot - Full dashboard view */}
              <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xl shadow-stone-900/10">
                <Image
                  src="/marketing_assets/screenshots/dashboard.png"
                  alt="ChuckBox dashboard with quick actions, transactions, and scout account summary"
                  width={1280}
                  height={720}
                  className="rounded-lg"
                  priority
                />
              </div>

              {/* Floating accent card */}
              <div className="absolute -bottom-6 -left-6 bg-amber-700 text-white p-4 rounded-xl shadow-xl shadow-amber-800/30">
                <div className="text-2xl font-bold">Zero</div>
                <div className="text-amber-200 text-sm">spreadsheets</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quote banner - Subtle, warm */}
      <section className="py-12 px-6 bg-stone-100/50 border-y border-stone-200/60">
        <div className="mx-auto max-w-4xl text-center">
          <blockquote className="text-xl sm:text-2xl font-medium text-stone-700 italic">
            &ldquo;Scoutbook is for the Council.
            <span className="text-amber-700"> ChuckBox is for the Unit.</span>&rdquo;
          </blockquote>
        </div>
      </section>

      {/* Features - Bento grid */}
      <section id="features" className="py-24 px-6 bg-[#FEFCF8]">
        <div className="mx-auto max-w-6xl">
          {/* Section header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-800">
              Everything a treasurer needs
            </h2>
            <p className="mt-4 text-lg text-stone-600 max-w-2xl mx-auto">
              Purpose-built for Scout unit finances. Not a general-purpose tool trying to do everything.
            </p>
          </div>

          {/* Bento grid - 2 large cards on top, 2 smaller below */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Scout Ledgers - Card with screenshot */}
            <div className="group p-6 rounded-2xl bg-white border border-stone-200 hover:border-amber-200 hover:shadow-xl hover:shadow-amber-800/5 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-700 to-green-800 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-stone-800">Scout Ledgers</h3>
              </div>
              <p className="text-amber-700 font-medium mb-2">&ldquo;Where did that $47.50 go?&rdquo;</p>
              <p className="text-stone-600 text-sm leading-relaxed mb-4">
                Real double-entry accounting means every dollar has a paper trail.
                Billing balances, scout funds, payments—all tracked automatically.
              </p>
              <div className="rounded-lg overflow-hidden border border-stone-100 max-h-80 overflow-y-hidden">
                <Image
                  src="/marketing_assets/screenshots/accounting_screenshot.png"
                  alt="Scout account ledgers showing billing and funds balances"
                  width={856}
                  height={478}
                  className="w-full object-cover object-top"
                />
              </div>
            </div>

            {/* Fair Share Billing - Large card with screenshot */}
            <div className="group p-6 rounded-2xl bg-white border border-stone-200 hover:border-amber-200 hover:shadow-xl hover:shadow-amber-800/5 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-700 to-green-800 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-stone-800">Fair Share Billing</h3>
              </div>
              <p className="text-amber-700 font-medium mb-2">&ldquo;Summer camp is $1,247.50 for 23 scouts...&rdquo;</p>
              <p className="text-stone-600 text-sm leading-relaxed mb-4">
                Enter the total, select the scouts, done. ChuckBox handles the math—$54.24 each, calculated instantly.
              </p>
              <div className="rounded-lg overflow-hidden border border-stone-100 max-h-80 overflow-y-hidden">
                <Image
                  src="/marketing_assets/screenshots/billing_screenshot.png"
                  alt="Fair share billing splitting costs among scouts"
                  width={816}
                  height={600}
                  className="w-full object-cover object-top"
                />
              </div>
            </div>

            {/* Payment Portal - Card with Square screenshot */}
            <div className="group p-6 rounded-2xl bg-white border border-stone-200 hover:border-amber-200 hover:shadow-xl hover:shadow-amber-800/5 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-700 to-green-800 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-stone-800">Payment Portal</h3>
              </div>
              <p className="text-amber-700 font-medium mb-2">&ldquo;Stop chasing checks&rdquo;</p>
              <p className="text-stone-600 text-sm leading-relaxed mb-4">
                Parents pay online via Square. Money comes in, scout accounts update automatically.
                No more tracking down cash or waiting for checks to clear.
              </p>
              <div className="rounded-lg overflow-hidden border border-stone-100 max-h-80 overflow-y-hidden">
                <Image
                  src="/marketing_assets/screenshots/square_transactions.png"
                  alt="Square Transaction History showing payments received"
                  width={1280}
                  height={600}
                  className="w-full object-cover object-top"
                />
              </div>
            </div>

            {/* Audit-Ready Reports - Card with aging report screenshot */}
            <div className="group p-6 rounded-2xl bg-white border border-stone-200 hover:border-amber-200 hover:shadow-xl hover:shadow-amber-800/5 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-700 to-green-800 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-stone-800">Audit-Ready Reports</h3>
              </div>
              <p className="text-amber-700 font-medium mb-2">&ldquo;Committee meeting in 10 minutes?&rdquo;</p>
              <p className="text-stone-600 text-sm leading-relaxed mb-4">
                One click generates a complete financial report. Balance summaries, aging buckets,
                outstanding charges—everything the committee needs to see.
              </p>
              <div className="rounded-lg overflow-hidden border border-stone-100 max-h-80 overflow-y-hidden">
                <Image
                  src="/marketing_assets/screenshots/aging_report.png"
                  alt="Aging report showing overdue balances by time bucket"
                  width={1280}
                  height={600}
                  className="w-full object-cover object-top"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value statements */}
      <section className="py-16 px-6 bg-green-800">
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-3 gap-8 text-center">
            {[
              { word: 'formulas', label: 'Calculations done for you' },
              { word: 'manual entry', label: 'Sync from Scoutbook' },
              { word: 'guesswork', label: 'Every dollar tracked' },
            ].map((stat) => (
              <div key={stat.word}>
                <div className="text-4xl sm:text-5xl font-bold text-white">0</div>
                <div className="text-lg sm:text-xl font-semibold text-white mt-1">
                  {stat.word}
                </div>
                <div className="text-green-200 text-sm mt-2">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits list */}
      <section className="py-24 px-6 bg-[#FEFDFB]">
        <div className="mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-stone-800">
                Built by a treasurer
                <br />
                <span className="text-amber-700">who hated spreadsheets</span>
              </h2>
              <p className="mt-6 text-lg text-stone-600 leading-relaxed">
                After years of wrestling with Excel, Google Sheets, and paper ledgers,
                we built the tool we wished existed. ChuckBox handles the complexity
                so you can focus on what matters.
              </p>

              <ul className="mt-8 space-y-4">
                {[
                  'Double-entry accounting keeps books balanced',
                  'Fair share billing calculated automatically',
                  'Syncs with Scoutbook rosters via browser extension',
                  'Square integration for online payments',
                  'One-click reports for committee meetings',
                ].map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-green-600" />
                    </div>
                    <span className="text-stone-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual collage - Reports, billing records, roster */}
            <div className="grid grid-cols-2 gap-4">
              {/* Reports - full width */}
              <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-md col-span-2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded bg-green-700 flex items-center justify-center">
                    <BarChart3 className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-stone-700">One-Click Reports</span>
                </div>
                <div className="rounded-lg overflow-hidden border border-stone-100 max-h-32 overflow-hidden">
                  <Image
                    src="/marketing_assets/screenshots/reports_screenshot.png"
                    alt="Financial reports showing balance summaries"
                    width={1280}
                    height={200}
                    className="w-full object-cover object-top"
                  />
                </div>
              </div>

              {/* Billing records */}
              <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-md">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded bg-green-700 flex items-center justify-center">
                    <Receipt className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-stone-700">Billing Records</span>
                </div>
                <div className="rounded-lg overflow-hidden border border-stone-100 max-h-36 overflow-hidden">
                  <Image
                    src="/marketing_assets/screenshots/billing_detailed.png"
                    alt="Recent billing records with payment status"
                    width={600}
                    height={200}
                    className="w-full object-cover object-top"
                  />
                </div>
              </div>

              {/* Roster management */}
              <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-md">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded bg-green-700 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-stone-700">Roster Sync</span>
                </div>
                <div className="rounded-lg overflow-hidden border border-stone-100 max-h-36 overflow-hidden">
                  <Image
                    src="/marketing_assets/screenshots/roster_screenshot.png"
                    alt="Scout roster with patrol, rank, and position"
                    width={600}
                    height={200}
                    className="w-full object-cover object-top"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-stone-50">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-stone-800">
            Ready to ditch the spreadsheet?
          </h2>
          <p className="mt-4 text-lg text-stone-600">
            Join the beta and see how ChuckBox can simplify your unit&apos;s finances.
          </p>
          <div className="mt-8">
            <Link
              href="/early-access"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-green-800 text-white text-lg font-semibold rounded-lg hover:bg-green-900 transition-all hover:shadow-lg hover:shadow-green-900/25 hover:-translate-y-0.5"
            >
              Request Early Access
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-stone-200 bg-[#FEFDFB]">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <Logo variant="amber" size="sm" />

            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-sm text-stone-500 hover:text-stone-700 transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-stone-500 hover:text-stone-700 transition-colors">
                Terms
              </Link>
              <Link href="/contact" className="text-sm text-stone-500 hover:text-stone-700 transition-colors">
                Contact
              </Link>
            </div>

            <p className="text-sm text-stone-400">
              &copy; {new Date().getFullYear()} ChuckBox
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
