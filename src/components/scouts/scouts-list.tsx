'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { ScoutForm } from './scout-form'

interface Scout {
  id: string
  first_name: string
  last_name: string
  patrol: string | null
  rank: string | null
  is_active: boolean | null
  date_of_birth: string | null
  bsa_member_id: string | null
  scout_accounts: { id: string; balance: number | null } | null
}

interface ScoutsListProps {
  scouts: Scout[]
  canManage: boolean
  unitId: string
}

type SortColumn = 'name' | 'patrol' | 'rank' | 'status' | 'balance'
type SortDirection = 'asc' | 'desc'
type StatusFilter = 'all' | 'active' | 'inactive'

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

function SortIcon({ direction, active }: { direction: SortDirection; active: boolean }) {
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

interface MultiSelectDropdownProps {
  label: string
  options: string[]
  selected: Set<string>
  onChange: (selected: Set<string>) => void
}

function MultiSelectDropdown({ label, options, selected, onChange }: MultiSelectDropdownProps) {
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

interface StatusFilterProps {
  value: StatusFilter
  onChange: (value: StatusFilter) => void
}

function StatusFilterButtons({ value, onChange }: StatusFilterProps) {
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

export function ScoutsList({ scouts, canManage, unitId }: ScoutsListProps) {
  const router = useRouter()
  const [editingScout, setEditingScout] = useState<Scout | null>(null)
  const [sortColumn, setSortColumn] = useState<SortColumn>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPatrols, setSelectedPatrols] = useState<Set<string>>(new Set())
  const [selectedRanks, setSelectedRanks] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Extract unique patrols and ranks from scouts
  const patrols = useMemo(() => {
    const uniquePatrols = new Set<string>()
    scouts.forEach((s) => {
      if (s.patrol) uniquePatrols.add(s.patrol)
    })
    return Array.from(uniquePatrols).sort()
  }, [scouts])

  const ranks = useMemo(() => {
    const uniqueRanks = new Set<string>()
    scouts.forEach((s) => {
      if (s.rank) uniqueRanks.add(s.rank)
    })
    return Array.from(uniqueRanks).sort()
  }, [scouts])

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const hasActiveFilters = selectedPatrols.size > 0 || selectedRanks.size > 0 || statusFilter !== 'all'

  const clearAllFilters = () => {
    setSelectedPatrols(new Set())
    setSelectedRanks(new Set())
    setStatusFilter('all')
    setSearchQuery('')
  }

  const filteredAndSortedScouts = useMemo(() => {
    // Filter by search query
    const query = searchQuery.toLowerCase().trim()
    let filtered = query
      ? scouts.filter((scout) => {
          const fullName = `${scout.first_name} ${scout.last_name}`.toLowerCase()
          const reverseName = `${scout.last_name} ${scout.first_name}`.toLowerCase()
          return (
            fullName.includes(query) ||
            reverseName.includes(query) ||
            scout.first_name.toLowerCase().includes(query) ||
            scout.last_name.toLowerCase().includes(query)
          )
        })
      : scouts

    // Filter by patrol
    if (selectedPatrols.size > 0) {
      filtered = filtered.filter((scout) => scout.patrol && selectedPatrols.has(scout.patrol))
    }

    // Filter by rank
    if (selectedRanks.size > 0) {
      filtered = filtered.filter((scout) => scout.rank && selectedRanks.has(scout.rank))
    }

    // Filter by status
    if (statusFilter === 'active') {
      filtered = filtered.filter((scout) => scout.is_active === true)
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter((scout) => scout.is_active === false)
    }

    // Sort the filtered results
    return [...filtered].sort((a, b) => {
      let comparison = 0

      switch (sortColumn) {
        case 'name':
          comparison = `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
          break
        case 'patrol':
          comparison = (a.patrol || '').localeCompare(b.patrol || '')
          break
        case 'rank':
          comparison = (a.rank || '').localeCompare(b.rank || '')
          break
        case 'status':
          comparison = (a.is_active === b.is_active) ? 0 : a.is_active ? -1 : 1
          break
        case 'balance':
          const balanceA = a.scout_accounts?.balance ?? 0
          const balanceB = b.scout_accounts?.balance ?? 0
          comparison = balanceA - balanceB
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [scouts, sortColumn, sortDirection, searchQuery, selectedPatrols, selectedRanks, statusFilter])

  if (scouts.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-stone-500">No scouts in your unit yet.</p>
        {canManage && (
          <p className="mt-2 text-sm text-stone-400">
            Click &quot;Add Scout&quot; to add your first scout.
          </p>
        )}
      </div>
    )
  }

  const headerClass = "pb-3 pr-4"
  const headerButtonClass = "inline-flex items-center gap-1 cursor-pointer select-none hover:text-stone-700 transition-colors text-left font-medium"

  const getAriaSort = (column: SortColumn): 'ascending' | 'descending' | 'none' => {
    if (sortColumn !== column) return 'none'
    return sortDirection === 'asc' ? 'ascending' : 'descending'
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative w-64">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Search by name..."
            aria-label="Search scouts by name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-lg border border-stone-300 bg-white py-2 pl-10 pr-10 text-sm placeholder-stone-500 focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-400 hover:text-stone-600"
            >
              <ClearIcon />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <MultiSelectDropdown
          label="Patrol"
          options={patrols}
          selected={selectedPatrols}
          onChange={setSelectedPatrols}
        />

        <MultiSelectDropdown
          label="Rank"
          options={ranks}
          selected={selectedRanks}
          onChange={setSelectedRanks}
        />

        {/* Status Filter */}
        <StatusFilterButtons value={statusFilter} onChange={setStatusFilter} />

        {/* Clear All Filters */}
        {(hasActiveFilters || searchQuery) && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-stone-500 hover:text-stone-700"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Results count */}
      {(searchQuery || hasActiveFilters) && (
        <p className="text-sm text-stone-500">
          {filteredAndSortedScouts.length === 0
            ? 'No scouts found'
            : `${filteredAndSortedScouts.length} of ${scouts.length} scout${scouts.length !== 1 ? 's' : ''}`}
        </p>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
        <thead>
          <tr className="border-b text-left text-sm text-stone-500">
            <th className={headerClass} aria-sort={getAriaSort('name')}>
              <button type="button" onClick={() => handleSort('name')} className={headerButtonClass}>
                Name
                <SortIcon direction={sortDirection} active={sortColumn === 'name'} />
              </button>
            </th>
            <th className={headerClass} aria-sort={getAriaSort('patrol')}>
              <button type="button" onClick={() => handleSort('patrol')} className={headerButtonClass}>
                Patrol
                <SortIcon direction={sortDirection} active={sortColumn === 'patrol'} />
              </button>
            </th>
            <th className={headerClass} aria-sort={getAriaSort('rank')}>
              <button type="button" onClick={() => handleSort('rank')} className={headerButtonClass}>
                Rank
                <SortIcon direction={sortDirection} active={sortColumn === 'rank'} />
              </button>
            </th>
            <th className={headerClass} aria-sort={getAriaSort('status')}>
              <button type="button" onClick={() => handleSort('status')} className={headerButtonClass}>
                Status
                <SortIcon direction={sortDirection} active={sortColumn === 'status'} />
              </button>
            </th>
            <th className={`${headerClass} text-right`} aria-sort={getAriaSort('balance')}>
              <button type="button" onClick={() => handleSort('balance')} className={`${headerButtonClass} justify-end w-full`}>
                Balance
                <SortIcon direction={sortDirection} active={sortColumn === 'balance'} />
              </button>
            </th>
            {canManage && <th className="pb-3 font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {filteredAndSortedScouts.length === 0 ? (
            <tr>
              <td colSpan={canManage ? 6 : 5} className="py-8 text-center text-stone-500">
                No scouts match your filters
              </td>
            </tr>
          ) : (
            filteredAndSortedScouts.map((scout) => {
            const balance = scout.scout_accounts?.balance ?? 0
            const accountId = scout.scout_accounts?.id

            return (
              <tr key={scout.id} className="border-b last:border-0">
                <td className="py-3 pr-4">
                  <div>
                    <p className="font-medium text-stone-900">
                      {scout.first_name} {scout.last_name}
                    </p>
                    {scout.bsa_member_id && (
                      <p className="text-xs text-stone-500">BSA# {scout.bsa_member_id}</p>
                    )}
                  </div>
                </td>
                <td className="py-3 pr-4 text-stone-600">{scout.patrol || '—'}</td>
                <td className="py-3 pr-4 text-stone-600">{scout.rank || '—'}</td>
                <td className="py-3 pr-4">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      scout.is_active
                        ? 'bg-success-light text-success'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {scout.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3 pr-4 text-right">
                  <span
                    className={`font-medium ${
                      balance < 0 ? 'text-error' : balance > 0 ? 'text-success' : 'text-stone-600'
                    }`}
                  >
                    {formatCurrency(balance)}
                  </span>
                </td>
                {canManage && (
                  <td className="py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/scouts/${scout.id}`}
                        className="text-sm text-forest-600 hover:text-forest-800"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => setEditingScout(scout)}
                        className="text-sm text-forest-600 hover:text-forest-800"
                      >
                        Edit
                      </button>
                      {accountId && (
                        <Link
                          href={`/accounts/${accountId}`}
                          className="text-sm text-forest-600 hover:text-forest-800"
                        >
                          Account
                        </Link>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            )
          })
          )}
        </tbody>
      </table>
      </div>

      {editingScout && (
        <ScoutForm
          unitId={unitId}
          scout={{
            id: editingScout.id,
            first_name: editingScout.first_name,
            last_name: editingScout.last_name,
            patrol: editingScout.patrol,
            rank: editingScout.rank,
            date_of_birth: editingScout.date_of_birth,
            bsa_member_id: editingScout.bsa_member_id,
            is_active: editingScout.is_active,
          }}
          onClose={() => setEditingScout(null)}
          onSuccess={() => {
            setEditingScout(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
