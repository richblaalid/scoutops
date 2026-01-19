import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/ui/logo'

export const metadata = {
  title: 'Privacy Policy - Chuckbox',
  description: 'Privacy policy for Chuckbox and the Chuckbox Sync browser extension.',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#FEFCF8]">
      {/* Top nav bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FEFCF8]/80 backdrop-blur-md border-b border-stone-200/60">
        <div className="mx-auto max-w-6xl px-6 h-20 flex items-center justify-between">
          <Logo variant="full" size="lg" />
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-lg font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to home
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 pt-32 pb-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-800 mb-2">Privacy Policy</h1>
          <p className="text-stone-500 text-sm">Last updated: January 18, 2025</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl border border-stone-200 p-6 sm:p-8 shadow-lg prose prose-stone max-w-none">
          <p className="lead text-stone-600">
            This privacy policy describes how Chuckbox (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects,
            uses, and protects your information when you use our web application and browser extension.
          </p>

          <h2 className="text-xl font-semibold text-forest-800 mt-8 mb-4">Information We Collect</h2>

          <h3 className="text-lg font-medium text-forest-700 mt-6 mb-3">Account Information</h3>
          <p className="text-stone-600 mb-4">
            When you create an account, we collect your email address and name. This information is used
            to identify you and provide access to your unit&apos;s financial data.
          </p>

          <h3 className="text-lg font-medium text-forest-700 mt-6 mb-3">Scout Unit Data</h3>
          <p className="text-stone-600 mb-4">
            We store information about your Scout unit, including:
          </p>
          <ul className="list-disc list-inside text-stone-600 mb-4 space-y-1">
            <li>Scout and adult member names</li>
            <li>BSA member IDs</li>
            <li>Patrol assignments and leadership positions</li>
            <li>Financial transactions and account balances</li>
            <li>Billing records and payment history</li>
          </ul>

          <h3 className="text-lg font-medium text-forest-700 mt-6 mb-3">Browser Extension Data</h3>
          <p className="text-stone-600 mb-4">
            The Chuckbox Sync browser extension collects roster information from Scoutbook
            (advancements.scouting.org) when you initiate a sync. This includes member names,
            BSA IDs, positions, and patrol assignments. This data is:
          </p>
          <ul className="list-disc list-inside text-stone-600 mb-4 space-y-1">
            <li>Only collected when you click the &quot;Sync Roster&quot; button</li>
            <li>Transmitted securely to Chuckbox servers</li>
            <li>Used solely to update your unit&apos;s roster in Chuckbox</li>
            <li>Not shared with any third parties</li>
          </ul>
          <p className="text-stone-600 mb-4">
            The extension stores only an authentication token locally in your browser to maintain
            your connection to Chuckbox. No roster data is stored in the extension.
          </p>

          <h2 className="text-xl font-semibold text-forest-800 mt-8 mb-4">How We Use Your Information</h2>
          <p className="text-stone-600 mb-4">
            We use the information we collect to:
          </p>
          <ul className="list-disc list-inside text-stone-600 mb-4 space-y-1">
            <li>Provide and maintain our services</li>
            <li>Manage scout accounts and financial records</li>
            <li>Generate billing statements and reports</li>
            <li>Send important notifications about your account</li>
            <li>Improve our services based on usage patterns</li>
          </ul>

          <h2 className="text-xl font-semibold text-forest-800 mt-8 mb-4">Data Security</h2>
          <p className="text-stone-600 mb-4">
            We take data security seriously. All data is:
          </p>
          <ul className="list-disc list-inside text-stone-600 mb-4 space-y-1">
            <li>Transmitted using TLS/SSL encryption</li>
            <li>Stored in secure, access-controlled databases</li>
            <li>Accessible only to authorized unit administrators</li>
            <li>Protected by row-level security policies</li>
          </ul>

          <h2 className="text-xl font-semibold text-forest-800 mt-8 mb-4">Data Sharing</h2>
          <p className="text-stone-600 mb-4">
            We do not sell, trade, or rent your personal information to third parties.
            We may share data only in the following circumstances:
          </p>
          <ul className="list-disc list-inside text-stone-600 mb-4 space-y-1">
            <li>With your consent</li>
            <li>To comply with legal obligations</li>
            <li>To protect our rights or the safety of users</li>
          </ul>

          <h2 className="text-xl font-semibold text-forest-800 mt-8 mb-4">Data Retention</h2>
          <p className="text-stone-600 mb-4">
            We retain your data for as long as your account is active or as needed to provide
            services. You may request deletion of your data by contacting us.
          </p>

          <h2 className="text-xl font-semibold text-forest-800 mt-8 mb-4">Your Rights</h2>
          <p className="text-stone-600 mb-4">
            You have the right to:
          </p>
          <ul className="list-disc list-inside text-stone-600 mb-4 space-y-1">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Export your data</li>
            <li>Disconnect the browser extension at any time</li>
          </ul>

          <h2 className="text-xl font-semibold text-forest-800 mt-8 mb-4">Children&apos;s Privacy</h2>
          <p className="text-stone-600 mb-4">
            Chuckbox is designed for use by Scout unit administrators and parents. While we store
            information about youth members for unit management purposes, we do not knowingly collect
            personal information directly from children under 13. All youth data is entered and
            managed by authorized adult users.
          </p>

          <h2 className="text-xl font-semibold text-forest-800 mt-8 mb-4">Changes to This Policy</h2>
          <p className="text-stone-600 mb-4">
            We may update this privacy policy from time to time. We will notify you of any changes
            by posting the new policy on this page and updating the &quot;Last updated&quot; date.
          </p>

          <h2 className="text-xl font-semibold text-forest-800 mt-8 mb-4">Contact Us</h2>
          <p className="text-stone-600 mb-4">
            If you have any questions about this privacy policy or our data practices, please{' '}
            <Link href="/contact" className="text-green-700 underline hover:text-green-800">
              contact us
            </Link>.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-12 flex items-center justify-center gap-6">
          <Link href="/privacy" className="text-sm text-stone-500 hover:text-stone-700 transition-colors font-medium">
            Privacy
          </Link>
          <Link href="/terms" className="text-sm text-stone-500 hover:text-stone-700 transition-colors">
            Terms
          </Link>
          <Link href="/contact" className="text-sm text-stone-500 hover:text-stone-700 transition-colors">
            Contact
          </Link>
          <span className="text-sm text-stone-500">
            &copy; {new Date().getFullYear()} ChuckBox
          </span>
        </div>
      </div>
    </main>
  )
}
