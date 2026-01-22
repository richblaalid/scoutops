'use client'

import { useState, useMemo, useTransition } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { RankIcon } from './rank-icon'
import { ScoutSelectionDialog } from './scout-selection-dialog'
import { MultiSelectActionBar } from './multi-select-action-bar'
import { cn } from '@/lib/utils'
import { Award, ListChecks, Loader2 } from 'lucide-react'
import { bulkSignOffForScouts } from '@/app/actions/advancement'
import { useRouter } from 'next/navigation'

interface Rank {
  id: string
  code: string
  name: string
  display_order: number
  is_eagle_required: boolean | null
  description: string | null
  image_url?: string | null
}

interface Requirement {
  id: string
  requirement_number: string
  description: string
  parent_requirement_id: string | null
}

interface RequirementProgress {
  id: string
  requirement_id: string
  status: string
}

interface RankProgress {
  id: string
  rank_id: string
  status: string
  scout_rank_requirement_progress: RequirementProgress[]
}

interface Scout {
  id: string
  first_name: string
  last_name: string
  is_active: boolean | null
  scout_rank_progress: RankProgress[]
}

interface UnitRankPanelProps {
  rank: Rank
  requirements: Requirement[]
  scouts: Scout[]
  unitId: string
  versionId: string
  canEdit: boolean
  currentUserName?: string
}

/**
 * UnitRankPanel - Unit-wide view for signing off rank requirements across multiple scouts.
 * Used in the /advancement page to allow leaders to sign off requirements for selected scouts.
 */
