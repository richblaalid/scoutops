'use client'

import { useState } from 'react'
import Link from 'next/link'
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
  { value: 'scoutbook-only', label: 'Scoutbook only' },
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
  { value: 'cash-check', label: 'Cash/Check only' },
  { value: 'none', label: 'We don\'t collect payments' },
  { value: 'other', label: 'Other' },
]

export default function EarlyAccessPage() {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    unit_type: '',
    unit_size: '',
    current_software: '',
    current_payment_platform: '',
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

  if (status === 'success') {
    return (
      <main className="min-h-screen bg-cream-300 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-xl border border-cream-400 p-8 shadow-lg">
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-forest-800 mb-2">You&apos;re on the list!</h1>
            <p className="text-stone-600 mb-6">
              Thanks for your interest in ChuckBox. We&apos;ll be in touch soon with early access details.
            </p>
            <Link
              href="/"
              className="inline-flex items-center text-forest-600 hover:text-forest-700 font-medium"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-cream-300 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <Logo variant="full" size="md" />
          </Link>
          <h1 className="text-3xl font-bold text-forest-800 mb-2">Request Early Access</h1>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="current_software" className="block text-sm font-medium text-stone-700 mb-1">
                  Unit Management Software
                </label>
                <select
                  id="current_software"
                  name="current_software"
                  value={formData.current_software}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20"
                >
                  <option value="">Select software...</option>
                  {softwareOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="current_payment_platform" className="block text-sm font-medium text-stone-700 mb-1">
                  Payment Platform
                </label>
                <select
                  id="current_payment_platform"
                  name="current_payment_platform"
                  value={formData.current_payment_platform}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20"
                >
                  <option value="">Select platform...</option>
                  {paymentOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
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
            className="w-full rounded-lg bg-tan-500 px-6 py-3 text-base font-semibold text-white shadow-sm transition-all hover:bg-tan-400 hover:shadow-tan hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-tan-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            {status === 'submitting' ? 'Submitting...' : 'Request Early Access'}
          </button>

          <p className="mt-4 text-center text-xs text-stone-500">
            We&apos;ll never share your information with third parties.
          </p>
        </form>

        {/* Back link */}
        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-forest-600 hover:text-forest-700 font-medium">
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  )
}
