'use client'

import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { SignupWizard } from '@/components/onboarding/signup-wizard'

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-cream-300 dark:bg-stone-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <Logo variant="full" size="md" />
          </Link>
          <h1 className="text-3xl font-bold text-forest-800 dark:text-forest-200 mb-2">
            Create Your Unit
          </h1>
          <p className="text-stone-600 dark:text-stone-300">
            Upload your BSA roster to get started. We&apos;ll import your scouts, adults, and patrols automatically.
          </p>
        </div>

        {/* Wizard */}
        <div className="bg-white dark:bg-stone-800 rounded-xl border border-cream-400 dark:border-stone-700 p-6 sm:p-8 shadow-lg">
          <SignupWizard />
        </div>

        {/* Footer */}
        <div className="text-center mt-8 space-y-4">
          <p className="text-stone-600 dark:text-stone-300">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-forest-600 hover:text-forest-700 dark:text-forest-400 dark:hover:text-forest-300">
              Sign in
            </Link>
          </p>
          <div className="flex justify-center gap-6 pt-4 border-t border-cream-400 dark:border-stone-700">
            <Link href="/privacy" className="text-sm text-stone-500 dark:text-stone-400 hover:text-forest-600 dark:hover:text-forest-400">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-stone-500 dark:text-stone-400 hover:text-forest-600 dark:hover:text-forest-400">
              Terms
            </Link>
            <Link href="/contact" className="text-sm text-stone-500 dark:text-stone-400 hover:text-forest-600 dark:hover:text-forest-400">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
