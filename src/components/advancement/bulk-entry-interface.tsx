'use client'

import { useState, useTransition, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MeritBadgeIcon } from './merit-badge-icon'
import { bulkRecordProgress } from '@/app/actions/advancement'
import {
  ListChecks,
  Grid3X3,
  Search,
  Check,
  Loader2,
  Award,
  Star,
  Users,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  FileText,
} from 'lucide-react'

// Types
interface Rank {
  id: string
  code: string
  name: string
  display_order: number
}

interface Requirement {
  id: string
  rank_id?: string
  merit_badge_id?: string
  requirement_number: string
  sub_requirement_letter: string | null
  description: string
  display_order: number
}

interface MeritBadge {
  id: string
  code: string
  name: string
  category: string | null
  is_eagle_required: boolean | null
}

interface RankReqProgress {
  id: string
  requirement_id: string
  status: string
}

interface RankProgress {
  id: string
  rank_id: string
  status: string
  scout_rank_requirement_progress: RankReqProgress[]
}

interface BadgeReqProgress {
  id: string
  requirement_id: string
  status: string
}

interface BadgeProgress {
  id: string
  merit_badge_id: string
  status: string
  scout_merit_badge_requirement_progress: BadgeReqProgress[]
}

interface Scout {
  id: string
  first_name: string
  last_name: string
  rank: string | null
  is_active: boolean | null
  scout_rank_progress: RankProgress[]
  scout_merit_badge_progress: BadgeProgress[]
}

interface BulkEntryInterfaceProps {
  ranks: Rank[]
  rankRequirements: Requirement[]
  badges: MeritBadge[]
  badgeRequirements: Requirement[]
  scouts: Scout[]
  unitId: string
  versionId: string
}

type EntryMode = 'by-requirement' | 'matrix'
type RequirementType = 'rank' | 'merit-badge'

// Helper to group requirements by their main number
function groupRequirementsBySection(requirements: Requirement[]): Map<string, Requirement[]> {
  const groups = new Map<string, Requirement[]>()

  for (const req of requirements) {
    // Extract the main number (everything before any letter)
    const mainNumber = req.requirement_number.match(/^(\d+)/)?.[1] || req.requirement_number

    if (!groups.has(mainNumber)) {
      groups.set(mainNumber, [])
    }
    groups.get(mainNumber)!.push(req)
  }

  return groups
}

// Section names for rank requirements (BSA standard groupings)
const rankSectionNames: Record<string, Record<string, string>> = {
  scout: {
    '1': 'Scout Oath, Law & Spirit',
    '2': 'Troop Meetings',
    '3': 'Patrol Method',
    '4': 'Knots & Ropework',
    '5': 'Knife Safety',
    '6': 'Youth Protection',
    '7': 'Scoutmaster Conference',
  },
  tenderfoot: {
    '1': 'Camping & Outdoor Ethics',
    '2': 'Cooking',
    '3': 'Tools',
    '4': 'First Aid & Nature',
    '5': 'Hiking',
    '6': 'Fitness',
    '7': 'Citizenship',
    '8': 'Leadership',
    '9': 'Scout Spirit',
    '10': 'Scoutmaster Conference',
    '11': 'Board of Review',
  },
  second_class: {
    '1': 'Camping & Outdoor Ethics',
    '2': 'Cooking',
    '3': 'Tools',
    '4': 'Navigation',
    '5': 'Nature',
    '6': 'Aquatics',
    '7': 'First Aid',
    '8': 'Fitness',
    '9': 'Citizenship',
    '10': 'Leadership',
    '11': 'Scout Spirit',
    '12': 'Scoutmaster Conference',
    '13': 'Board of Review',
  },
  first_class: {
    '1': 'Camping & Outdoor Ethics',
    '2': 'Cooking',
    '3': 'Tools',
    '4': 'Navigation',
    '5': 'Nature',
    '6': 'Aquatics',
    '7': 'First Aid & Emergency',
    '8': 'Fitness',
    '9': 'Citizenship',
    '10': 'Leadership',
    '11': 'Scout Spirit',
    '12': 'Scoutmaster Conference',
    '13': 'Board of Review',
  },
  star: {
    '1': 'Active Participation',
    '2': 'Scout Spirit',
    '3': 'Merit Badges',
    '4': 'Leadership',
    '5': 'Service Project',
    '6': 'Scoutmaster Conference',
    '7': 'Board of Review',
  },
  life: {
    '1': 'Active Participation',
    '2': 'Scout Spirit',
    '3': 'Merit Badges',
    '4': 'Leadership',
    '5': 'Service Project',
    '6': 'Scoutmaster Conference',
    '7': 'Board of Review',
  },
  eagle: {
    '1': 'Active Participation',
    '2': 'Scout Spirit',
    '3': 'Merit Badges',
    '4': 'Leadership',
    '5': 'Service Project',
    '6': 'Eagle Project',
    '7': 'Scoutmaster Conference',
    '8': 'Board of Review',
  },
}

