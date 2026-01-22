'use client'

import { useState, useMemo, useTransition } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { MeritBadgeIcon } from './merit-badge-icon'
import { ScoutSelectionDialog } from './scout-selection-dialog'
import { MultiSelectActionBar } from './multi-select-action-bar'
import { cn } from '@/lib/utils'
import { ArrowLeft, Award, Star, ListChecks, Loader2 } from 'lucide-react'
import { bulkSignOffForScouts } from '@/app/actions/advancement'
import { useRouter } from 'next/navigation'

interface MeritBadge {
  id: string
  code: string
  name: string
  category: string | null
  description: string | null
  is_eagle_required: boolean | null
  is_active: boolean | null
  image_url: string | null
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

interface BadgeProgress {
  id: string
  merit_badge_id: string
  status: string
  scout_merit_badge_requirement_progress: RequirementProgress[]
}

interface Scout {
  id: string
  first_name: string
  last_name: string
  is_active: boolean | null
  scout_merit_badge_progress: BadgeProgress[]
}

interface UnitMeritBadgePanelProps {
  badge: MeritBadge
  requirements: Requirement[]
  scouts: Scout[]
  unitId: string
  versionId: string
  canEdit: boolean
  isLoading?: boolean
  onBack: () => void
  currentUserName?: string
}

/**
 * UnitMeritBadgePanel - Unit-wide view for signing off merit badge requirements across multiple scouts.
 * Used in the /advancement page to allow leaders to sign off requirements for selected scouts.
 */
export function UnitMeritBadgePanel({
  badge,
  requirements,
  scouts,
  unitId,
  versionId,
  canEdit,
  isLoading = false,
  onBack,
  currentUserName = 'Leader',
}: UnitMeritBadgePanelProps) {
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
      const progress = scout.scout_merit_badge_progress.find(
        p => p.merit_badge_id === badge.id
      )
      const completedReqs = new Set<string>()

      if (progress) {
        progress.scout_merit_badge_requirement_progress.forEach(rp => {
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
  }, [scouts, badge.id, selectedIds])

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
        type: 'merit-badge',
        requirementIds: Array.from(selectedIds),
        scoutIds,
        unitId,
        itemId: badge.id,
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
    <div className="space-y-4">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="-ml-2 h-8 gap-1 text-stone-600 hover:text-stone-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Badges
      </Button>

      <Card className={cn(
        'overflow-hidden',
        badge.is_eagle_required && 'border-amber-200'
      )}>
        {/* Header */}
        <CardHeader className={cn(
          'pb-4',
          badge.is_eagle_required && 'bg-gradient-to-r from-amber-50/80 to-yellow-50/50'
        )}>
          <div className="flex items-start gap-4">
            <MeritBadgeIcon
              badge={{
                id: badge.id,
                code: badge.code,
                name: badge.name,
                category: badge.category,
                description: badge.description,
                is_eagle_required: badge.is_eagle_required,
                is_active: badge.is_active ?? true,
                image_url: badge.image_url,
              }}
              size="xl"
            />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-stone-900">{badge.name}</h2>
                {badge.is_eagle_required && (
                  <Badge className="border-0 bg-amber-100 text-amber-700">
                    <Star className="mr-1 h-3 w-3 fill-amber-500" />
                    Eagle Required
                  </Badge>
                )}
              </div>
              {badge.category && (
                <p className="mt-1 text-sm text-stone-500">{badge.category}</p>
              )}
              <p className="mt-2 text-sm text-stone-600">
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
        </CardHeader>

        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
              <span className="ml-2 text-stone-500">Loading requirements...</span>
            </div>
          ) : sortedRequirements.length > 0 ? (
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
              <p className="mt-2 text-stone-500">No requirements found for this badge</p>
            </div>
          )}
        </CardContent>
      </Card>

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
        title={badge.name}
        type="merit-badge"
        scouts={scouts}
        selectedRequirements={selectedRequirements}
        scoutsWithAllComplete={scoutsWithAllComplete}
        scoutCompletedRequirements={scoutCompletedRequirements}
        onConfirm={handleConfirmSignOff}
        isLoading={isPending}
      />
    </div>
  )
}
