'use client'

import { useState, ReactNode } from 'react'

interface PaymentsTabsProps {
  recordPaymentsContent: ReactNode
  addFundsContent: ReactNode
  squareHistoryContent: ReactNode
  showSquareTab: boolean
}

export function PaymentsTabs({
  recordPaymentsContent,
  addFundsContent,
  squareHistoryContent,
  showSquareTab,
}: PaymentsTabsProps) {
  const [activeTab, setActiveTab] = useState<'record' | 'funds' | 'square'>('record')

  const renderContent = () => {
    switch (activeTab) {
      case 'record':
        return recordPaymentsContent
      case 'funds':
        return addFundsContent
      case 'square':
        return squareHistoryContent
      default:
        return recordPaymentsContent
    }
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
            onClick={() => setActiveTab('funds')}
            className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
              activeTab === 'funds'
                ? 'border-forest-600 text-forest-600'
                : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700'
            }`}
          >
            Add Funds
          </button>
          {showSquareTab && (
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
          )}
        </nav>
      </div>

      {/* Tab Content */}
      {renderContent()}
    </div>
  )
}
