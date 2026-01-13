'use client'

import { useState, ReactNode } from 'react'

interface PaymentsTabsProps {
  recordPaymentsContent: ReactNode
  squareHistoryContent: ReactNode
  showSquareTab: boolean
}

export function PaymentsTabs({
  recordPaymentsContent,
  squareHistoryContent,
  showSquareTab,
}: PaymentsTabsProps) {
  const [activeTab, setActiveTab] = useState<'record' | 'square'>('record')

  // If Square tab isn't available, just render record payments content directly
  if (!showSquareTab) {
    return <>{recordPaymentsContent}</>
  }

  return (
    <div className="space-y-6">
      {/* Tab Bar */}
      <div className="border-b border-stone-200">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('record')}
            className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
              activeTab === 'record'
                ? 'border-forest-600 text-forest-600'
                : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700'
            }`}
          >
            Record Payments
          </button>
          <button
            onClick={() => setActiveTab('square')}
            className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
              activeTab === 'square'
                ? 'border-forest-600 text-forest-600'
                : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700'
            }`}
          >
            Square History
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'record' ? recordPaymentsContent : squareHistoryContent}
    </div>
  )
}
