'use client'

export type StatusFilter = 'all' | 'active' | 'inactive'
export type BalanceFilter = 'all' | 'owes' | 'has_funds' | 'settled'

interface StatusFilterButtonsProps {
  value: StatusFilter
  onChange: (value: StatusFilter) => void
}

/**
 * A button group for filtering by active/inactive status.
 */
export function StatusFilterButtons({ value, onChange }: StatusFilterButtonsProps) {
  const options: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'inactive', label: 'Inactive' },
  ]

  return (
    <div className="inline-flex rounded-lg border border-stone-300 bg-white p-0.5">
      {options.map((option) => (
        <button
          key={option.key}
          onClick={() => onChange(option.key)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            value === option.key
              ? 'bg-forest-800 text-white'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

interface BalanceFilterButtonsProps {
  value: BalanceFilter
  onChange: (value: BalanceFilter) => void
}

/**
 * A button group for filtering by balance status (owes, has funds, settled).
 */
export function BalanceFilterButtons({ value, onChange }: BalanceFilterButtonsProps) {
  const options: { key: BalanceFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'owes', label: 'Owes' },
    { key: 'has_funds', label: 'Has Funds' },
    { key: 'settled', label: 'Settled' },
  ]

  return (
    <div className="inline-flex rounded-lg border border-stone-300 bg-white p-0.5">
      {options.map((option) => (
        <button
          key={option.key}
          onClick={() => onChange(option.key)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            value === option.key
              ? 'bg-forest-800 text-white'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
