'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { SignupWizard } from '@/components/onboarding/signup-wizard'

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-[#FEFCF8] dark:bg-stone-900">
      {/* Top nav bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FEFCF8]/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200/60 dark:border-stone-700/60">
        <div className="mx-auto max-w-6xl px-6 h-20 flex items-center justify-between">
          <Logo variant="full" size="lg" />
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-lg font-medium text-slate-600 dark:text-stone-400 hover:text-slate-900 dark:hover:text-stone-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to home
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 pt-32 pb-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-800 dark:text-green-500 mb-2">
            Create Your Unit
          </h1>
          <p className="text-stone-600 dark:text-stone-300">
            Upload your BSA roster to get started. We&apos;ll import your scouts, adults, and patrols automatically.
          </p>
        </div>

        {/* Wizard */}
        <div className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6 sm:p-8 shadow-lg">
          <SignupWizard />
        </div>

        {/* Footer */}
        <div className="text-center mt-8 space-y-4">
          <p className="text-stone-600 dark:text-stone-300">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-green-800 hover:text-green-900 dark:text-green-500 dark:hover:text-green-400 transition-colors">
              Sign in
            </Link>
          </p>
          <div className="mt-12 flex items-center justify-center gap-6">
            <Link href="/privacy" className="text-sm text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 transition-colors">
              Terms
            </Link>
            <Link href="/contact" className="text-sm text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 transition-colors">
              Contact
            </Link>
            <span className="text-sm text-stone-500 dark:text-stone-400">
              &copy; {new Date().getFullYear()} ChuckBox
            </span>
          </div>
        </div>
      </div>
    </main>
  )
}