export function BulkEntryInterface({
  ranks,
  rankRequirements,
  badges,
  badgeRequirements,
  scouts,
  unitId,
  versionId,
}: BulkEntryInterfaceProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Mode and type selection
  const [mode, setMode] = useState<EntryMode>('by-requirement')
  const [requirementType, setRequirementType] = useState<RequirementType>('rank')

  // By Requirement mode state
  const [selectedRankId, setSelectedRankId] = useState<string>(ranks[0]?.id || '')
  const [selectedBadgeId, setSelectedBadgeId] = useState<string>('')
  const [selectedRequirementId, setSelectedRequirementId] = useState<string>('')
  const [selectedScoutIds, setSelectedScoutIds] = useState<Set<string>>(new Set())

  // Matrix mode state
  const [matrixSelections, setMatrixSelections] = useState<Map<string, Set<string>>>(new Map())
  const [scoutSearch, setScoutSearch] = useState('')

  // Results state
  const [submitResult, setSubmitResult] = useState<{
    success: boolean
    message: string
    count?: number
  } | null>(null)

  // Get filtered requirements based on selection
  const filteredRequirements = useMemo(() => {
    return requirementType === 'rank'
      ? rankRequirements.filter(r => r.rank_id === selectedRankId)
      : badgeRequirements.filter(r => r.merit_badge_id === selectedBadgeId)
  }, [requirementType, rankRequirements, badgeRequirements, selectedRankId, selectedBadgeId])

  // Group requirements by section
  const groupedRequirements = useMemo(() => {
    return groupRequirementsBySection(filteredRequirements)
  }, [filteredRequirements])

  // Get selected rank or badge
  const selectedRank = ranks.find(r => r.id === selectedRankId)
  const selectedBadge = badges.find(b => b.id === selectedBadgeId)
  const selectedRequirement = filteredRequirements.find(r => r.id === selectedRequirementId)

  // Auto-select first requirement when rank/badge changes
  useEffect(() => {
    if (filteredRequirements.length > 0 && !selectedRequirementId) {
      setSelectedRequirementId(filteredRequirements[0].id)
    }
  }, [filteredRequirements, selectedRequirementId])

  // Filter scouts by search
  const filteredScouts = scouts.filter(s => {
    const fullName = `${s.first_name} ${s.last_name}`.toLowerCase()
    return fullName.includes(scoutSearch.toLowerCase())
  })

  // Check if a scout has completed a requirement
  const getScoutRequirementStatus = useCallback((scout: Scout, requirementId: string, type: RequirementType): 'completed' | 'in_progress' | 'not_started' => {
    if (type === 'rank') {
      for (const progress of scout.scout_rank_progress) {
        const reqProgress = progress.scout_rank_requirement_progress.find(
          rp => rp.requirement_id === requirementId
        )
        if (reqProgress) {
          return reqProgress.status as 'completed' | 'in_progress' | 'not_started'
        }
      }
    } else {
      for (const progress of scout.scout_merit_badge_progress) {
        const reqProgress = progress.scout_merit_badge_requirement_progress.find(
          rp => rp.requirement_id === requirementId
        )
        if (reqProgress) {
          return reqProgress.status as 'completed' | 'in_progress' | 'not_started'
        }
      }
    }
    return 'not_started'
  }, [])

  // Toggle scout selection in By Requirement mode
  const toggleScoutSelection = (scoutId: string) => {
    const newSelected = new Set(selectedScoutIds)
    if (newSelected.has(scoutId)) {
      newSelected.delete(scoutId)
    } else {
      newSelected.add(scoutId)
    }
    setSelectedScoutIds(newSelected)
  }

  // Select all non-completed scouts
  const selectAllEligible = () => {
    const newSelected = new Set<string>()
    filteredScouts.forEach(scout => {
      const status = getScoutRequirementStatus(scout, selectedRequirementId, requirementType)
      if (status !== 'completed') {
        newSelected.add(scout.id)
      }
    })
    setSelectedScoutIds(newSelected)
  }

  // Matrix mode toggle
  const toggleMatrixCell = (scoutId: string, requirementId: string) => {
    const newSelections = new Map(matrixSelections)
    const scoutSelections = newSelections.get(scoutId) || new Set()

    if (scoutSelections.has(requirementId)) {
      scoutSelections.delete(requirementId)
    } else {
      scoutSelections.add(requirementId)
    }

    if (scoutSelections.size === 0) {
      newSelections.delete(scoutId)
    } else {
      newSelections.set(scoutId, scoutSelections)
    }

    setMatrixSelections(newSelections)
  }

  // Count total matrix selections
  const matrixSelectionCount = Array.from(matrixSelections.values()).reduce(
    (sum, set) => sum + set.size,
    0
  )

  // Reset selections
  const resetSelections = () => {
    setSelectedScoutIds(new Set())
    setMatrixSelections(new Map())
    setSubmitResult(null)
  }

  // Submit handler
  const handleSubmit = () => {
    setSubmitResult(null)

    startTransition(async () => {
      const entries: Array<{
        scoutId: string
        requirementId: string
        type: 'rank' | 'merit_badge'
        parentId: string
      }> = []

      if (mode === 'by-requirement') {
        if (!selectedRequirementId || selectedScoutIds.size === 0) return

        const parentId = requirementType === 'rank' ? selectedRankId : selectedBadgeId

        selectedScoutIds.forEach(scoutId => {
          entries.push({
            scoutId,
            requirementId: selectedRequirementId,
            type: requirementType === 'rank' ? 'rank' : 'merit_badge',
            parentId,
          })
        })
      } else {
        // Matrix mode
        matrixSelections.forEach((reqIds, scoutId) => {
          reqIds.forEach(reqId => {
            const parentId = requirementType === 'rank' ? selectedRankId : selectedBadgeId
            entries.push({
              scoutId,
              requirementId: reqId,
              type: requirementType === 'rank' ? 'rank' : 'merit_badge',
              parentId,
            })
          })
        })
      }

      if (entries.length === 0) return

      const result = await bulkRecordProgress({
        entries,
        unitId,
        versionId,
        completedAt: new Date().toISOString().split('T')[0],
      })

      if (result.success && result.data) {
        setSubmitResult({
          success: true,
          message: `Successfully recorded ${result.data.successCount} completions`,
          count: result.data.successCount,
        })
        resetSelections()
        router.refresh()
      } else {
        setSubmitResult({
          success: false,
          message: result.error || 'Failed to record progress',
        })
      }
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-50 to-stone-100">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-stone-900">
                Bulk Entry
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                Record requirement completions for multiple scouts
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="flex rounded-xl bg-stone-100 p-1">
              <button
                onClick={() => { setMode('by-requirement'); resetSelections(); }}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
                  mode === 'by-requirement'
                    ? 'bg-white text-forest-700 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                )}
              >
                <ListChecks className="h-4 w-4" />
                <span className="hidden sm:inline">By Requirement</span>
                <span className="sm:hidden">Requirement</span>
              </button>
              <button
                onClick={() => { setMode('matrix'); resetSelections(); }}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
                  mode === 'matrix'
                    ? 'bg-white text-forest-700 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                )}
              >
                <Grid3X3 className="h-4 w-4" />
                <span className="hidden sm:inline">Matrix View</span>
                <span className="sm:hidden">Matrix</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Type & Selection Row */}
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
          {/* Requirement Type */}
          <div className="flex-shrink-0 space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Type
            </Label>
            <div className="flex rounded-lg bg-stone-100 p-1">
              <button
                onClick={() => {
                  setRequirementType('rank')
                  setSelectedRequirementId('')
                  resetSelections()
                }}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all',
                  requirementType === 'rank'
                    ? 'bg-white text-forest-700 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                )}
              >
                <Award className="h-4 w-4" />
                Ranks
              </button>
              <button
                onClick={() => {
                  setRequirementType('merit-badge')
                  setSelectedRequirementId('')
                  resetSelections()
                }}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all',
                  requirementType === 'merit-badge'
                    ? 'bg-white text-forest-700 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                )}
              >
                <Star className="h-4 w-4" />
                Merit Badges
              </button>
            </div>
          </div>

          {/* Rank/Badge Selection */}
          <div className="min-w-[200px] flex-1 space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              {requirementType === 'rank' ? 'Select Rank' : 'Select Merit Badge'}
            </Label>
            {requirementType === 'rank' ? (
              <Select
                value={selectedRankId}
                onValueChange={(val) => {
                  setSelectedRankId(val)
                  setSelectedRequirementId('')
                  resetSelections()
                }}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Choose a rank..." />
                </SelectTrigger>
                <SelectContent>
                  {ranks.map((rank) => (
                    <SelectItem key={rank.id} value={rank.id}>
                      {rank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select
                value={selectedBadgeId}
                onValueChange={(val) => {
                  setSelectedBadgeId(val)
                  setSelectedRequirementId('')
                  resetSelections()
                }}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Choose a merit badge..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {badges.map((badge) => (
                    <SelectItem key={badge.id} value={badge.id}>
                      <div className="flex items-center gap-2">
                        {badge.name}
                        {badge.is_eagle_required && (
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Result Message */}
        {submitResult && (
          <div
            className={cn(
              'mb-6 flex items-center gap-3 rounded-xl border p-4',
              submitResult.success
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-800'
            )}
          >
            {submitResult.success ? (
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <p className="flex-1 font-medium">{submitResult.message}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSubmitResult(null)}
              className="h-8 w-8 p-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Main Content Area */}
        {mode === 'by-requirement' ? (
          <ByRequirementView
            scouts={filteredScouts}
            requirements={filteredRequirements}
            groupedRequirements={groupedRequirements}
            selectedRequirementId={selectedRequirementId}
            setSelectedRequirementId={setSelectedRequirementId}
            selectedRequirement={selectedRequirement}
            selectedScoutIds={selectedScoutIds}
            requirementType={requirementType}
            selectedRank={selectedRank}
            selectedBadge={selectedBadge}
            scoutSearch={scoutSearch}
            setScoutSearch={setScoutSearch}
            toggleScoutSelection={toggleScoutSelection}
            selectAllEligible={selectAllEligible}
            getScoutRequirementStatus={getScoutRequirementStatus}
            isPending={isPending}
            onSubmit={handleSubmit}
          />
        ) : (
          <MatrixView
            scouts={filteredScouts}
            requirements={filteredRequirements}
            groupedRequirements={groupedRequirements}
            requirementType={requirementType}
            selectedRank={selectedRank}
            selectedBadge={selectedBadge}
            scoutSearch={scoutSearch}
            setScoutSearch={setScoutSearch}
            matrixSelections={matrixSelections}
            toggleMatrixCell={toggleMatrixCell}
            getScoutRequirementStatus={getScoutRequirementStatus}
            selectionCount={matrixSelectionCount}
            isPending={isPending}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  )
}

// By Requirement View Component
interface ByRequirementViewProps {
  scouts: Scout[]
  requirements: Requirement[]
  groupedRequirements: Map<string, Requirement[]>
  selectedRequirementId: string
  setSelectedRequirementId: (id: string) => void
  selectedRequirement: Requirement | undefined
  selectedScoutIds: Set<string>
  requirementType: RequirementType
  selectedRank: Rank | undefined
  selectedBadge: MeritBadge | undefined
  scoutSearch: string
  setScoutSearch: (search: string) => void
  toggleScoutSelection: (scoutId: string) => void
  selectAllEligible: () => void
  getScoutRequirementStatus: (scout: Scout, reqId: string, type: RequirementType) => string
  isPending: boolean
  onSubmit: () => void
}

function ByRequirementView({
  scouts,
  requirements,
  groupedRequirements,
  selectedRequirementId,
  setSelectedRequirementId,
  selectedRequirement,
  selectedScoutIds,
  requirementType,
  selectedRank,
  selectedBadge,
  scoutSearch,
  setScoutSearch,
  toggleScoutSelection,
  selectAllEligible,
  getScoutRequirementStatus,
  isPending,
  onSubmit,
}: ByRequirementViewProps) {
  if (requirements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-200 bg-white/50 py-16">
        <div className="mb-4 rounded-full bg-stone-100 p-4">
          <ListChecks className="h-8 w-8 text-stone-400" />
        </div>
        <p className="text-lg font-medium text-stone-600">
          Select a {requirementType === 'rank' ? 'rank' : 'merit badge'} above
        </p>
        <p className="mt-1 text-sm text-stone-400">
          Then choose which requirement to record
        </p>
      </div>
    )
  }

  const eligibleCount = scouts.filter(
    s => getScoutRequirementStatus(s, selectedRequirementId, requirementType) !== 'completed'
  ).length

  // Get section name for display
  const getSectionName = (sectionNum: string) => {
    if (requirementType === 'rank' && selectedRank) {
      return rankSectionNames[selectedRank.code]?.[sectionNum] || `Section ${sectionNum}`
    }
    return `Requirement ${sectionNum}`
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left Column: Requirement Selector & Description */}
      <div className="space-y-4">
        {/* Header with Badge/Rank info */}
        <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
          {requirementType === 'merit-badge' && selectedBadge ? (
            <MeritBadgeIcon
              badge={{
                ...selectedBadge,
                description: null,
                is_active: true,
                image_url: null,
              }}
              size="md"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-forest-100 to-forest-200">
              <Award className="h-6 w-6 text-forest-600" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-stone-900">
              {requirementType === 'rank' ? selectedRank?.name : selectedBadge?.name}
            </h3>
            <p className="text-sm text-stone-500">
              {requirements.length} requirements
            </p>
          </div>
        </div>

        {/* Requirement Selector Grid - Grouped by Section */}
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-stone-700">
            <FileText className="h-4 w-4" />
            Select Requirement
          </div>

          <div className="space-y-4">
            {Array.from(groupedRequirements.entries()).map(([sectionNum, reqs]) => (
              <div key={sectionNum}>
                {/* Section Header */}
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
                  {getSectionName(sectionNum)}
                </div>

                {/* Requirement Numbers */}
                <div className="flex flex-wrap gap-2">
                  {reqs.map((req) => {
                    const isSelected = req.id === selectedRequirementId
                    const reqLabel = req.requirement_number + (req.sub_requirement_letter || '')

                    return (
                      <button
                        key={req.id}
                        onClick={() => setSelectedRequirementId(req.id)}
                        className={cn(
                          'flex h-10 min-w-[40px] items-center justify-center rounded-lg px-3 font-mono text-sm font-bold transition-all',
                          isSelected
                            ? 'bg-forest-600 text-white shadow-md ring-2 ring-forest-300'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200 active:scale-95'
                        )}
                      >
                        {reqLabel}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Requirement Description */}
        {selectedRequirement && (
          <div className="rounded-xl border-2 border-forest-200 bg-forest-50/50 p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Badge className="bg-forest-600 font-mono text-white hover:bg-forest-600">
                {selectedRequirement.requirement_number}
                {selectedRequirement.sub_requirement_letter || ''}
              </Badge>
              <span className="text-xs font-medium uppercase tracking-wider text-forest-700">
                Selected Requirement
              </span>
            </div>
            <p className="text-sm leading-relaxed text-stone-700">
              {selectedRequirement.description}
            </p>
          </div>
        )}
      </div>

      {/* Right Column: Scout Selection */}
      <div className="space-y-4">
        <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-stone-400" />
              <span className="font-medium text-stone-700">Select Scouts</span>
              <Badge variant="outline" className="ml-2">
                {selectedScoutIds.size} selected
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {eligibleCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllEligible}
                  className="h-8 text-xs"
                >
                  Select All ({eligibleCount})
                </Button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="border-b border-stone-100 px-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input
                placeholder="Search scouts..."
                value={scoutSearch}
                onChange={(e) => setScoutSearch(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto p-2">
            <div className="grid gap-1">
              {scouts.map((scout) => {
                const status = getScoutRequirementStatus(
                  scout,
                  selectedRequirementId,
                  requirementType
                )
                const isCompleted = status === 'completed'
                const isSelected = selectedScoutIds.has(scout.id)

                return (
                  <button
                    key={scout.id}
                    onClick={() => !isCompleted && toggleScoutSelection(scout.id)}
                    disabled={isCompleted}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all',
                      isCompleted
                        ? 'cursor-not-allowed bg-green-50 opacity-60'
                        : isSelected
                          ? 'bg-forest-50 ring-2 ring-forest-500'
                          : 'hover:bg-stone-50 active:scale-[0.99]'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all',
                        isCompleted
                          ? 'border-green-400 bg-green-400'
                          : isSelected
                            ? 'border-forest-500 bg-forest-500'
                            : 'border-stone-300 bg-white'
                      )}
                    >
                      {(isCompleted || isSelected) && (
                        <Check className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-stone-900 truncate">
                        {scout.first_name} {scout.last_name}
                      </p>
                      {isCompleted && (
                        <p className="text-xs text-green-600">Already completed</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {scouts.length === 0 && (
              <div className="py-8 text-center text-stone-500">
                No scouts found
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <Button
          size="lg"
          onClick={onSubmit}
          disabled={isPending || selectedScoutIds.size === 0}
          className="h-14 w-full rounded-xl bg-forest-600 text-lg shadow-lg hover:bg-forest-700"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Recording...
            </>
          ) : (
            <>
              <Check className="mr-2 h-5 w-5" />
              Record {selectedScoutIds.size} Completion
              {selectedScoutIds.size !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// Matrix View Component
interface MatrixViewProps {
  scouts: Scout[]
  requirements: Requirement[]
  groupedRequirements: Map<string, Requirement[]>
  requirementType: RequirementType
  selectedRank: Rank | undefined
  selectedBadge: MeritBadge | undefined
  scoutSearch: string
  setScoutSearch: (search: string) => void
  matrixSelections: Map<string, Set<string>>
  toggleMatrixCell: (scoutId: string, reqId: string) => void
  getScoutRequirementStatus: (scout: Scout, reqId: string, type: RequirementType) => string
  selectionCount: number
  isPending: boolean
  onSubmit: () => void
}

function MatrixView({
  scouts,
  requirements,
  groupedRequirements,
  requirementType,
  selectedRank,
  selectedBadge,
  scoutSearch,
  setScoutSearch,
  matrixSelections,
  toggleMatrixCell,
  getScoutRequirementStatus,
  selectionCount,
  isPending,
  onSubmit,
}: MatrixViewProps) {
  if (requirements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-200 bg-white/50 py-16">
        <div className="mb-4 rounded-full bg-stone-100 p-4">
          <Grid3X3 className="h-8 w-8 text-stone-400" />
        </div>
        <p className="text-lg font-medium text-stone-600">
          Select a {requirementType === 'rank' ? 'rank' : 'merit badge'} above
        </p>
        <p className="mt-1 text-sm text-stone-400">
          Then use the matrix to record multiple completions
        </p>
      </div>
    )
  }

  // Get section name for display
  const getSectionName = (sectionNum: string) => {
    if (requirementType === 'rank' && selectedRank) {
      return rankSectionNames[selectedRank.code]?.[sectionNum] || `Section ${sectionNum}`
    }
    return `Req ${sectionNum}`
  }

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {requirementType === 'merit-badge' && selectedBadge ? (
            <MeritBadgeIcon
              badge={{
                ...selectedBadge,
                description: null,
                is_active: true,
                image_url: null,
              }}
              size="md"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-forest-100 to-forest-200">
              <Award className="h-6 w-6 text-forest-600" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-stone-900">
              {requirementType === 'rank' ? selectedRank?.name : selectedBadge?.name}
            </h3>
            <p className="text-sm text-stone-500">
              {requirements.length} requirements
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            placeholder="Search scouts..."
            value={scoutSearch}
            onChange={(e) => setScoutSearch(e.target.value)}
            className="h-10 w-56 pl-9"
          />
        </div>
      </div>

      {/* Matrix Grid */}
      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50">
              <th className="sticky left-0 z-10 bg-stone-50 px-4 py-3 text-left text-sm font-semibold text-stone-700">
                Scout
              </th>
              {/* Group headers by section */}
              {Array.from(groupedRequirements.entries()).map(([sectionNum, reqs]) => (
                <th
                  key={sectionNum}
                  colSpan={reqs.length}
                  className="border-l border-stone-200 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-stone-500"
                >
                  {getSectionName(sectionNum)}
                </th>
              ))}
            </tr>
            <tr className="border-b border-stone-100 bg-stone-50/50">
              <th className="sticky left-0 z-10 bg-stone-50/50 px-4 py-2"></th>
              {requirements.map((req) => (
                <th
                  key={req.id}
                  className="min-w-[50px] px-1 py-2 text-center"
                  title={req.description}
                >
                  <span className="inline-block rounded bg-stone-200 px-1.5 py-0.5 font-mono text-xs font-bold text-stone-700">
                    {req.requirement_number}
                    {req.sub_requirement_letter || ''}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scouts.map((scout, idx) => (
              <tr
                key={scout.id}
                className={cn(
                  'border-b border-stone-50',
                  idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'
                )}
              >
                <td className="sticky left-0 z-10 whitespace-nowrap bg-inherit px-4 py-2 font-medium text-stone-900">
                  {scout.first_name} {scout.last_name}
                </td>
                {requirements.map((req) => {
                  const status = getScoutRequirementStatus(scout, req.id, requirementType)
                  const isCompleted = status === 'completed'
                  const isSelected = matrixSelections.get(scout.id)?.has(req.id) || false

                  return (
                    <td key={req.id} className="px-1 py-2 text-center">
                      <button
                        onClick={() => !isCompleted && toggleMatrixCell(scout.id, req.id)}
                        disabled={isCompleted}
                        className={cn(
                          'inline-flex h-9 w-9 items-center justify-center rounded-lg transition-all',
                          isCompleted
                            ? 'cursor-not-allowed bg-green-100'
                            : isSelected
                              ? 'bg-forest-500 shadow-md'
                              : 'bg-stone-100 hover:bg-stone-200 active:scale-95'
                        )}
                      >
                        {isCompleted ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : isSelected ? (
                          <Check className="h-4 w-4 text-white" />
                        ) : null}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {scouts.length === 0 && (
          <div className="py-8 text-center text-stone-500">
            No scouts found
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="sticky bottom-4 flex justify-end">
        <Button
          size="lg"
          onClick={onSubmit}
          disabled={isPending || selectionCount === 0}
          className="h-14 rounded-xl bg-forest-600 px-8 text-lg shadow-lg hover:bg-forest-700"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Recording...
            </>
          ) : (
            <>
              <Check className="mr-2 h-5 w-5" />
              Record {selectionCount} Completion
              {selectionCount !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
