'use client'

import { useState, useRef, useEffect } from 'react'

function ChevronDownIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

export interface MultiSelectDropdownProps {
  /** Label shown on the dropdown button */
  label: string
  /** Available options to select from */
  options: string[]
  /** Currently selected options */
  selected: Set<string>
  /** Callback when selection changes */
  onChange: (selected: Set<string>) => void
}

/**
 * A multi-select dropdown component for filtering lists.
 * Shows a count badge when items are selected.
 */
export function MultiSelectDropdown({ label, options, selected, onChange }: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const dropdownId = `dropdown-${label.toLowerCase().replace(/\s+/g, '-')}`

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscapeKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [isOpen])

  const toggleOption = (option: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(option)) {
      newSelected.delete(option)
    } else {
      newSelected.add(option)
    }
    onChange(newSelected)
  }

  const clearAll = () => {
    onChange(new Set())
  }

  const hasSelection = selected.size > 0

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen ? dropdownId : undefined}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
          hasSelection
            ? 'border-forest-300 bg-forest-50 text-forest-700'
            : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
        }`}
      >
        {label}
        {hasSelection && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-forest-600 text-xs text-white">
            {selected.size}
          </span>
        )}
        <ChevronDownIcon />
      </button>

      {isOpen && (
        <div
          id={dropdownId}
          role="listbox"
          aria-multiselectable="true"
          aria-label={`${label} options`}
          className="absolute left-0 z-10 mt-1 w-48 rounded-lg border border-stone-200 bg-white py-1 shadow-lg"
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-stone-500">No options</div>
          ) : (
            <>
              {hasSelection && (
                <button
                  onClick={clearAll}
                  className="w-full px-3 py-1.5 text-left text-xs text-stone-500 hover:bg-stone-50"
                >
                  Clear all
                </button>
              )}
              {options.map((option) => (
                <button
                  key={option}
                  role="option"
                  aria-selected={selected.has(option)}
                  onClick={() => toggleOption(option)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-stone-50"
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      selected.has(option)
                        ? 'border-forest-600 bg-forest-600 text-white'
                        : 'border-stone-300'
                    }`}
                  >
                    {selected.has(option) && <CheckIcon />}
                  </span>
                  {option}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
