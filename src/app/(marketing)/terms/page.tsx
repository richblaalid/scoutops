import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/ui/logo'

export const metadata = {
  title: 'Terms of Service - Chuckbox',
  description: 'Terms of Service for using Chuckbox.',
}

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-[#FEFCF8]">
      {/* Top nav bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FEFCF8]/80 backdrop-blur-md border-b border-stone-200/60">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Logo variant="full" size="lg" />
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-base font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 pt-24 pb-10">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-green-800 mb-2">Terms of Service</h1>
          <p className="text-stone-500 text-sm">Last updated: January 18, 2025</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl border border-stone-200 p-6 sm:p-8 shadow-lg prose prose-stone max-w-none">
          <p className="lead text-stone-600">
            Welcome to Chuckbox. By using our service, you agree to these terms. Please read them carefully.
          </p>

          <h2 className="text-xl font-semibold text-forest-800 mt-8 mb-4">1. Acceptance of Terms</h2>
          <p className="text-stone-600 mb-4">
            By accessing or using Chuckbox (&quot;the Service&quot;), you agree to be bound by these Terms of Service
            and our <Link href="/privacy" className="text-green-700 underline hover:text-green-800">Privacy Policy</Link>.
            If you do not agree to these terms, do not use the Service.
          </p>

          <h2 className="text-xl font-semibold text-forest-800 mt-8 mb-4">2. Description of Service</h2>
          <p className="text-stone-600 mb-4">
            Chuckbox is a financial management application designed for Scout units (troops, packs, crews, and
            similar organizations). The Service provides tools for:
          </p>
          <ul className="list-disc list-inside text-stone-600 mb-4 space-y-1">
            <li>Managing scout and adult member rosters</li>
            <li>Tracking individual scout accounts and balances</li>
            <li>Creating and managing billing records</li>
            <li>Processing payments</li>
            <li>Generating financial reports</li>
          </ul>

          <h2 className="text-xl font-semibold text-forest-800 mt-8 mb-4">3. Account Registration</h2>
          <p className="text-stone-600 mb-4">
            To use Chuckbox, you must create an account. You agree to:
          </p>
          <ul className="list-disc list-inside text-stone-600 mb-4 space-y-1">
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Notify us immediately of any unauthorized access</li>
            <li>Accept responsibility for all activity under your account</li>
          </ul>

          <h2 className="text-xl font-semibold text-forest-800 mt-8 mb-4">4. Acceptable Use</h2>
          <p className="text-stone-600 mb-4">
            You agree to use Chuckbox only for lawful purposes and in accordance with these Terms. You agree not to:
          </p>
          <ul className="list-disc list-inside text-stone-600 mb-4 space-y-1">
            <li>Use the Service for any illegal or unauthorized purpose</li>
            <li>Attempt to gain unauthorized access to any part of the Service</li>
            <li>Interfere with or disrupt the Service or servers</li>
            <li>Upload malicious code or content</li>
            <li>Impersonate any person or entity</li>
            <li>Use the Service to store or transmit sensitive personal data beyond what is necessary for unit management</li>
          </ul>

          <h2 className="text-xl font-semibold text-forest-800 mt-8 mb-4">5. Data and Content</h2>
          <p className="text-stone-600 mb-4">
            You retain ownership of all data you enter into Chuckbox. By using the Service, you grant us a
            limited license to store, process, and display your data solely for the purpose of providing the Service.
          </p>
          <p className="text-stone-600 mb-4">
            You are responsible for:
          </p>
          <ul className="list-disc list-inside text-stone-600 mb-4 space-y-1">
            <li>The accuracy of data you enter</li>
            <li>Obtaining necessary consents to store member information</li>
            <li>Maintaining appropriate backups of critical data</li>
            <li>Complying with applicable data protection laws</li>
          </ul>

          <h2 className="text-xl font-semibold text-forest-800 mt-8 mb-4">6. Browser Extension</h2>
          <p className="text-stone-600 mb-4">
            The Chuckbox Sync browser extension is provided as a convenience to import roster data from Scoutbook.
            By using the extension, you agree that:
          </p>
          <ul className="list-disc list-inside text-stone-600 mb-4 space-y-1">
            <li>You have authorization to access the Scoutbook roster data you import</li>
            <li>You will use the extension only for its intended purpose</li>
            <li>We are not affiliated with or endorsed by the Boy Scouts of America or Scoutbook</li>
          </ul>

          <h2 className="text-xl font-semibold text-forest-800 mt-8 mb-4">7. Payment Processing</h2>
          <p className="text-stone-600 mb-4">
            Chuckbox integrates with third-party payment processors (such as Square). When you use payment features:
          </p>
          <ul className="list-disc list-inside text-stone-600 mb-4 space-y-1">
            <li>You agree to the payment processor&apos;s terms of service</li>
            <li>Payment processing fees are your responsibility</li>
            <li>We do not store complete payment card information</li>
            <li>We are not responsible for payment processor availability or errors</li>
          </ul>

          <h2 className="text-xl font-semibold text-forest-800 mt-8 mb-4">8. Service Availability</h2>
          <p className="text-stone-600 mb-4">
            We strive to maintain high availability but do not guarantee uninterrupted access. We may:
          </p>
          <ul className="list-disc list-inside text-stone-600 mb-4 space-y-1">
            <li>Perform maintenance with or without notice</li>
            <li>Modify or discontinue features</li>
            <li>Suspend accounts that violate these terms</li>
          </ul>

          <h2 className="text-xl font-semibold text-forest-800 mt-8 mb-4">9. Limitation of Liability</h2>
          <p className="text-stone-600 mb-4">
            To the maximum extent permitted by law, Chuckbox and its operators shall not be liable for:
          </p>
          <ul className="list-disc list-inside text-stone-600 mb-4 space-y-1">
            <li>Any indirect, incidental, special, or consequential damages</li>
            <li>Loss of data, profits, or business opportunities</li>
            <li>Errors in financial calculations or reports</li>
            <li>Actions taken based on information in the Service</li>
          </ul>
          <p className="text-stone-600 mb-4">
            The Service is provided &quot;as is&quot; without warranties of any kind, express or implied.
          </p>

          <h2 className="text-xl font-semibold text-forest-800 mt-8 mb-4">10. Indemnification</h2>
          <p className="text-stone-600 mb-4">
            You agree to indemnify and hold harmless Chuckbox, its operators, and affiliates from any claims,
            damages, or expenses arising from your use of the Service or violation of these Terms.
          </p>

          <h2 className="text-xl font-semibold text-forest-800 mt-8 mb-4">11. Termination</h2>
          <p className="text-stone-600 mb-4">
            You may stop using the Service at any time. We may suspend or terminate your access if you violate
            these Terms or for any other reason at our discretion. Upon termination:
          </p>
          <ul className="list-disc list-inside text-stone-600 mb-4 space-y-1">
            <li>Your right to use the Service ends immediately</li>
            <li>You may request export of your data within 30 days</li>
            <li>We may delete your data after a reasonable retention period</li>
          </ul>

          <h2 className="text-xl font-semibold text-forest-800 mt-8 mb-4">12. Changes to Terms</h2>
          <p className="text-stone-600 mb-4">
            We may update these Terms from time to time. We will notify you of material changes by posting
            the new Terms on this page and updating the &quot;Last updated&quot; date. Continued use of the
            Service after changes constitutes acceptance of the new Terms.
          </p>

          <h2 className="text-xl font-semibold text-forest-800 mt-8 mb-4">13. Governing Law</h2>
          <p className="text-stone-600 mb-4">
            These Terms shall be governed by and construed in accordance with the laws of the United States,
            without regard to conflict of law provisions.
          </p>

          <h2 className="text-xl font-semibold text-forest-800 mt-8 mb-4">14. Contact</h2>
          <p className="text-stone-600 mb-4">
            If you have questions about these Terms, please{' '}
            <Link href="/contact" className="text-green-700 underline hover:text-green-800">contact us</Link>.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-10 flex items-center justify-center gap-5">
          <Link href="/privacy" className="text-xs text-stone-500 hover:text-stone-700 transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="text-xs text-stone-500 hover:text-stone-700 transition-colors font-medium">
            Terms
          </Link>
          <Link href="/contact" className="text-xs text-stone-500 hover:text-stone-700 transition-colors">
            Contact
          </Link>
          <span className="text-xs text-stone-500">
            &copy; {new Date().getFullYear()} ChuckBox
          </span>
        </div>
      </div>
    </main>
  )
}
