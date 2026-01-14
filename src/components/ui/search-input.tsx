'use client'

function SearchIcon() {
  return (
    <svg className="h-5 w-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

function ClearIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

interface SearchInputProps {
  /** Current search value */
  value: string
  /** Callback when search value changes */
  onChange: (value: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Accessible label for the input */
  ariaLabel?: string
  /** Width class (e.g., "w-64", "w-full") */
  className?: string
}

/**
 * A search input with icon and clear button.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  ariaLabel = 'Search',
  className = 'w-64',
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <SearchIcon />
      </div>
      <input
        type="text"
        placeholder={placeholder}
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-lg border border-stone-300 bg-white py-2 pl-10 pr-10 text-sm placeholder-stone-500 focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-400 hover:text-stone-600"
          aria-label="Clear search"
        >
          <ClearIcon />
        </button>
      )}
    </div>
  )
}
