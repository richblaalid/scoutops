'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export interface UnitInfo {
  id: string
  name: string
  unit_number: string
  unit_type: string
  unit_gender: 'boys' | 'girls' | 'coed' | null
  unit_group_id: string | null
  parent_unit_id?: string | null
  is_section?: boolean
}

export interface SectionInfo {
  id: string
  name: string
  unit_number: string
  unit_gender: 'boys' | 'girls' | null
}

export type SectionFilter = 'all' | 'boys' | 'girls'

export interface UnitMembership {
  role: string
  unit_id: string
  units: UnitInfo | null
}

export interface UnitGroup {
  id: string
  name: string
  base_unit_number: string | null
  units: UnitInfo[]
}

interface UnitContextValue {
  // Current selected unit
  currentUnit: UnitInfo | null
  currentRole: string | null

  // All accessible units
  units: UnitInfo[]
  memberships: UnitMembership[]

  // Linked unit group (if current unit is linked) - legacy support
  linkedGroup: UnitGroup | null
  linkedUnits: UnitInfo[]

  // View mode for linked units - legacy support
  combinedView: boolean
  setCombinedView: (combined: boolean) => void

  // Switch to a different unit - legacy support
  switchUnit: (unitId: string) => void

  // New sub-units model: sections
  sections: SectionInfo[]
  hasSections: boolean
  sectionFilter: SectionFilter
  setSectionFilter: (filter: SectionFilter) => void

  // Get unit IDs to query based on current filter
  getFilteredUnitIds: () => string[]
}

const UnitContext = createContext<UnitContextValue | null>(null)

export function useUnit() {
  const context = useContext(UnitContext)
  if (!context) {
    throw new Error('useUnit must be used within a UnitProvider')
  }
  return context
}

interface UnitProviderProps {
  children: ReactNode
  memberships: UnitMembership[]
  groupMemberships?: {
    role: string
    unit_groups: UnitGroup | null
  }[]
  sections?: SectionInfo[]
  initialUnitId?: string
}

export function UnitProvider({
  children,
  memberships,
  groupMemberships = [],
  sections: providedSections = [],
  initialUnitId
}: UnitProviderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Build list of all accessible units
  const allUnits: UnitInfo[] = []
  const unitIdSet = new Set<string>()

  // Add units from direct memberships
  memberships.forEach(m => {
    if (m.units && !unitIdSet.has(m.units.id)) {
      allUnits.push(m.units)
      unitIdSet.add(m.units.id)
    }
  })

  // Add units from group memberships
  groupMemberships.forEach(gm => {
    gm.unit_groups?.units?.forEach(unit => {
      if (!unitIdSet.has(unit.id)) {
        allUnits.push(unit)
        unitIdSet.add(unit.id)
      }
    })
  })

  // Determine initial unit
  const urlUnitId = searchParams.get('unit')
  const storedUnitId = typeof window !== 'undefined'
    ? localStorage.getItem('chuckbox_current_unit')
    : null

  // Validate that the stored/URL unit ID exists in our accessible units
  const validUnitId = (id: string | null) => id && allUnits.some(u => u.id === id)

  const defaultUnitId =
    (urlUnitId && validUnitId(urlUnitId) ? urlUnitId : null) ||
    (storedUnitId && validUnitId(storedUnitId) ? storedUnitId : null) ||
    (initialUnitId && validUnitId(initialUnitId) ? initialUnitId : null) ||
    allUnits[0]?.id

  const [currentUnitId, setCurrentUnitId] = useState<string | null>(defaultUnitId || null)
  const [combinedView, setCombinedView] = useState(false)

  // New: Section filter state
  const urlSection = searchParams.get('section') as SectionFilter | null
  const [sectionFilter, setSectionFilterState] = useState<SectionFilter>(
    urlSection && ['all', 'boys', 'girls'].includes(urlSection) ? urlSection : 'all'
  )

  // Find current unit and its membership
  const currentUnit = allUnits.find(u => u.id === currentUnitId) || null
  const currentMembership = memberships.find(m => m.unit_id === currentUnitId)

  // Check group memberships for role if not directly a member
  let currentRole = currentMembership?.role || null
  if (!currentRole && currentUnit?.unit_group_id) {
    const groupMembership = groupMemberships.find(
      gm => gm.unit_groups?.id === currentUnit.unit_group_id
    )
    currentRole = groupMembership?.role || null
  }

  // Find linked units if current unit is in a group (legacy support)
  const linkedGroup = currentUnit?.unit_group_id
    ? groupMemberships.find(gm => gm.unit_groups?.id === currentUnit.unit_group_id)?.unit_groups || null
    : null

  const linkedUnits = linkedGroup?.units || (currentUnit ? [currentUnit] : [])

  // New: Sections from sub-units model
  const sections = providedSections
  const hasSections = sections.length > 0

  // Persist unit selection and clean up invalid stored values
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chuckbox_current_unit')
      // Clear invalid stored unit ID
      if (stored && !allUnits.some(u => u.id === stored)) {
        localStorage.removeItem('chuckbox_current_unit')
      }
      // Save current valid unit ID
      if (currentUnitId) {
        localStorage.setItem('chuckbox_current_unit', currentUnitId)
      }
    }
  }, [currentUnitId, allUnits])

  const switchUnit = (unitId: string) => {
    setCurrentUnitId(unitId)
    // Update URL without full navigation
    const params = new URLSearchParams(searchParams.toString())
    params.set('unit', unitId)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  // New: Set section filter with URL persistence
  // Uses router.push to ensure server component re-renders with new searchParams
  const setSectionFilter = (filter: SectionFilter) => {
    setSectionFilterState(filter)
    const params = new URLSearchParams(searchParams.toString())
    if (filter === 'all') {
      params.delete('section')
    } else {
      params.set('section', filter)
    }
    // Get current pathname and navigate with new params
    const newUrl = `${window.location.pathname}?${params.toString()}`
    router.push(newUrl)
  }

  // New: Get unit IDs to query based on current filter
  const getFilteredUnitIds = (): string[] => {
    if (!currentUnit) return []

    // If no sections, just return current unit
    if (!hasSections) {
      return [currentUnit.id]
    }

    // If filter is 'all', return all section IDs
    if (sectionFilter === 'all') {
      return sections.map(s => s.id)
    }

    // Return the specific section ID
    const section = sections.find(s => s.unit_gender === sectionFilter)
    return section ? [section.id] : sections.map(s => s.id)
  }

  return (
    <UnitContext.Provider value={{
      currentUnit,
      currentRole,
      units: allUnits,
      memberships,
      linkedGroup,
      linkedUnits,
      combinedView,
      setCombinedView,
      switchUnit,
      // New section support
      sections,
      hasSections,
      sectionFilter,
      setSectionFilter,
      getFilteredUnitIds
    }}>
      {children}
    </UnitContext.Provider>
  )
}
