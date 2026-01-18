'use client'

import { ToggleButtonGroup, type ToggleOption } from './toggle-button-group'

export type StatusFilter = 'all' | 'active' | 'inactive'
export type BalanceFilter = 'all' | 'owes' | 'has_funds' | 'settled'

interface StatusFilterButtonsProps {
  value: StatusFilter
  onChange: (value: StatusFilter) => void
}

const STATUS_OPTIONS: ToggleOption<StatusFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

/**
 * A button group for filtering by active/inactive status.
 */
export function StatusFilterButtons({ value, onChange }: StatusFilterButtonsProps) {
  return (
    <ToggleButtonGroup
      options={STATUS_OPTIONS}
      value={value}
      onChange={onChange}
      aria-label="Status filter"
    />
  )
}

interface BalanceFilterButtonsProps {
  value: BalanceFilter
  onChange: (value: BalanceFilter) => void
}

const BALANCE_OPTIONS: ToggleOption<BalanceFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'owes', label: 'Owes' },
  { value: 'has_funds', label: 'Has Funds' },
  { value: 'settled', label: 'Settled' },
]

/**
 * A button group for filtering by balance status (owes, has funds, settled).
 */
export function BalanceFilterButtons({ value, onChange }: BalanceFilterButtonsProps) {
  return (
    <ToggleButtonGroup
      options={BALANCE_OPTIONS}
      value={value}
      onChange={onChange}
      aria-label="Balance filter"
    />
  )
}
