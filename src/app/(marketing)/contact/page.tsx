'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
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

        <div className="flex min-h-screen flex-col items-center justify-center px-4 pt-16">
          <div className="max-w-md w-full text-center">
            <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-lg">
              <div className="text-4xl mb-3">✉️</div>
              <h1 className="text-xl font-bold text-green-800 mb-2">Message Sent!</h1>
              <p className="text-stone-600 mb-6">
                Thanks for reaching out. We&apos;ll get back to you as soon as possible.
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

      <div className="max-w-xl mx-auto px-4 pt-24 pb-10">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-green-800 mb-2">Contact Us</h1>
          <p className="text-stone-600">
            Have a question or feedback? We&apos;d love to hear from you.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-stone-200 p-6 sm:p-8 shadow-lg">
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
            className="mt-6 w-full rounded-lg bg-green-800 px-6 py-3 text-base font-semibold text-white shadow-sm transition-all hover:bg-green-900 hover:shadow-lg hover:shadow-green-900/25 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            {status === 'submitting' ? 'Sending...' : 'Send Message'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-10 flex items-center justify-center gap-5">
          <Link href="/privacy" className="text-xs text-stone-500 hover:text-stone-700 transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="text-xs text-stone-500 hover:text-stone-700 transition-colors">
            Terms
          </Link>
          <Link href="/contact" className="text-xs text-stone-500 hover:text-stone-700 transition-colors font-medium">
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
