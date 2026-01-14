'use client'

export type SortDirection = 'asc' | 'desc'

interface SortIconProps {
  /** Current sort direction */
  direction: SortDirection
  /** Whether this column is currently sorted */
  active: boolean
}

/**
 * Sort indicator icon for table headers.
 * Shows a neutral icon when inactive, up arrow for ascending, down arrow for descending.
 */
export function SortIcon({ direction, active }: SortIconProps) {
  if (!active) {
    return (
      <svg className="ml-1 inline h-4 w-4 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    )
  }
  return direction === 'asc' ? (
    <svg className="ml-1 inline h-4 w-4 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="ml-1 inline h-4 w-4 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}
