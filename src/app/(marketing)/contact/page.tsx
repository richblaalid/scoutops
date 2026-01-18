'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/ui/logo'

const subjectOptions = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'support', label: 'Technical Support' },
  { value: 'privacy', label: 'Privacy Question' },
  { value: 'billing', label: 'Billing Question' },
  { value: 'feedback', label: 'Feedback or Suggestion' },
  { value: 'other', label: 'Other' },
]

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    setErrorMessage('')

    try {
      const response = await fetch('/api/contact', {
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
            <div className="text-5xl mb-4">✉️</div>
            <h1 className="text-2xl font-bold text-forest-800 mb-2">Message Sent!</h1>
            <p className="text-stone-600 mb-6">
              Thanks for reaching out. We&apos;ll get back to you as soon as possible.
            </p>
            <Link
              href="/"
              className="inline-flex items-center text-forest-600 hover:text-forest-700 font-medium"
            >
              &larr; Back to home
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-cream-300 py-12 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <Logo variant="full" size="md" />
          </Link>
          <h1 className="text-3xl font-bold text-forest-800 mb-2">Contact Us</h1>
          <p className="text-stone-600">
            Have a question or feedback? We&apos;d love to hear from you.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-cream-400 p-6 sm:p-8 shadow-lg">
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-1">
                Name <span className="text-tan-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20"
                placeholder="Your name"
              />
            </div>

            {/* Email */}
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

            {/* Subject */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-stone-700 mb-1">
                Subject <span className="text-tan-500">*</span>
              </label>
              <select
                id="subject"
                name="subject"
                required
                value={formData.subject}
                onChange={handleChange}
                className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20"
              >
                <option value="">Select a subject...</option>
                {subjectOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-stone-700 mb-1">
                Message <span className="text-tan-500">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                required
                value={formData.message}
                onChange={handleChange}
                rows={5}
                className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20"
                placeholder="How can we help?"
              />
            </div>
          </div>

          {/* Error Message */}
          {status === 'error' && (
            <div className="mt-4 rounded-lg bg-error-light p-4 text-sm text-error">
              {errorMessage}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="mt-6 w-full rounded-lg bg-forest-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-all hover:bg-forest-700 focus:outline-none focus:ring-2 focus:ring-forest-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === 'submitting' ? 'Sending...' : 'Send Message'}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center mt-8 pt-6 border-t border-cream-400">
          <div className="flex justify-center gap-6 mb-4">
            <Link href="/privacy" className="text-sm text-stone-500 hover:text-forest-600">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-stone-500 hover:text-forest-600">
              Terms
            </Link>
            <Link href="/contact" className="text-sm text-stone-500 hover:text-forest-600 font-medium">
              Contact
            </Link>
          </div>
          <Link href="/" className="text-sm text-forest-600 hover:text-forest-700 font-medium">
            &larr; Back to home
          </Link>
        </div>
      </div>
    </main>
  )
}
