import Link from 'next/link'
import { Logo } from '@/components/ui/logo'

export const metadata = {
  title: 'Privacy Policy - Chuckbox',
  description: 'Privacy policy for Chuckbox and the Chuckbox Sync browser extension.',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-cream-300 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <Logo variant="full" size="md" />
          </Link>
          <h1 className="text-3xl font-bold text-forest-800 mb-2">Privacy Policy</h1>
          <p className="text-stone-500 text-sm">Last updated: January 18, 2025</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl border border-cream-400 p-6 sm:p-8 shadow-lg prose prose-stone max-w-none">
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
            If you have any questions about this privacy policy or our data practices, please
            contact us at:
          </p>
          <p className="text-stone-600">
            <strong>Email:</strong>{' '}
            <a href="mailto:privacy@chuckbox.app" className="text-forest-600 hover:text-forest-700">
              privacy@chuckbox.app
            </a>
          </p>
        </div>

        {/* Back link */}
        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-forest-600 hover:text-forest-700 font-medium">
            &larr; Back to home
          </Link>
        </div>
      </div>
    </main>
  )
}
