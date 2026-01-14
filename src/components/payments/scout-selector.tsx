'use client'

import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'

interface Scout {
  id: string
  first_name: string
  last_name: string
  scout_accounts: {
    id: string
    billing_balance: number | null
  } | null
}

interface ScoutSelectorProps {
  /** List of scouts to select from */
  scouts: Scout[]
  /** Currently selected scout ID */
  selectedScoutId: string
  /** Callback when scout selection changes */
  onSelect: (scoutId: string) => void
  /** Whether the selector is disabled */
  disabled?: boolean
}

/**
 * Dropdown selector for choosing a scout, showing their current balance.
 */
export function ScoutSelector({
  scouts,
  selectedScoutId,
  onSelect,
  disabled = false,
}: ScoutSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="scout">Scout *</Label>
      <select
        id="scout"
        required
        disabled={disabled}
        className="flex h-10 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2 disabled:opacity-50"
        value={selectedScoutId}
        onChange={(e) => onSelect(e.target.value)}
      >
        <option value="">Select a scout...</option>
        {scouts.map((scout) => {
          const balance = scout.scout_accounts?.billing_balance || 0
          return (
            <option key={scout.id} value={scout.id}>
              {scout.first_name} {scout.last_name} ({balance < 0 ? `owes ${formatCurrency(Math.abs(balance))}` : 'paid up'})
            </option>
          )
        })}
      </select>
    </div>
  )
}

interface SelectedScoutDisplayProps {
  /** Scout name to display */
  scoutName: string
  /** Current balance */
  currentBalance: number
  /** Callback when "Pay Full Balance" is clicked */
  onPayFullBalance?: () => void
}

/**
 * Displays the currently selected scout with their balance and pay full button.
 */
export function SelectedScoutDisplay({
  scoutName,
  currentBalance,
  onPayFullBalance,
}: SelectedScoutDisplayProps) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-stone-50 p-3">
      <div>
        <p className="text-sm font-medium text-stone-900">{scoutName}</p>
        <p className="text-xs text-stone-500">
          Current balance:{' '}
          <span className={currentBalance < 0 ? 'text-error' : currentBalance > 0 ? 'text-success' : ''}>
            {formatCurrency(currentBalance)}
          </span>
        </p>
      </div>
      {currentBalance < 0 && onPayFullBalance && (
        <Button type="button" variant="outline" size="sm" onClick={onPayFullBalance}>
          Pay Full Balance
        </Button>
      )}
    </div>
  )
}
