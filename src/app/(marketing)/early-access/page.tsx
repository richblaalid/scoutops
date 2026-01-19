'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/ui/logo'

const unitTypes = [
  { value: 'troop', label: 'Scouts BSA Troop' },
  { value: 'pack', label: 'Cub Scout Pack' },
  { value: 'crew', label: 'Venturing Crew' },
  { value: 'ship', label: 'Sea Scout Ship' },
  { value: 'post', label: 'Explorer Post' },
  { value: 'other', label: 'Other' },
]

const unitSizes = [
  { value: '1-20', label: '1-20 youth' },
  { value: '21-50', label: '21-50 youth' },
  { value: '51-100', label: '51-100 youth' },
  { value: '100+', label: '100+ youth' },
]

const softwareOptions = [
  { value: 'scoutbook', label: 'Scoutbook' },
  { value: 'trooptrack', label: 'TroopTrack' },
  { value: 'troopwebhost', label: 'TroopWebHost' },
  { value: 'scouttrax', label: 'ScoutTrax' },
  { value: 'spreadsheets', label: 'Spreadsheets (Excel/Google Sheets)' },
  { value: 'quickbooks', label: 'QuickBooks' },
  { value: 'none', label: 'None / Paper-based' },
  { value: 'other', label: 'Other' },
]

const paymentOptions = [
  { value: 'square', label: 'Square' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'cash-check', label: 'Cash/Check' },
  { value: 'none', label: 'We don\'t collect payments' },
  { value: 'other', label: 'Other' },
]

export default function EarlyAccessPage() {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    unit_type: '',
    unit_size: '',
    current_software: [] as string[],
    current_payment_platform: [] as string[],
    biggest_pain_point: '',
    additional_info: '',
  })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    setErrorMessage('')

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit')
      }

      setStatus('success')
    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleMultiSelectChange = (field: 'current_software' | 'current_payment_platform', value: string) => {
    setFormData(prev => {
      const currentValues = prev[field]
      if (currentValues.includes(value)) {
        return { ...prev, [field]: currentValues.filter(v => v !== value) }
      } else {
        return { ...prev, [field]: [...currentValues, value] }
      }
    })
  }

  if (status === 'success') {
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

        <div className="flex min-h-screen flex-col items-center justify-center px-4 pt-20">
          <div className="max-w-md w-full text-center">
            <div className="bg-white rounded-xl border border-stone-200 p-8 shadow-lg">
              <div className="text-5xl mb-4">🎉</div>
              <h1 className="text-2xl font-bold text-green-800 mb-2">You&apos;re on the list!</h1>
              <p className="text-stone-600 mb-6">
                Thanks for your interest in ChuckBox. We&apos;ll be in touch soon with early access details.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-green-800 hover:text-green-900 font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

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

      <div className="max-w-2xl mx-auto px-4 pt-32 pb-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-800 mb-2">Request Early Access</h1>
          <p className="text-stone-600">
            Help us build the perfect tool for your unit. Share a bit about your needs and
            we&apos;ll reach out when we&apos;re ready for you.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-cream-400 p-6 sm:p-8 shadow-lg">
          {/* Contact Info */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-forest-800 mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">
                  Email <span className="text-tan-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20"
                  placeholder="Your name"
                />
              </div>
            </div>
          </div>

          {/* Unit Info */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-forest-800 mb-4">About Your Unit</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="unit_type" className="block text-sm font-medium text-stone-700 mb-1">
                  Unit Type
                </label>
                <select
                  id="unit_type"
                  name="unit_type"
                  value={formData.unit_type}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20"
                >
                  <option value="">Select unit type...</option>
                  {unitTypes.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="unit_size" className="block text-sm font-medium text-stone-700 mb-1">
                  Unit Size
                </label>
                <select
                  id="unit_size"
                  name="unit_size"
                  value={formData.unit_size}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20"
                >
                  <option value="">Select size...</option>
                  {unitSizes.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Current Tools */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-forest-800 mb-4">Current Tools</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Unit Management Software <span className="text-stone-400 font-normal">(select all that apply)</span>
                </label>
                <div className="space-y-2">
                  {softwareOptions.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={formData.current_software.includes(opt.value)}
                        onChange={() => handleMultiSelectChange('current_software', opt.value)}
                        className="h-4 w-4 rounded border-stone-300 text-forest-600 focus:ring-forest-600/20"
                      />
                      <span className="text-sm text-stone-700 group-hover:text-stone-900">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Payment Methods <span className="text-stone-400 font-normal">(select all that apply)</span>
                </label>
                <div className="space-y-2">
                  {paymentOptions.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={formData.current_payment_platform.includes(opt.value)}
                        onChange={() => handleMultiSelectChange('current_payment_platform', opt.value)}
                        className="h-4 w-4 rounded border-stone-300 text-forest-600 focus:ring-forest-600/20"
                      />
                      <span className="text-sm text-stone-700 group-hover:text-stone-900">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Pain Points */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-forest-800 mb-4">Help Us Understand Your Needs</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="biggest_pain_point" className="block text-sm font-medium text-stone-700 mb-1">
                  What&apos;s your biggest pain point with unit finances?
                </label>
                <textarea
                  id="biggest_pain_point"
                  name="biggest_pain_point"
                  value={formData.biggest_pain_point}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20"
                  placeholder="e.g., Tracking who owes what, collecting payments, generating reports..."
                />
              </div>
              <div>
                <label htmlFor="additional_info" className="block text-sm font-medium text-stone-700 mb-1">
                  Anything else you&apos;d like us to know?
                </label>
                <textarea
                  id="additional_info"
                  name="additional_info"
                  value={formData.additional_info}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20"
                  placeholder="Features you'd love to see, questions about ChuckBox..."
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {status === 'error' && (
            <div className="mb-6 rounded-lg bg-error-light p-4 text-sm text-error">
              {errorMessage}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="w-full rounded-lg bg-green-800 px-6 py-3 text-base font-semibold text-white shadow-sm transition-all hover:bg-green-900 hover:shadow-lg hover:shadow-green-900/25 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            {status === 'submitting' ? 'Submitting...' : 'Request Early Access'}
          </button>

          <p className="mt-4 text-center text-xs text-stone-500">
            We&apos;ll never share your information with third parties.
          </p>
        </form>

        {/* Footer */}
        <div className="mt-12 flex items-center justify-center gap-6">
          <Link href="/privacy" className="text-sm text-stone-500 hover:text-stone-700 transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="text-sm text-stone-500 hover:text-stone-700 transition-colors">
            Terms
          </Link>
          <Link href="/contact" className="text-sm text-stone-500 hover:text-stone-700 transition-colors">
            Contact
          </Link>
          <span className="text-sm text-stone-400">
            &copy; {new Date().getFullYear()} ChuckBox
          </span>
        </div>
      </div>
    </main>
  )
}
