'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

interface ScoutAccount {
  id: string
  balance: number | null
  scout_id: string
  scouts: {
    id: string
    first_name: string
    last_name: string
    patrol: string | null
    is_active: boolean | null
  } | null
}

interface AccountsListProps {
  accounts: ScoutAccount[]
  showPatrolFilter?: boolean
}

type SortColumn = 'name' | 'patrol' | 'status' | 'balance'
type SortDirection = 'asc' | 'desc'
type StatusFilter = 'all' | 'active' | 'inactive'
type BalanceFilter = 'all' | 'owes' | 'credit' | 'zero'

function SearchIcon() {
  return (
    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <svg className="ml-1 inline h-4 w-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    )
  }
  return direction === 'asc' ? (
    <svg className="ml-1 inline h-4 w-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="ml-1 inline h-4 w-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
          hasSelection
            ? 'border-blue-300 bg-blue-50 text-blue-700'
            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        {label}
        {hasSelection && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
            {selected.size}
          </span>
        )}
        <ChevronDownIcon />
      </button>

      {isOpen && (
        <div className="absolute left-0 z-10 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No options</div>
          ) : (
            <>
              {hasSelection && (
                <button
                  onClick={clearAll}
                  className="w-full px-3 py-1.5 text-left text-xs text-gray-500 hover:bg-gray-50"
                >
                  Clear all
                </button>
              )}
              {options.map((option) => (
                <button
                  key={option}
                  onClick={() => toggleOption(option)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      selected.has(option)
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-300'
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
    <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5">
      {options.map((option) => (
        <button
          key={option.key}
          onClick={() => onChange(option.key)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            value === option.key
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

interface BalanceFilterProps {
  value: BalanceFilter
  onChange: (value: BalanceFilter) => void
}

function BalanceFilterButtons({ value, onChange }: BalanceFilterProps) {
  const options: { key: BalanceFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'owes', label: 'Owes' },
    { key: 'credit', label: 'Credit' },
    { key: 'zero', label: 'Zero' },
  ]

  return (
    <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5">
      {options.map((option) => (
        <button
          key={option.key}
          onClick={() => onChange(option.key)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            value === option.key
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function AccountsList({ accounts, showPatrolFilter = true }: AccountsListProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('balance')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPatrols, setSelectedPatrols] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>('all')

  // Extract unique patrols from accounts
  const patrols = useMemo(() => {
    const uniquePatrols = new Set<string>()
    accounts.forEach((a) => {
      if (a.scouts?.patrol) uniquePatrols.add(a.scouts.patrol)
    })
    return Array.from(uniquePatrols).sort()
  }, [accounts])

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const hasActiveFilters = selectedPatrols.size > 0 || statusFilter !== 'all' || balanceFilter !== 'all'

  const clearAllFilters = () => {
    setSelectedPatrols(new Set())
    setStatusFilter('all')
    setBalanceFilter('all')
    setSearchQuery('')
  }

  const filteredAndSortedAccounts = useMemo(() => {
    // Filter by search query
    const query = searchQuery.toLowerCase().trim()
    let filtered = query
      ? accounts.filter((account) => {
          if (!account.scouts) return false
          const fullName = `${account.scouts.first_name} ${account.scouts.last_name}`.toLowerCase()
          const reverseName = `${account.scouts.last_name} ${account.scouts.first_name}`.toLowerCase()
          return (
            fullName.includes(query) ||
            reverseName.includes(query) ||
            account.scouts.first_name.toLowerCase().includes(query) ||
            account.scouts.last_name.toLowerCase().includes(query)
          )
        })
      : accounts

    // Filter by patrol
    if (selectedPatrols.size > 0) {
      filtered = filtered.filter((account) => account.scouts?.patrol && selectedPatrols.has(account.scouts.patrol))
    }

    // Filter by status
    if (statusFilter === 'active') {
      filtered = filtered.filter((account) => account.scouts?.is_active === true)
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter((account) => account.scouts?.is_active === false)
    }

    // Filter by balance
    if (balanceFilter === 'owes') {
      filtered = filtered.filter((account) => (account.balance || 0) < 0)
    } else if (balanceFilter === 'credit') {
      filtered = filtered.filter((account) => (account.balance || 0) > 0)
    } else if (balanceFilter === 'zero') {
      filtered = filtered.filter((account) => (account.balance || 0) === 0)
    }

    // Sort the filtered results
    return [...filtered].sort((a, b) => {
      let comparison = 0

      switch (sortColumn) {
        case 'name':
          const nameA = `${a.scouts?.last_name || ''} ${a.scouts?.first_name || ''}`
          const nameB = `${b.scouts?.last_name || ''} ${b.scouts?.first_name || ''}`
          comparison = nameA.localeCompare(nameB)
          break
        case 'patrol':
          comparison = (a.scouts?.patrol || '').localeCompare(b.scouts?.patrol || '')
          break
        case 'status':
          const statusA = a.scouts?.is_active ? 1 : 0
          const statusB = b.scouts?.is_active ? 1 : 0
          comparison = statusB - statusA
          break
        case 'balance':
          comparison = (a.balance || 0) - (b.balance || 0)
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [accounts, sortColumn, sortDirection, searchQuery, selectedPatrols, statusFilter, balanceFilter])

  if (accounts.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">No scout accounts yet.</p>
      </div>
    )
  }

  const headerClass = "pb-3 pr-4 cursor-pointer select-none hover:text-gray-700 transition-colors"

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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            >
              <ClearIcon />
            </button>
          )}
        </div>

        {/* Patrol Filter Dropdown */}
        {showPatrolFilter && patrols.length > 0 && (
          <MultiSelectDropdown
            label="Patrol"
            options={patrols}
            selected={selectedPatrols}
            onChange={setSelectedPatrols}
          />
        )}

        {/* Status Filter */}
        <StatusFilterButtons value={statusFilter} onChange={setStatusFilter} />

        {/* Balance Filter */}
        <BalanceFilterButtons value={balanceFilter} onChange={setBalanceFilter} />

        {/* Clear All Filters */}
        {(hasActiveFilters || searchQuery) && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Results count */}
      {(searchQuery || hasActiveFilters) && (
        <p className="text-sm text-gray-500">
          {filteredAndSortedAccounts.length === 0
            ? 'No accounts found'
            : `${filteredAndSortedAccounts.length} of ${accounts.length} account${accounts.length !== 1 ? 's' : ''}`}
        </p>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm font-medium text-gray-500">
              <th className={headerClass} onClick={() => handleSort('name')}>
                Scout
                <SortIcon direction={sortDirection} active={sortColumn === 'name'} />
              </th>
              <th className={headerClass} onClick={() => handleSort('patrol')}>
                Patrol
                <SortIcon direction={sortDirection} active={sortColumn === 'patrol'} />
              </th>
              <th className={headerClass} onClick={() => handleSort('status')}>
                Status
                <SortIcon direction={sortDirection} active={sortColumn === 'status'} />
              </th>
              <th className={`${headerClass} text-right`} onClick={() => handleSort('balance')}>
                Balance
                <SortIcon direction={sortDirection} active={sortColumn === 'balance'} />
              </th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedAccounts.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  No accounts match your filters
                </td>
              </tr>
            ) : (
              filteredAndSortedAccounts.map((account) => {
                const balance = account.balance || 0
                return (
                  <tr key={account.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-gray-900">
                        {account.scouts?.first_name} {account.scouts?.last_name}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">
                      {account.scouts?.patrol || '—'}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          account.scouts?.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {account.scouts?.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <span
                        className={`font-medium ${
                          balance < 0
                            ? 'text-red-600'
                            : balance > 0
                              ? 'text-green-600'
                              : 'text-gray-600'
                        }`}
                      >
                        {formatCurrency(balance)}
                      </span>
                    </td>
                    <td className="py-3">
                      <Link
                        href={`/accounts/${account.id}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
