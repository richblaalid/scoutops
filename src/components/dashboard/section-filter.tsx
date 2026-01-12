'use client'

import { useUnit, SectionFilter as SectionFilterType } from '@/components/providers/unit-context'
import { cn } from '@/lib/utils'

export function SectionFilter() {
  const {
    hasSections,
    sections,
    sectionFilter,
    setSectionFilter,
    currentUnit
  } = useUnit()

  // Don't show if no sections
  if (!hasSections) {
    return null
  }

  const boysSection = sections.find(s => s.unit_gender === 'boys')
  const girlsSection = sections.find(s => s.unit_gender === 'girls')

  const filters: { value: SectionFilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    ...(boysSection ? [{ value: 'boys' as const, label: `Boys ${boysSection.unit_number}` }] : []),
    ...(girlsSection ? [{ value: 'girls' as const, label: `Girls ${girlsSection.unit_number}` }] : []),
  ]

  return (
    <div className="flex items-center gap-1 rounded-lg bg-stone-100 p-1">
      {filters.map(filter => (
        <button
          key={filter.value}
          onClick={() => setSectionFilter(filter.value)}
          className={cn(
            'px-3 py-1 text-sm font-medium rounded-md transition-colors',
            sectionFilter === filter.value
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}