export function UnitRankPanel({
  rank,
  requirements,
  scouts,
  unitId,
  versionId,
  canEdit,
  currentUserName = 'Leader',
}: UnitRankPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Multi-select state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [scoutSelectionOpen, setScoutSelectionOpen] = useState(false)

  // Sort requirements by number, filter to top-level only
  const sortedRequirements = useMemo(() => {
    return requirements
      .filter(r => !r.parent_requirement_id)
      .sort((a, b) => {
        const numA = parseFloat(a.requirement_number || '0')
        const numB = parseFloat(b.requirement_number || '0')
        return numA - numB
      })
  }, [requirements])

  // Get sub-requirements for each parent
  const getSubRequirements = (parentId: string) => {
    return requirements
      .filter(r => r.parent_requirement_id === parentId)
      .sort((a, b) => {
        const numA = parseFloat(a.requirement_number || '0')
        const numB = parseFloat(b.requirement_number || '0')
        return numA - numB
      })
  }

  // Build maps for scout completion status
  const { scoutsWithAllComplete, scoutCompletedRequirements } = useMemo(() => {
    const completedMap = new Map<string, Set<string>>()
    const allCompleteSet = new Set<string>()
    const selectedReqIds = selectedIds

    scouts.forEach(scout => {
      const progress = scout.scout_rank_progress.find(
        p => p.rank_id === rank.id
      )
      const completedReqs = new Set<string>()

      if (progress) {
        progress.scout_rank_requirement_progress.forEach(rp => {
          if (['completed', 'approved', 'awarded'].includes(rp.status)) {
            completedReqs.add(rp.requirement_id)
          }
        })
      }

      completedMap.set(scout.id, completedReqs)

      // Check if this scout has ALL selected requirements completed
      if (selectedReqIds.size > 0) {
        const hasAll = Array.from(selectedReqIds).every(reqId => completedReqs.has(reqId))
        if (hasAll) {
          allCompleteSet.add(scout.id)
        }
      }
    })

    return {
      scoutsWithAllComplete: allCompleteSet,
      scoutCompletedRequirements: completedMap,
    }
  }, [scouts, rank.id, selectedIds])

  // Selection handlers
  const handleSelectionChange = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    // Select all requirements (including sub-requirements)
    const allIds = new Set<string>()
    sortedRequirements.forEach(req => {
      allIds.add(req.id)
      getSubRequirements(req.id).forEach(sub => allIds.add(sub.id))
    })
    setSelectedIds(allIds)
  }

  const handleClearSelection = () => {
    setSelectedIds(new Set())
  }

  const handleCancelMultiSelect = () => {
    setIsMultiSelectMode(false)
    setSelectedIds(new Set())
  }

  const handleSignOff = () => {
    setScoutSelectionOpen(true)
  }

  const handleConfirmSignOff = async (scoutIds: string[], date: string) => {
    startTransition(async () => {
      const result = await bulkSignOffForScouts({
        type: 'rank',
        requirementIds: Array.from(selectedIds),
        scoutIds,
        unitId,
        itemId: rank.id,
        versionId,
        date,
        completedBy: currentUserName,
      })

      if (result.success) {
        setScoutSelectionOpen(false)
        setIsMultiSelectMode(false)
        setSelectedIds(new Set())
        router.refresh()
      }
    })
  }

  // Selected requirements for dialog
  const selectedRequirements = useMemo(() => {
    return requirements
      .filter(r => selectedIds.has(r.id))
      .map(r => ({
        id: r.id,
        requirementNumber: r.requirement_number,
        description: r.description,
      }))
  }, [requirements, selectedIds])

  const totalRequirements = requirements.length

  return (
    <>
      <div className="mb-4 flex items-start gap-4 rounded-lg bg-stone-50 p-4">
        <RankIcon rank={rank} size="lg" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-stone-900">{rank.name} Rank</h3>
          {rank.description && (
            <p className="mt-1 text-sm text-stone-600">{rank.description}</p>
          )}
          <p className="mt-2 text-sm text-stone-500">
            {totalRequirements} requirements
          </p>

          {/* Multi-select toggle */}
          {canEdit && (
            <div className="mt-3">
              <Button
                variant={isMultiSelectMode ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => {
                  if (isMultiSelectMode) {
                    handleCancelMultiSelect()
                  } else {
                    setIsMultiSelectMode(true)
                  }
                }}
                className={cn(
                  'h-8 gap-1.5 text-xs',
                  isMultiSelectMode && 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                )}
              >
                <ListChecks className="h-3.5 w-3.5" />
                {isMultiSelectMode ? 'Cancel Selection' : 'Select Requirements'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Requirements List */}
      {sortedRequirements.length > 0 ? (
        <div className="space-y-2">
          {sortedRequirements.map(req => {
            const subReqs = getSubRequirements(req.id)
            const isSelected = selectedIds.has(req.id)

            return (
              <div key={req.id}>
                {/* Parent requirement */}
                <div
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                    isMultiSelectMode && 'cursor-pointer',
                    isSelected
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-stone-200 bg-white hover:bg-stone-50'
                  )}
                  onClick={() => isMultiSelectMode && handleSelectionChange(req.id)}
                >
                  {isMultiSelectMode && (
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelectionChange(req.id)}
                      className="mt-0.5"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-start gap-2">
                      <span className="font-mono text-sm font-semibold text-stone-500">
                        {req.requirement_number}.
                      </span>
                      <p className="text-sm text-stone-700">{req.description}</p>
                    </div>
                  </div>
                </div>

                {/* Sub-requirements */}
                {subReqs.length > 0 && (
                  <div className="ml-6 mt-1 space-y-1">
                    {subReqs.map(sub => {
                      const isSubSelected = selectedIds.has(sub.id)
                      return (
                        <div
                          key={sub.id}
                          className={cn(
                            'flex items-start gap-3 rounded-lg border p-2.5 transition-colors',
                            isMultiSelectMode && 'cursor-pointer',
                            isSubSelected
                              ? 'border-blue-200 bg-blue-50'
                              : 'border-stone-100 bg-stone-50 hover:bg-stone-100'
                          )}
                          onClick={() => isMultiSelectMode && handleSelectionChange(sub.id)}
                        >
                          {isMultiSelectMode && (
                            <Checkbox
                              checked={isSubSelected}
                              onCheckedChange={() => handleSelectionChange(sub.id)}
                              className="mt-0.5"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-start gap-2">
                              <span className="font-mono text-xs font-semibold text-stone-400">
                                {sub.requirement_number}.
                              </span>
                              <p className="text-xs text-stone-600">{sub.description}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="py-12 text-center">
          <Award className="mx-auto h-12 w-12 text-stone-300" />
          <p className="mt-2 text-stone-500">No requirements found for this rank</p>
        </div>
      )}

      {/* Multi-select action bar */}
      <MultiSelectActionBar
        selectedCount={selectedIds.size}
        totalSelectableCount={requirements.length}
        onSelectAll={handleSelectAll}
        onClear={handleClearSelection}
        onSignOff={handleSignOff}
        onCancel={handleCancelMultiSelect}
        visible={isMultiSelectMode}
      />

      {/* Scout selection dialog */}
      <ScoutSelectionDialog
        open={scoutSelectionOpen}
        onOpenChange={setScoutSelectionOpen}
        title={rank.name}
        type="rank"
        scouts={scouts}
        selectedRequirements={selectedRequirements}
        scoutsWithAllComplete={scoutsWithAllComplete}
        scoutCompletedRequirements={scoutCompletedRequirements}
        onConfirm={handleConfirmSignOff}
        isLoading={isPending}
      />
    </>
  )
}
