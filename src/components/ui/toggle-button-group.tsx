'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ToggleOption<T extends string> {
  value: T
  label: string
}

interface ToggleButtonGroupProps<T extends string> {
  options: ToggleOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'default'
  className?: string
  'aria-label'?: string
}

/**
 * A reusable button group for toggling between mutually exclusive options.
 *
 * @example
 * ```tsx
 * <ToggleButtonGroup
 *   options={[
 *     { value: 'all', label: 'All' },
 *     { value: 'active', label: 'Active' },
 *     { value: 'inactive', label: 'Inactive' },
 *   ]}
 *   value={filter}
 *   onChange={setFilter}
 *   aria-label="Status filter"
 * />
 * ```
 */
export function ToggleButtonGroup<T extends string>({
  options,
  value,
  onChange,
  size = 'default',
  className,
  'aria-label': ariaLabel,
}: ToggleButtonGroupProps<T>) {
  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs',
    default: 'px-3 py-1.5 text-sm',
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex rounded-lg border border-stone-300 bg-white p-0.5 dark:border-stone-600 dark:bg-stone-800',
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
            sizeStyles[size],
            value === option.value
              ? 'bg-forest-800 text-white dark:bg-forest-600'
              : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
